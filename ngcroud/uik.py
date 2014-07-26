# -*- coding: utf-8 -*-
__author__ = 'karavanjo'

from models import *
from helpers import *
from decorators import authorized
from pyramid.view import view_config
from pyramid.response import Response
from sqlalchemy import func, distinct
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.expression import asc, desc
from geoalchemy import functions
import transaction

import json


@view_config(route_name='uiks', request_method='GET')
def get_all(context, request):
    page_size = 50
    is_filter_applied = False
    filter = json.loads(request.GET['filter'])
    clauses = []
    if filter['uik']:
        for filter_item_id in filter['uik'].keys():
            filter_item_value = filter['uik'][filter_item_id].encode('UTF-8').strip()
            if filter_item_value:
                clauses.append(EntityPropertyValue.entity_property_id == int(filter_item_id))
                clauses.append(EntityPropertyValue.text == filter_item_value)

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
        contains = functions.gcontains(box_geom, Uik.point).label('contains')

        uiks_from_db = session.query(EntityPropertyValue) \
            .join(EntityPropertyValue.entity) \
            .join(EntityPropertyValue.entity_property) \
            .filter(*clauses) \
            .order_by(contains.desc()) \
            .limit(page_size) \
            .all()

        if len(uiks_from_db) < page_size:
            uiks_for_json['points']['count'] = len(uiks_from_db)
        else:
            uiks_for_json['points']['count'] = session.query(Uik.id) \
                .filter(*clauses) \
                .count()
    else:
        uiks_from_db = session.query(Entity, Entity.point.x, Entity.point.y) \
            .options(joinedload('values')) \
            .filter(Entity.point.within(box_geom)) \
            .all()
        uiks_for_json['points']['count'] = len(uiks_from_db)

    for uik in uiks_from_db:
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


@view_config(route_name='uik', request_method='GET')
def get_uik(context, request):
    id = request.matchdict.get('id', None)
    region_id = request.matchdict.get('region_id', None)
    uik_official_number = request.matchdict.get('official_number', None)

    clauses = []
    if id is not None:
        clauses.append(Entity.id == id)
    # elif (region_id is not None) and (uik_official_number is not None):
    #     clauses.append(Uik.number_official == uik_official_number)
    #     clauses.append(Uik.region_id == int(region_id))

    session = DBSession()

    props = dict((entityProperty.id, {
        'id': entityProperty.id,
        'title': entityProperty.title,
        'type': entityProperty.type,
        'val': '',
        'visible_order': entityProperty.visible_order
    }) for entityProperty in session.query(EntityProperty).order_by(EntityProperty.visible_order).all())

    uik = session.query(Entity, Entity.point.x, Entity.point.y, User) \
        .options(joinedload(Entity.values)) \
        .outerjoin((User, Entity.user_block_id == User.id)) \
        .filter(*clauses).one()

    for value in uik[0].values:
        props_for_val = props[value.entity_property_id]

        # todo change when reference_book type will be supported
        if props_for_val['type'] == 'reference_book':
            props_for_val['type'] = 'text'

        props_for_val['val'] = getattr(value, props_for_val['type'])

    versions = session.query(EntityVersions, User.display_name, EntityVersions.time) \
        .outerjoin((User, EntityVersions.user_id == User.id)) \
        .filter(EntityVersions.uik_id == id).order_by(EntityVersions.time).all()

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


@view_config(route_name='uik_by_off_number', request_method='GET')
def get_uik_by_off_number(context, request):
    return get_uik(context, request)


@view_config(route_name='uik', request_method='POST')
@authorized()
def update_uik(context, request):
    uik = json.loads(request.POST['uik'])

    with transaction.manager:
        session = DBSession()
        from helpers import str_to_boolean

        session.query(Uik).filter(Uik.id == uik['id']).update({
                                                                  Uik.address_voting: uik['address_voting'],
                                                                  Uik.place_voting: uik['place_voting'],
                                                                  Uik.is_applied: str_to_boolean(uik['is_applied']),
                                                                  Uik.comment: uik['comment'],
                                                                  Uik.geocoding_precision_id: uik['geo_precision'],
                                                                  Uik.is_blocked: False,
                                                                  Uik.user_block_id: None
                                                              }, synchronize_session=False)
        sql = 'UPDATE uiks SET point=ST_GeomFromText(:wkt, 4326) WHERE id = :uik_id'
        session.execute(sql, {
            'wkt': 'POINT(%s %s)' % (uik['geom']['lng'], uik['geom']['lat']),
            'uik_id': uik['id']
        })

        log = UikVersions()
        log.uik_id = uik['id']
        log.user_id = request.session['u_id']
        from datetime import datetime

        log.time = datetime.now()
        log.dump = log.to_json_binary_dump(uik)
        session.add(log)

    return Response()


