from pyramid.config import Configurator
from sqlalchemy import engine_from_config
from pyramid_beaker import session_factory_from_settings
from pyramid_beaker import set_cache_regions_from_settings
from apscheduler.scheduler import Scheduler
from modules.export.export import UikExportStrategy, GeoCsvUikExportStrategy
from modules.export.zip import zip_all

from .models import (
    DBSession,
    Base,
)


def start_export():
    import os
    root_dir = os.path.dirname(__file__)
    export_dir_name = os.path.join(root_dir, 'data/export/uiks/')
    template_dir_name = os.path.join(root_dir, 'data/templates/')

    from shutil import rmtree
    if os.path.exists(export_dir_name):
        rmtree(export_dir_name)
    os.makedirs(export_dir_name)

    exporter = UikExportStrategy(GeoCsvUikExportStrategy(export_dir_name, template_dir_name))
    exporter.export_all_regions()
    zip_all(export_dir_name)


def start_scheduler():
    scheduler = Scheduler()
    scheduler.start()
    start_export()
    scheduler.add_cron_job(start_export, month='*', day='*', hour='16')


def main(global_config, **settings):
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine
    session_factory = session_factory_from_settings(settings)
    set_cache_regions_from_settings(settings)
    config = Configurator(settings=settings)
    config.set_session_factory(session_factory)
    config.include('pyramid_mako')
    #start_scheduler()
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_static_view('data', 'data', cache_max_age=3600)
    config.add_route('home', '/')
    config.add_route('entities_list', '/entity/all')
    config.add_route('entities_table_json', '/entities/table/json')
    config.add_route('entities_table_page', '/entities/table')
    config.add_route('export_page', '/uik/export')
    config.add_route('entity', '/entity/{id}')
    config.add_route('register', '/register')
    config.add_route('logs', '/logs')

    config.add_route('entity_block', '/entity/block/{id}')
    config.add_route('entity_unblock', '/entity/unblock/{id}')

    config.scan()
    return config.make_wsgi_app()