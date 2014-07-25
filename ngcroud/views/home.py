# -*- coding: utf-8 -*-

from ngcroud.models import DBSession, User, GeocodingPrecision
from ngcroud.security import generate_session_id
from pyramid.view import view_config
from sqlalchemy.sql.expression import asc

@view_config(route_name='home', renderer='base.mako')
def home(request):
    user_name = None
    if hasattr(request, 'cookies') and 'sk' in request.cookies.keys() and 'sk' in request.session and \
                    request.session['sk'] == request.cookies['sk'] and 'u_name' in request.session:
        user_name = request.session['u_name']

    session = DBSession()
    geocoding_precisions = session.query(GeocodingPrecision).order_by(asc(GeocodingPrecision.id)).all()
    session.close()

    return {
        'u_name': user_name,
        'project': 'ngcroud',
        'geocoding_precisions': geocoding_precisions,
        'static_version': request.registry.settings['static_version']
    }

@view_config(route_name='home', request_method='POST', renderer='base.mako')
def home_signin(request):
    result = home(request)

    if 'sign_out' in request.POST.keys():
        request.session.invalidate()
        result['u_name'] = None

    else:
        email = request.POST['mail']
        password = request.POST['pass']

        session = DBSession()
        user = session.query(User) \
            .filter(User.email == email, User.password == User.password_hash(password, 'rte45EWRRT')) \
            .first()
        if user:
            request.session['sk'] = generate_session_id()
            request.session['u_name'] = user.display_name
            request.session['u_id'] = user.id
            request.response.set_cookie('sk', value=request.session['sk'], max_age=86400)
            result['u_name'] = user.display_name
        session.close()

    result['static_version'] = request.registry.settings['static_version']

    return result