@view_config(route_name='uik_block', request_method='GET')
@authorized()
def uik_block(context, request):
    uik_id = request.matchdict.get('id', None)

    with transaction.manager:
        session = DBSession()
        session.query(Uik).filter(Uik.id == uik_id).update({
            Uik.is_blocked: True,
            Uik.user_block_id: request.session['u_id']
        })

    return Response()


@view_config(route_name='uik_unblock', request_method='GET')
@authorized()
def uik_unblock(context, request):
    uik_id = request.matchdict.get('id', None)

    with transaction.manager:
        session = DBSession()
        session.query(Uik).filter(Uik.id == uik_id).update({
            Uik.is_blocked: False,
            Uik.user_block_id: None
        })

    return Response()


@view_config(route_name='uikp_all', request_method='GET')
def get_president_uiks(context, request):
    page_size = 100
    is_filter_applied = False
    filter = json.loads(request.GET['filter'])
    clauses = []
    if 'filter' in request.GET:
        filter['uik_2012']['address'] = filter['uik_2012']['address'].encode('UTF-8').strip()
        filter['uik_2012']['number'] = filter['uik_2012']['number'].encode('UTF-8').strip()
        if filter['uik_2012']['address'] or filter['uik_2012']['number']:
            is_filter_applied = True
            if filter['uik_2012']['address'].__len__() > 3:
                address = '%' + filter['uik_2012']['address'] + '%'
                clauses.append(VotingStation.address.ilike(address))
            if filter['uik_2012']['number']:
                number = filter['uik']['number']
                clauses.append(VotingStation.name == number)

    bbox = json.loads(request.params.getall('bbox')[0])
    box_geom = leaflet_bbox_to_polygon(bbox)

    uiks_for_json = {'points': {
        'count': 0,
        'layers': {
            'uik_2012': {'elements': [], 'count': 0}
        }}}

    session = DBSession()
    if is_filter_applied:
        contains = functions.gcontains(box_geom, Location.point).label('contains')
        uiks_from_db = session.query(VotingStation, Location.point.x, Location.point.y) \
            .join(VotingStation.location) \
            .filter(*clauses) \
            .order_by(contains.desc()) \
            .limit(page_size) \
            .all()
        if len(uiks_from_db) < page_size:
            uiks_for_json['points']['count'] = len(uiks_from_db)
        else:
            uiks_for_json['points']['count'] = session.query(VotingStation.id) \
                .filter(*clauses) \
                .count()
    else:
        uiks_from_db = session.query(VotingStation, Location.point.x, Location.point.y) \
            .join(VotingStation.location) \
            .filter(Location.point.within(box_geom)) \
            .all()
        uiks_for_json['points']['count'] = len(uiks_from_db)

    for uik in uiks_from_db:
        uiks_for_json['points']['layers']['uik_2012']['elements'].append(_get_uik2012_from_uik_db(uik))
        uiks_for_json['points']['layers']['uik_2012']['count'] = uiks_for_json['points']['count']

    session.close()
    return Response(json.dumps(uiks_for_json), content_type='application/json')


def _get_uik2012_from_uik_db(uik_from_db):
    return {'id': uik_from_db[0].id,
            'name': uik_from_db[0].name,
            'addr': uik_from_db[0].address,
            'lon': uik_from_db[1],
            'lat': uik_from_db[2]}


@view_config(route_name='uikp', request_method='GET')
def get_uik2012(context, request):
    uik_id = request.matchdict.get('id', None)
    session = DBSession()
    uik = session.query(VotingStation, Location, Location.point.x, Location.point.y) \
        .join(VotingStation.location) \
        .filter(VotingStation.id == uik_id).one()

    uik_res = {
        'uikp': {
            'id': uik[0].id,
            'name': uik[0].name if uik[0].name else'',
            'comment': uik[0].comment if uik[0].comment else '',
            'address': uik[0].address if uik[0].address else ''
        }
    }

    uik_res['uikp']['geom'] = {'id': uik[1].id, 'lng': uik[2], 'lat': uik[3]}

    session.close()
    return Response(json.dumps(uik_res), content_type='application/json')


