__author__ = 'karavanjo'

from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    Text,
    Sequence,
    Boolean,
    DateTime,
    Enum
)

import datetime

from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION, BYTEA

from geoalchemy import (
    GeometryColumn,
    Geometry,
    Polygon,
    WKTSpatialElement
)

from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    relationship,
)

from zope.sqlalchemy import ZopeTransactionExtension

import zlib
import base64
import json

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))
Base = declarative_base()


class JsonifyMixin:
    def __init__(self):
        pass

    def as_json_dict(self, **init):
        d = dict()
        for c in self.__table__.columns:
            v = getattr(self, c.name)
            if isinstance(v, datetime.datetime):
                v = v.isoformat()
            d[c.name] = v

        for k, v in init.items():
            d[k] = v

        return d


class District(Base):
    __tablename__ = 'district'

    id = Column(Integer, Sequence('district_id_seq'), primary_key=True)
    name = Column(Text, nullable=True)


class Area(Base):
    __tablename__ = 'area'

    id = Column(Integer, Sequence('area_id_seq'), primary_key=True)
    name = Column(Text, nullable=True)
    bounds_left = Column(DOUBLE_PRECISION)
    bounds_right = Column(DOUBLE_PRECISION)
    bounds_top = Column(DOUBLE_PRECISION)
    bounds_bottom = Column(DOUBLE_PRECISION)
    box = GeometryColumn(Polygon(2))
    district = relationship('District')
    district_id = Column(Integer, ForeignKey('district.id'), nullable=True)


class Locality(Base):
    __tablename__ = 'locality'

    id = Column(Integer, Sequence('locality_id_seq'), primary_key=True)
    name = Column(Text, nullable=True)
    bounds_left = Column(DOUBLE_PRECISION)
    bounds_right = Column(DOUBLE_PRECISION)
    bounds_top = Column(DOUBLE_PRECISION)
    bounds_bottom = Column(DOUBLE_PRECISION)
    box = GeometryColumn(Polygon(2))
    district = relationship('District')
    district_id = Column(Integer, ForeignKey('district.id'), nullable=True)
    area = relationship('Area')
    area_id = Column(Integer, ForeignKey('area.id'), nullable=True)


class Street(Base):
    __tablename__ = 'street'

    id = Column(Integer, Sequence('street_id_seq'), primary_key=True)
    name = Column(Text, nullable=True)
    bounds_left = Column(DOUBLE_PRECISION)
    bounds_right = Column(DOUBLE_PRECISION)
    bounds_top = Column(DOUBLE_PRECISION)
    bounds_bottom = Column(DOUBLE_PRECISION)
    box = GeometryColumn(Polygon(2))
    locality = relationship('Locality')
    locality_id = Column(Integer, ForeignKey('locality.id'), nullable=True)


class SubArea(Base):
    __tablename__ = 'sub_area'

    id = Column(Integer, Sequence('area_id_seq'), primary_key=True)
    name = Column(Text, nullable=True)
    district = relationship('District')
    district_id = Column(Integer, ForeignKey('district.id'), nullable=True)
    area = relationship(Area)
    area_id = Column(Integer, ForeignKey('area.id'), nullable=True)
    bounds_left = Column(DOUBLE_PRECISION)
    bounds_right = Column(DOUBLE_PRECISION)
    bounds_top = Column(DOUBLE_PRECISION)
    bounds_bottom = Column(DOUBLE_PRECISION)
    box = GeometryColumn(Polygon(2))


class Location(Base):
    __tablename__ = 'location'

    id = Column(Integer, Sequence('location_id_seq'), primary_key=True)
    point = GeometryColumn(Geometry(2, 4326, nullable=False))
    address = Column(Text, index=True, nullable=True)
    raw_address = Column(Text, nullable=True)
    lat = Column(DOUBLE_PRECISION)
    lon = Column(DOUBLE_PRECISION)
    district = relationship('District')
    district_id = Column(Integer, ForeignKey('district.id'))
    area = relationship('Area')
    area_id = Column(Integer, ForeignKey('area.id'))
    sub_area = relationship('SubArea')
    sub_area_id = Column(Integer, ForeignKey('sub_area.id'))
    locality = relationship('Locality')
    locality_id = Column(Integer, ForeignKey('locality.id'))
    street = relationship('Street')
    street_id = Column(Integer, ForeignKey('street.id'))


class VotingStation(Base):
    __tablename__ = 'voting_station'

    id = Column(Integer, Sequence('voting_station_id_seq'), primary_key=True)
    name = Column(Text, nullable=True)
    address = Column(Text, index=True, nullable=True)
    comment = Column(Text, nullable=True)
    is_standalone = Column(Boolean)
    size = Column(Text, nullable=True)
    location = relationship('Location')
    location_id = Column('location_id', Integer, ForeignKey('location.id'))
    is_checked = Column(Boolean)
    is_committee_here = Column(Boolean, index=True, nullable=False)
    is_blocked = Column(Boolean, nullable=True)
    user_block = relationship('User')
    user_block_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    committee_location = relationship('Location')
    committee_location_id = Column('location_id', Integer, ForeignKey('location.id'))


