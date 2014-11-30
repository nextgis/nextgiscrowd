# -*- coding: utf-8 -*-
__author__ = 'karavanjo'

from ngcrowd.models import DBSession, EntityVersions, User, Entity
from pyramid.view import view_config
from sqlalchemy import func
from sqlalchemy.sql.expression import desc

@view_config(route_name='logs', request_method='GET', renderer='users.mako')
def get_logs(context, request):
    session = DBSession()
    user_entities_count_sbq = session \
        .query(EntityVersions.user_id.label('user_id'), func.count(EntityVersions.entity_id.distinct()).label('count_entities')) \
        .group_by(EntityVersions.user_id) \
        .subquery()

    user_entities_logs = session.query(User, user_entities_count_sbq.c.count_entities) \
        .outerjoin(user_entities_count_sbq, User.id == user_entities_count_sbq.c.user_id) \
        .order_by(desc(user_entities_count_sbq.c.count_entities))

    # count_editable_uiks = session.query(func.count(UikVersions.uik_id.distinct())).scalar()
    count_approved_entities = session.query(func.count(Entity.id)).filter(Entity.approved == True).scalar()
    count_all_entities = session.query(func.count(Entity.id)).scalar()
    results = {
        'count': {
            'all': count_all_entities,
            # 'editable': count_editable_uiks,
            'approved': count_approved_entities
        },
        'uiks_by_users': []}
    rank = 1
    for user_uiks_log in user_entities_logs:
        registered_time = ''
        if user_uiks_log[0].registered_time:
            registered_time = user_uiks_log[0].registered_time.strftime('%Y-%m-%d %H:%m')
        if user_uiks_log[1]:
            results['uiks_by_users'].append({
                'user_name': user_uiks_log[0].display_name,
                'registered_time': registered_time,
                'count_uiks': user_uiks_log[1],
                'rank': rank
            })
            rank += 1

    session.close()

    return {
        'results': results
    }