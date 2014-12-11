# -*- coding: utf-8 -*-
__author__ = 'karavanjo'

from models import *
from helpers import *
from decorators import authorized
from pyramid.view import view_config
from pyramid.response import Response
from sqlalchemy import func, distinct, and_, or_
from sqlalchemy.orm import joinedload, subqueryload_all
from sqlalchemy.sql.expression import asc, desc
from geoalchemy import functions
import transaction

import json


@view_config(route_name='entities_list', request_method='GET')
def get_all(context, request):
    page_size = 50
    is_filter_applied = False
    filter = json.loads(request.GET['filter'])
    clauses = []
    if filter['uik']:
        for filter_item_id in filter['uik'].keys():
            filter_item_value = filter['uik'][filter_item_id].encode('UTF-8').strip()
            if filter_item_value:
                item_clauses = [EntityPropertyValue.entity_property_id == int(filter_item_id),
                                EntityPropertyValue.text.ilike('%' + filter_item_value + '%')]
                clauses.append(and_(*item_clauses).self_group())
                is_filter_applied = True

    bbox = json.loads(request.params.getall('bbox')[0])
    box_geom = leaflet_bbox_to_polygon(bbox)

    uiks_for_json = {'points': {
        'count': 0,
        'layers': {
            'checked': {'elements': [], 'count': 0},
            'unchecked': {'elements': [], 'count': 0},
            'blocked': {'elements': [], 'count': 0}
        }}}

    session = DBSession()

    searchable_fields = [entityProperty.id for entityProperty in
                         session.query(EntityProperty).filter(EntityProperty.searchable == True).all()]

    if is_filter_applied:
        from sqlalchemy import func
        entities_from_db = session.query(EntityPropertyValue.entity_id, func.count('*')) \
            .join(Entity, EntityPropertyValue.entity_id==Entity.id) \
            .filter(or_(*clauses)) \
            .filter(Entity.point.ST_Intersects('SRID=4326;' + box_geom)) \
            .group_by(EntityPropertyValue.entity_id) \
            .having(func.count('*') == len(clauses)) \
            .all()

        entities_from_db = session.query(Entity, Entity.point.ST_X(), Entity.point.ST_Y())\
            .filter(Entity.id.in_([ent[0] for ent in entities_from_db]))\
            .all()

        if len(entities_from_db) < page_size:
            uiks_for_json['points']['count'] = len(entities_from_db)
        else:
            uiks_for_json['points']['count'] = session.query(Entity.id) \
                .filter(*clauses) \
                .count()
    else:
        from sqlalchemy import func
        entities_from_db = session.query(Entity, Entity.point.ST_X(), Entity.point.ST_Y()) \
            .join(EntityPropertyValue.entity) \
            .distinct(Entity.id) \
            .filter(Entity.point.ST_Intersects('SRID=4326;' + box_geom)) \
            .all()
        uiks_for_json['points']['count'] = len(entities_from_db)

    for uik in entities_from_db:
        if uik[0].blocked:
            uiks_for_json['points']['layers']['blocked']['elements'].append(
                _get_uik_from_uik_db(uik, searchable_fields))
            continue
        if uik[0].approved:
            uiks_for_json['points']['layers']['checked']['elements'].append(
                _get_uik_from_uik_db(uik, searchable_fields))
            continue
        uiks_for_json['points']['layers']['unchecked']['elements'].append(_get_uik_from_uik_db(uik, searchable_fields))

    uiks_for_json['points']['layers']['blocked']['count'] = len(
        uiks_for_json['points']['layers']['blocked']['elements'])
    uiks_for_json['points']['layers']['checked']['count'] = len(
        uiks_for_json['points']['layers']['checked']['elements'])
    uiks_for_json['points']['layers']['unchecked']['count'] = len(
        uiks_for_json['points']['layers']['unchecked']['elements'])

    uiks_result = {'data': uiks_for_json}
    session.close()
    return Response(json.dumps(uiks_result), content_type='application/json')


def _get_uik_from_uik_db(uik_from_db, searchable_fields):
    return {
        'id': uik_from_db[0].id,
        'name': [val for val in uik_from_db[0].values if val.entity_property_id == searchable_fields[0]][0].text,
        'addr': [val for val in uik_from_db[0].values if val.entity_property_id == searchable_fields[1]][0].text,
        'lon': uik_from_db[1],
        'lat': uik_from_db[2]
    }