class Uik(Base):
    __tablename__ = 'uiks'

    id = Column(Integer, Sequence('uik_id_seq'), primary_key=True)
    number_official = Column(Text, nullable=False, index=True)
    number_composite = Column(Text, nullable=False, index=True)
    address_voting = Column(Text, nullable=False, index=True)
    place_voting = Column(Text, index=True)
    address_office = Column(Text, index=True)
    place_office = Column(Text, index=True)
    comment = Column(Text)
    point = GeometryColumn(Geometry(2, 4326, spatial_index=True))
    is_applied = Column(Boolean, nullable=False)
    geocoding_precision = relationship('GeocodingPrecision')
    geocoding_precision_id = Column(Integer, ForeignKey('geocoding_precisions.id'), nullable=False, index=True)
    tik = relationship('Tik')
    tik_id = Column(Integer, ForeignKey('tiks.id'), nullable=False)
    region = relationship('Region')
    region_id = Column(Integer, ForeignKey('regions.id'), nullable=False)
    is_blocked = Column(Boolean, nullable=True)
    user_block = relationship('User')
    user_block_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        return dict(
            id=self.id,
            number_official=self.number_official if self.number_official else '',
            number_composite=self.number_composite if self.number_composite else '',
            address_voting=self.address_voting if self.address_voting else '',
            place_voting=self.place_voting if self.place_voting else '',
            address_office=self.address_office if self.address_office else '',
            place_office=self.place_office if self.place_office else '',
            comment=self.comment if self.comment else '',
            is_applied=self.is_applied
        )


class Tik(Base):
    __tablename__ = 'tiks'

    id = Column(Integer, primary_key=True)
    name = Column(Text)
    link_orig = Column(Text)
    link_save = Column(Text)
    region = relationship('Region')
    region_id = Column(Integer, ForeignKey('regions.id'), nullable=False)

    def to_dict(self):
        return dict(
            id=self.id,
            name=self.name if self.name else '',
            link_orig=self.link_orig if self.link_orig else '',
            link_save=self.link_save if self.link_save else ''
        )


class Region(Base):
    __tablename__ = 'regions'

    # Id of region matches to region code
    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    imported = Column(Boolean)

    def to_dict(self):
        return dict(
            id=self.id,
            name=self.name if self.name else '',
            imported=self.imported
        )


class GeocodingPrecision(Base):
    __tablename__ = 'geocoding_precisions'

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    name_ru = Column(Text)

    def to_dict(self):
        return dict(
            id=self.id,
            name=self.name if self.name else '',
            name_ru=self.name_ru if self.name_ru else ''
        )


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, Sequence('users_id_seq'), primary_key=True)
    email = Column(Text)
    password = Column(Text)
    display_name = Column(Text)
    registered_time = Column(DateTime)


    @classmethod
    def password_hash(cls, password, salt):
        import hashlib
        return hashlib.sha1(password.encode('utf-8') + salt).hexdigest()

    def as_dict(self, **addon):
        return dict(id=self.id, email=self.email, display_name=self.display_name, **addon)


class UikVersions(Base):
    __tablename__ = 'uik_versions'

    uik = relationship('Uik')
    uik_id = Column(Integer, ForeignKey('uiks.id'), primary_key=True)
    user = relationship('User')
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    time = Column(DateTime, nullable=False, primary_key=True)
    dump = Column(BYTEA, nullable=False)

    def to_dict(self):
        return dict(
            uik_id=self.uik_id,
            user_id=self.user_id,
            time=self.time.isoformat(),
            dump=json.loads(zlib.decompress(base64.decodestring(self.dump)))
        )

    def to_json_binary_dump(self, json_object):
        json_object = json.dumps(json_object)
        json_object_str = zlib.compress(json_object)
        return base64.encodestring(json_object_str).strip()


class Entity(Base):
    __tablename__ = 'entities'

    id = Column(Integer, Sequence('entities_id_seq'), primary_key=True)
    point = GeometryColumn(Geometry(2, 4326, spatial_index=True))
    approved = Column(Boolean,  index=True, default=False)
    comment = Column(Text)
    blocked = Column(Boolean, index=True, default=False)
    values = relationship('EntityPropertyValue')


class EntityProperty(Base, JsonifyMixin):
    __tablename__ = 'entity_properties'

    id = Column(Integer, Sequence('entity_properties_id_seq'), primary_key=True)
    title = Column(Text, index=True)
    editable = Column(Boolean)
    type = Column(Enum('text', 'int', 'bool', 'reference_book', name='property_types'))
    control = Column(Text, index=True)
    searchable = Column(Boolean, index=True, default=False)


class EntityPropertyValue(Base):
    __tablename__ = 'entities_properties_values'

    entity_property = relationship('EntityProperty')
    entity_property_id = Column(Integer, ForeignKey('entity_properties.id'), primary_key=True)

    entity = relationship('Entity')
    entity_id = Column(Integer, ForeignKey('entities.id'), primary_key=True)

    text = Column(Text, index=True)
    int = Column(Integer, index=True)
    bool = Column(Boolean, index=True)
    reference_book = Column(Integer, ForeignKey('reference_books_values.id'), index=True)


class ReferenceBookValue(Base):
    __tablename__ = 'reference_books_values'

    id = Column(Integer, Sequence('reference_books_value_id_seq'), primary_key=True)
    reference_book = relationship('EntityProperty')
    reference_book_id = Column(Integer, ForeignKey('entity_properties.id'))
    value = Column(Text, index=True)