@view_config(route_name='stat_json', request_method='POST')
def get_stat(context, request):
    user_name = None
    if hasattr(request, 'cookies') and 'sk' in request.cookies.keys() and 'sk' in request.session and \
                    request.session['sk'] == request.cookies['sk'] and 'u_name' in request.session:
        user_name = request.session['u_name']

    session = DBSession()
    uiks_from_db = session.query(Uik, Uik.point.x, Uik.point.y) \
        .join('geocoding_precision') \
        .join('tik') \
        .join('region')

    clauses = []
    if request.POST:
        if exist_filter_parameter('geocoding_precision', request):
            clauses.append(Uik.geocoding_precision_id == request.POST['geocoding_precision'])
        if exist_filter_parameter('is_applied', request):
            clauses.append(Uik.is_applied == (request.POST['is_applied'] == 'True'))
        if exist_filter_parameter('number_official', request):
            clauses.append(Uik.number_official == request.POST['number_official'])
        if exist_filter_parameter('region', request):
            clauses.append(Uik.region_id == int(request.POST['region']))
        if exist_filter_parameter('place_voting', request):
            clauses.append(Uik.place_voting.ilike('%' + request.POST['place_voting'].encode('UTF-8').strip() + '%'))
        if exist_filter_parameter('tik', request):
            clauses.append(Uik.tik_id == int(request.POST['tik']))
        if exist_filter_parameter('user_id', request):
            user_uiks_subq = (session.query(distinct(UikVersions.uik_id).label("uik_id"))
                              .filter(UikVersions.user_id == int(request.POST['user_id']))) \
                .subquery()
            uiks_from_db = uiks_from_db.join(user_uiks_subq, and_(Uik.id == user_uiks_subq.c.uik_id))

    uiks_from_db = uiks_from_db.filter(*clauses)

    if 'jtSorting' in request.params:
        sort = request.params['jtSorting']
        sort = sort.split(' ')
        if sort[1] == 'ASC':
            uiks_from_db = uiks_from_db.order_by(asc(get_sort_param(sort[0])))
        if sort[1] == 'DESC':
            uiks_from_db = uiks_from_db.order_by(desc(get_sort_param(sort[0])))
    else:
        uiks_from_db = uiks_from_db.order_by(asc(Uik.number_official))

    count = uiks_from_db.count()

    uiks_from_db = uiks_from_db.offset(request.params['jtStartIndex']) \
        .limit(request.params['jtPageSize']) \
        .all()

    records = [create_uik_stat(uik) for uik in uiks_from_db]
    session.close()

    return Response(json.dumps({
        'Result': 'OK',
        'Records': records,
        'TotalRecordCount': count
    }), content_type='application/json')


def exist_filter_parameter(param, request):
    return (param in request.POST) and (len(request.POST[param].encode('UTF-8').strip()) > 0)


def create_uik_stat(uik_from_db):
    uik = uik_from_db[0].to_dict()
    uik['tik'] = uik_from_db[0].tik.name
    uik['geocoding_precision'] = uik_from_db[0].geocoding_precision.name_ru
    uik['region'] = uik_from_db[0].region.name
    uik['lng'] = uik_from_db[1]
    uik['lat'] = uik_from_db[2]
    return uik


params = {
    'number_official': Uik.number_official,
    'tik': Tik.name,
    'geocoding_precision': GeocodingPrecision.name_ru,
    'region': Region.name,
    'place_voting': Uik.place_voting,
    'is_applied': Uik.is_applied,
    'comment': Uik.comment
}


def get_sort_param(param):
    return params[param]


def build_filtering_query(request, query):
    if 'jtSorting' in request.params:
        return request


@view_config(route_name='statistic', request_method='GET', renderer='stat.mako')
def get_stat_page(context, request):
    session = DBSession()

    user_uiks_count_sbq = session \
        .query(UikVersions.user_id.label('user_id'), func.count(UikVersions.uik_id.distinct()).label('count_uiks')) \
        .group_by(UikVersions.user_id) \
        .subquery()

    user_uiks_logs = session.query(User, user_uiks_count_sbq.c.count_uiks) \
        .outerjoin(user_uiks_count_sbq, User.id == user_uiks_count_sbq.c.user_id) \
        .order_by(User.display_name)

    session.close()

    return {
        'tiks': session.query(Tik).order_by(Tik.name).all(),
        'geocoding_precisions': session.query(GeocodingPrecision).order_by(GeocodingPrecision.name_ru).all(),
        'regions': session.query(Region).order_by(Region.name).all(),
        'users': user_uiks_logs.all()
    }