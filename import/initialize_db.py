# -*- coding: utf-8 -*-

# Run:
# env/bin/python import/initialize_db.py --d ngcrowd --h localhost --u ngcrowd --p ngcrowd  --s import/data/RU-MOW.shp  --tik import/data/tik.csv  --reg import/data/auto_codes.csv --config development.ini


from sqlalchemy import engine_from_config
from pyramid.paster import get_appsettings, setup_logging
from ngcrowd.models import *
from geoalchemy import WKTSpatialElement
import transaction
import datetime
import time

# Read command line arguments
# ---------------------------
import argparse

parser = argparse.ArgumentParser(add_help=False)
subparsers = parser.add_subparsers()

config_parser = subparsers.add_parser('crowd')
config_parser.add_argument('--csv', dest='csv', help='path to csv file')
config_parser.add_argument('--conf', dest='config', help='path to json data config')
config_parser.add_argument('--db_conf', dest='db_conf', help='path to sqlalchemy config')

args = parser.parse_args()

# Read SQLAlchemy config:
# ----------------------------------------

if args.db_conf:
    config_uri = args.db_conf
    setup_logging(config_uri)
    settings = get_appsettings(config_uri)
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
else:
    raise 'db_conf parameter (--db_conf) is required'


from os import path
from csv import DictReader
import json

if not path.exists(args.config):
    raise IOError('config not found!')
if not path.exists(args.csv):
    raise IOError('csv not found!')

csv = DictReader(open(args.csv), skipinitialspace=True, delimiter=';')

with open(args.config) as config_file:
    config = json.load(config_file)

with transaction.manager:
    session = DBSession()
    app = Application(
        title=config['application']['title'],
        facebook_account=config['application']['facebook'],
        twitter_hash_tags=config['application']['twitterHashTags'],
        description=config['application']['description']
    )
    session.add(app)

with transaction.manager:
    session = DBSession()
    imported_properties = []
    for prop_from_config in config['properties']:
        if prop_from_config['type'] == 'point':
            continue
        prop = EntityProperty(
            source_title=prop_from_config['field'],
            title=prop_from_config['title'],
            editable=prop_from_config['editable'] if 'editable' in prop_from_config else True,
            address_field='addressField' in prop_from_config and prop_from_config['addressField'],
            number_field='number' in prop_from_config and prop_from_config['number'],
            type=prop_from_config['type'],
            control=prop_from_config['control'] if 'control' in prop_from_config else None,
            visible_order=int(prop_from_config['order']) if 'order' in prop_from_config else None,
            table_width=prop_from_config['tableWidth']
        )
        if 'searchable' in prop_from_config and prop_from_config['searchable']:
            prop.searchable = True
        session.add(prop)
        session.flush()
        session.refresh(prop)
        imported_properties.append({
            'id': prop.id,
            'type': prop.type,
            'field': prop_from_config['field']
        })


props = session.query(EntityProperty).all()
reference_books = {}
i = 0
start_time = time.time()
for row in csv:
    with transaction.manager:
        session = DBSession()
        entity = Entity(
            point=WKTSpatialElement("POINT(%s %s)" % (row['LON'], row['LAT']), 4326)
        )
        session.add(entity)

        i += 1
        if i % 100 == 0:
            print 'object {0} added'.format(i)

        for prop in imported_properties:
            value = row[prop['field']]
            if value:
                entityPropertyValue = EntityPropertyValue(
                    entity_property_id=prop['id'],
                    entity=entity
                )
                field_type = prop['type']
                if field_type == 'int':
                    value = int(value)
                    entityPropertyValue.int = value
                elif field_type == 'float':
                    value = float(value)
                    entityPropertyValue.float = value
                elif field_type == 'text':
                    entityPropertyValue.text = value
                elif field_type == 'bool':
                    entityPropertyValue.bool = bool(value)
                elif field_type == 'reference_book':
                    if not prop['id'] in reference_books:
                        reference_books[prop['id']] = {}
                    if not value in reference_books[prop['id']]:
                        reference_book_value = ReferenceBookValue(
                            reference_book_id=prop['id'],
                            value=value
                        )
                        session.add(reference_book_value)
                        session.flush()
                        session.refresh(reference_book_value)
                        reference_books[prop['id']][value] = reference_book_value.id
                    entityPropertyValue.reference_book_id = reference_books[prop['id']][value]
                session.add(entityPropertyValue)
        session.flush()

print 'Time' + str(time.time() - start_time)

with transaction.manager:
    user = User()
    user.display_name = 'Пользователь'
    user.email = 'test@mail.com'
    user.password = User.password_hash('test', 'rte45EWRRT')
    user.registered_time = datetime.datetime.now()
    session.add(user)