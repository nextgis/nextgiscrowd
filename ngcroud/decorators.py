from pyramid.response import Response


def authorized():
    def renderer(func):
        def wrapper(context, request):
            if 'sk' in request.cookies.keys() and 'sk' in request.session and request.session['sk'] == request.cookies[
                'sk']:
                return func(context, request)
            else:
                return Response(status=401)

        return wrapper

    return renderer