@view_config(route_name='entity', request_method='GET')
def get_entity(context, request):
    entity_id = request.matchdict.get('id', None)

    clauses = []
    if entity_id is not None:
        clauses.append(Entity.id == entity_id)

    session = DBSession()

    props = dict((entityProperty.id, {
        'id': entityProperty.id,
        'title': entityProperty.title,
        'type': entityProperty.type,
        'val': '',
        'visible_order': entityProperty.visible_order
    }) for entityProperty in session.query(EntityProperty).order_by(EntityProperty.visible_order).all())

    # uik = session.query(Entity, Entity.point.ST_X(), Entity.point.ST_Y(), User) \
    #     .options(joinedload(Entity.values), joinedload(EntityPropertyValue.reference_book)) \
    #     .outerjoin((User, Entity.user_block_id == User.id)) \
    #     .filter(*clauses).one()

    uik = session.query(Entity, Entity.point.ST_X(), Entity.point.ST_Y(), User) \
        .options(joinedload(Entity.values, EntityPropertyValue.reference_book)) \
        .outerjoin((User, Entity.user_block_id == User.id)) \
        .filter(*clauses).one()


    for value in uik[0].values:
        props_for_val = props[value.entity_property_id]

        if props_for_val['type'] == 'reference_book':
            props_for_val['val'] = value.reference_book_id
            props_for_val['text'] = value.reference_book.value
        else:
            props_for_val['val'] = getattr(value, props_for_val['type'])

    versions = session.query(EntityVersions, User.display_name, EntityVersions.time) \
        .outerjoin((User, EntityVersions.user_id == User.id)) \
        .filter(EntityVersions.entity_id == entity_id).order_by(EntityVersions.time).all()

    props_json = [props[prop_key] for prop_key in props.keys()]
    props_json.sort(key=lambda x: x['visible_order'])
    uik_res = {
        'uik': uik[0].as_json_dict(),
        'props': props_json,
        'versions': [{'display_name': version[1],
                      'time': to_russian_datetime_format(version[2])}
                     for version in versions]
    }

    uik_res['uik']['geom'] = {'lng': uik[1], 'lat': uik[2]}

    uik_res['uik']['user_blocked'] = ''
    uik_res['uik']['is_blocked'] = False
    if uik[0].blocked:
        uik_res['uik']['is_blocked'] = True
        uik_res['uik']['user_blocked'] = uik[0].user_block.display_name

    uik_res['uik']['is_unblocked'] = ''
    if 'u_id' in request.session and uik[0].blocked and \
                    request.session['u_id'] == uik[0].user_block.id:
        uik_res['uik']['is_unblocked'] = True

    session.close()
    return Response(json.dumps(uik_res), content_type='application/json')


@view_config(route_name='entity', request_method='POST')
@authorized()
def update_entity(context, request):
    entity_from_client = json.loads(request.POST['entity'])

    with transaction.manager:
        session = DBSession()
        from helpers import str_to_boolean

        if ('id' in entity_from_client) and entity_from_client['id']:
            entity = session.query(Entity).filter(Entity.id == entity_from_client['id'])\
                .options(joinedload(Entity.values))
            entity.update({
                  Entity.approved: str_to_boolean(entity_from_client['is_applied']),
                  Entity.blocked: False,
                  Entity.user_block_id: None
            }, synchronize_session=False)
            entity = entity.one()
        else:
            entity = Entity(
                approved=str_to_boolean(entity_from_client['is_applied']),
                blocked=False,
                user_block_id=None
            )
            session.add(entity)
            session.flush()
            session.refresh(entity)


        sql = 'UPDATE entities SET point=ST_GeomFromText(:wkt, 4326) WHERE id = :entity_id'
        session.execute(sql, {
            'wkt': 'POINT(%s %s)' % (entity_from_client['geom']['lng'], entity_from_client['geom']['lat']),
            'entity_id': entity.id
        })

        entity_properties = session.query(EntityProperty)
        current_values = entity.values

        for entity_property in entity_properties:
            if next((x for x in current_values if x.entity_property_id == entity_property.id), None) is None:
                session.add(EntityPropertyValue(
                    entity_property_id=entity_property.id,
                    entity_id=entity.id
                ))

            entity_value = session.query(EntityPropertyValue)\
                .filter(and_(EntityPropertyValue.entity_id == entity.id,
                             EntityPropertyValue.entity_property_id == entity_property.id))

            if entity_property.type == 'text' or entity_property.type == 'reference_book':
                entity_value.update({
                        EntityPropertyValue.text: entity_from_client['ep_' + str(entity_property.id)]
                    }, synchronize_session=False)
            elif entity_property.type == 'int':
                entity_value.update({
                        EntityPropertyValue.int: int(entity_from_client['ep_' + str(entity_property.id)])
                    }, synchronize_session=False)

        log = EntityVersions()
        log.entity_id = entity.id
        log.user_id = request.session['u_id']
        from datetime import datetime

        log.time = datetime.now()
        log.dump = log.to_json_binary_dump(entity_from_client)
        session.add(log)

    return Response()


@view_config(route_name='obj_block', request_method='GET')
@authorized()
def obj_block(context, request):
    obj_id = request.matchdict.get('id', None)

    with transaction.manager:
        session = DBSession()
        session.query(Entity).filter(Entity.id == obj_id).update({
            Entity.blocked: True,
            Entity.user_block_id: request.session['u_id']
        })

    return Response()


