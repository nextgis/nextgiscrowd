from ngcrowd.models import *
from ngcrowd.helpers import get_utf_encoded_value

from sqlalchemy.orm import joinedload
from os import path, makedirs
from xml.etree.ElementTree import Element, SubElement, tostring
import csv
import shutil


class UikExportStrategy():
    def __init__(self, uik_export_strategy):
        self.strategy = uik_export_strategy

    def __start(self):
        self.strategy.start()

    def __end(self):
        self.strategy.end()

    def export_region(self, region_id):
        self.strategy.start(region_id)

        session = DBSession()
        uiks = session.query(Uik, Uik.point.x, Uik.point.y)\
            .options(joinedload('region'), joinedload('tik'), joinedload('geocoding_precision'))\
            .filter(Uik.region_id == region_id)

        for uik in uiks:
            self.strategy.export(uik)

        self.strategy.end()

    def export_all_regions(self):
        session = DBSession()
        regions = session.query(Region)\
            .filter(Region.imported == True)\
            .all()

        for region in regions:
            self.export_region(region.id)


class GeoCsvUikExportStrategy():
    def __init__(self, dir_destination='', dir_template=''):
        self.root_dir = dir_destination
        self.templates_dir = dir_template
        self.csv_file = None
        self.writer = None
        from collections import OrderedDict
        self.scheme = OrderedDict([
            ('id', 'Integer(5)'),
            ('lat', 'Real(10.7)'),
            ('lon', 'Real(10.7)'),
            ('number_official', 'String(255)'),
            ('address_voting', 'String(255)'),
            ('place_voting', 'String(255)'),
            ('comment', 'String(255)'),
            ('is_applied', 'String(255)'),
            ('geocoding_precision', 'String(255)'),
            ('tik', 'String(255)'),
            ('tik_id', 'Integer(5)'),
            ('region', 'String(255)')
        ])
        self.__temp_uik = self.scheme.copy()

    def start(self, region_id):
        work_dir = path.join(self.root_dir, str(region_id))
        file_name_by_region_id = str(region_id)
        if not path.exists(work_dir):
            makedirs(work_dir)

        self.__create_prj_file(work_dir, file_name_by_region_id)
        self.__create_vrt_file(work_dir, file_name_by_region_id)
        self.__create_csvt_file(work_dir, file_name_by_region_id)
        self.__create_readme_file(work_dir)

        self.csv_file = open(path.join(work_dir, file_name_by_region_id + '.csv'), 'w+')
        self.writer = csv.DictWriter(self.csv_file, self.scheme)
        self.writer.writeheader()

    def __create_prj_file(self, dir_destination, file_name):
        content = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],'\
                  'PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
        prj_file = open(path.join(dir_destination, file_name + '.prj'), 'w+')
        prj_file.write(content)
        prj_file.close()

    def __create_vrt_file(self, dir_destination, file_name):
        root = Element('OGRVRTDataSource')
        ogr_vrt_layer = SubElement(root, 'OGRVRTLayer', {'name': file_name})
        SubElement(ogr_vrt_layer, 'SrcDataSource', {'relativeToVRT': '1'}).text = file_name + '.csv'
        SubElement(ogr_vrt_layer, 'LayerSRS').text = 'EPSG:4326'
        SubElement(ogr_vrt_layer, 'GeometryType').text = 'wkbPoint'
        SubElement(ogr_vrt_layer, 'GeometryField', {
            'encoding': 'PointFromColumns',
            'x':  'lon',
            'y': 'lat'
        })

        vrt_file = open(path.join(dir_destination, file_name + '.vrt'), 'w+')
        vrt_file.write(tostring(root))
        vrt_file.close()

    def __create_csvt_file(self, dir_destination, file_name):
        csvt_file = open(path.join(dir_destination, file_name + '.csvt'), 'w+')
        csvt_writer = csv.DictWriter(csvt_file, self.scheme)
        csvt_writer.writerow(self.scheme)
        csvt_file.close()

    def __create_readme_file(self, dir_destination, file_name='README.txt'):
        readmy_template_path = path.join(self.templates_dir, file_name)
        readmy_work = path.join(dir_destination, file_name)
        if path.exists(readmy_template_path):
            shutil.copy(readmy_template_path, readmy_work)

    def export(self, Uik):
        uik_csv = self.__temp_uik
        uik_csv['id'] = Uik[0].id
        uik_csv['lon'] = Uik[1]
        uik_csv['lat'] = Uik[2]
        uik_csv['number_official'] = Uik[0].number_official
        uik_csv['address_voting'] = get_utf_encoded_value(Uik[0].address_voting)
        uik_csv['place_voting'] = get_utf_encoded_value(Uik[0].place_voting)
        uik_csv['comment'] = get_utf_encoded_value(Uik[0].comment)
        uik_csv['is_applied'] = Uik[0].is_applied
        uik_csv['geocoding_precision'] = get_utf_encoded_value(Uik[0].geocoding_precision.name)
        uik_csv['tik'] = get_utf_encoded_value(Uik[0].tik.name)
        uik_csv['tik_id'] = Uik[0].tik.id
        uik_csv['region'] = get_utf_encoded_value(Uik[0].region.name)
        self.writer.writerow(uik_csv)

    def end(self):
        self.csv_file.close()