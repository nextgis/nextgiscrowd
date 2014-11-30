from os.path import join
from ..models import DBSession
from pyramid.view import view_config
from pyramid.response import FileResponse
import pkg_resources

@view_config(route_name='uik_export_page', renderer='export.mako')
def get_export_page(context, request):
    # session = DBSession()
    #
    # imported_regions = session.query(Region)\
    #     .filter(Region.imported == True)\
    #     .order_by(Region.id)
    #
    # regions = []
    # for region in imported_regions:
    #     regions.append(region.to_dict())
    #
    # session.close()

    return {'regions': {}}