@view_config(route_name='obj_unblock', request_method='GET')
@authorized()
def obj_unblock(context, request):
    obj_id = request.matchdict.get('id', None)
    if obj_id is None:
        return Response()

    with transaction.manager:
        session = DBSession()
        session.query(Entity).filter(Entity.id == obj_id).update({
            Entity.blocked: False,
            Entity.user_block_id: None
        })

    return Response()


@view_config(route_name='stat_json', request_method='POST')
def get_stat(context, request):
    user_name = None
    if hasattr(request, 'cookies') and 'sk' in request.cookies.keys() and 'sk' in request.session and \
                    request.session['sk'] == request.cookies['sk'] and 'u_name' in request.session:
        user_name = request.session['u_name']

    session = DBSession()
    entities_from_db = session.query(Entity, Entity.point.ST_X(), Entity.point.ST_Y()).options(joinedload('values'))

    # clauses = []
    # if request.POST:
    #     if exist_filter_parameter('geocoding_precision', request):
    #         clauses.append(Uik.geocoding_precision_id == request.POST['geocoding_precision'])
    #     if exist_filter_parameter('is_applied', request):
    #         clauses.append(Uik.is_applied == (request.POST['is_applied'] == 'True'))
    #     if exist_filter_parameter('number_official', request):
    #         clauses.append(Uik.number_official == request.POST['number_official'])
    #     if exist_filter_parameter('region', request):
    #         clauses.append(Uik.region_id == int(request.POST['region']))
    #     if exist_filter_parameter('place_voting', request):
    #         clauses.append(Uik.place_voting.ilike('%' + request.POST['place_voting'].encode('UTF-8').strip() + '%'))
    #     if exist_filter_parameter('tik', request):
    #         clauses.append(Uik.tik_id == int(request.POST['tik']))
    #     if exist_filter_parameter('user_id', request):
    #         user_uiks_subq = (session.query(distinct(UikVersions.uik_id).label("uik_id"))
    #                           .filter(UikVersions.user_id == int(request.POST['user_id']))) \
    #             .subquery()
    #         entities_from_db = entities_from_db.join(user_uiks_subq, and_(Uik.id == user_uiks_subq.c.uik_id))
    #
    # entities_from_db = entities_from_db.filter(*clauses)
    #
    # if 'jtSorting' in request.params:
    #     sort = request.params['jtSorting']
    #     sort = sort.split(' ')
    #     if sort[1] == 'ASC':
    #         entities_from_db = entities_from_db.order_by(asc(get_sort_param(sort[0])))
    #     if sort[1] == 'DESC':
    #         entities_from_db = entities_from_db.order_by(desc(get_sort_param(sort[0])))
    # else:
    #     entities_from_db = entities_from_db.order_by(asc(Uik.number_official))

    count = entities_from_db.count()

    entities_from_db = entities_from_db\
        .offset(request.params['jtStartIndex']) \
        .limit(request.params['jtPageSize']) \
        .all()

    records = [create_entity_stat(entity[0]) for entity in entities_from_db]
    session.close()

    return Response(json.dumps({
        'Result': 'OK',
        'Records': records,
        'TotalRecordCount': count
    }), content_type='application/json')


def exist_filter_parameter(param, request):
    return (param in request.POST) and (len(request.POST[param].encode('UTF-8').strip()) > 0)


def create_entity_stat(entity_from_db):
    entity = {
        'id': entity_from_db.id,
        'approved': entity_from_db.approved
    }
    for value in entity_from_db.values:
        entity['ep_' + str(value.entity_property_id)] = value.text
    return entity


params = {
    # 'number_official': Uik.number_official,
    # 'tik': Tik.name,
    # 'geocoding_precision': GeocodingPrecision.name_ru,
    # 'region': Region.name,
    # 'place_voting': Uik.place_voting,
    # 'is_applied': Uik.is_applied,
    # 'comment': Uik.comment
}


def get_sort_param(param):
    return params[param]


def build_filtering_query(request, query):
    if 'jtSorting' in request.params:
        return request


@view_config(route_name='statistic', request_method='GET', renderer='stat.mako')
def get_stat_page(context, request):
    session = DBSession()

    user_entities_count_sbq = session \
        .query(EntityVersions.user_id.label('user_id'), func.count(EntityVersions.entity_id.distinct()).label('count_entities')) \
        .group_by(EntityVersions.user_id) \
        .subquery()

    user_uiks_logs = session.query(User, user_entities_count_sbq.c.count_entities) \
        .outerjoin(user_entities_count_sbq, User.id == user_entities_count_sbq.c.user_id) \
        .order_by(User.display_name)

    properties = session.query(EntityProperty).order_by(EntityProperty.visible_order).all()

    session.close()

    return {
        'properties': properties,
        'users': user_uiks_logs.all()
    }