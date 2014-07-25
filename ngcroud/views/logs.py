# -*- coding: utf-8 -*-
__author__ = 'karavanjo'

from ngcroud.models import *
from pyramid.view import view_config
from sqlalchemy import func
from sqlalchemy.sql.expression import desc

@view_config(route_name='logs', request_method='GET', renderer='logs.mako')
def get_logs(context, request):
    session = DBSession()
    user_uiks_count_sbq = session \
        .query(UikVersions.user_id.label('user_id'), func.count(UikVersions.uik_id.distinct()).label('count_uiks')) \
        .group_by(UikVersions.user_id) \
        .subquery()

    user_uiks_logs = session.query(User, user_uiks_count_sbq.c.count_uiks) \
        .outerjoin(user_uiks_count_sbq, User.id == user_uiks_count_sbq.c.user_id) \
        .order_by(desc(user_uiks_count_sbq.c.count_uiks))

    # count_editable_uiks = session.query(func.count(UikVersions.uik_id.distinct())).scalar()
    count_approved_uiks = session.query(func.count(Uik.id)).filter(Uik.is_applied == True).scalar()
    count_all_uiks = session.query(func.count(Uik.id)).scalar()
    results = {
        'count': {
            'all': count_all_uiks,
            # 'editable': count_editable_uiks,
            'approved': count_approved_uiks
        },
        'uiks_by_users': []}
    rank = 1
    for user_uiks_log in user_uiks_logs:
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