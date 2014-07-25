# -*- coding: utf-8 -*-

from ngcroud.models import DBSession, User
from pyramid.view import view_config
import transaction
import datetime

@view_config(route_name='register', renderer='register.mako')
def register(request):
    return {}


@view_config(route_name='register', request_method='POST', renderer='register.mako')
def register_post(request):
    session = DBSession()
    errors = []
    info = ''

    if not request.POST['name']:
        errors.append(u'Вы не указали ваше имя')

    if request.POST['email']:
        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", request.POST['email']):
            errors.append(u'Неправильный формат адреса электронной почты - адрес должен иметь вид user@server.ru')
        existed_email = session.query(User.email).filter(User.email == request.POST['email']).count()
        if existed_email > 0:
            errors.append(u'Пользователь с таким адресом электронной почты (%s) уже существует' % request.POST['email'])
    else:
        errors.append(u'Вы не указали адрес вашей электронной почты')

    if 'password' in request.POST.keys() or request.POST['pass']:
        if not request.POST['pass2'] or request.POST['pass'] != request.POST['pass2']:
            errors.append(u'Введенные вами пароли не совпадают')
        if len(request.POST['pass']) < 5:
            errors.append(u'Длина пароля должна быть больше 4 символов')
    else:
        errors.append(u'Вы не указали пароль')

    if not errors:
        with transaction.manager:
            user = User()
            user.display_name = request.POST['name']
            user.email = request.POST['email']
            user.password = User.password_hash(request.POST['pass'], 'rte45EWRRT')
            user.registered_time = datetime.datetime.now()
            session.add(user)
        info = u'Вы зарегистрированы. Поздравляем!'

    session.close()

    return {
        'errors': errors,
        'info': info
    }