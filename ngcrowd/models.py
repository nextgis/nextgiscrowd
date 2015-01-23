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

from geoalchemy2 import (
    Geometry, WKBElement
)

from geoalchemy.postgis import PGPersistentSpatialElement

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
            if isinstance(v, WKBElement):
                v = {}
            d[c.name] = v

        for k, v in init.items():
            d[k] = v

        return d


class Application(Base, JsonifyMixin):
    __tablename__ = 'app'

    id = Column(Integer, Sequence('app_id_seq'), primary_key=True)
    title = Column(Text)
    description = Column(Text)
    facebook_account = Column(Text)
    twitter_hash_tags = Column(Text)


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


class Entity(Base, JsonifyMixin):
    __tablename__ = 'entities'

    id = Column(Integer, Sequence('entities_id_seq'), primary_key=True)
    point = Column(Geometry(geometry_type='POINT', srid=4326))
    approved = Column(Boolean,  index=True, default=False)
    comment = Column(Text)

    user_block = relationship('User')
    user_block_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    blocked = Column(Boolean, index=True, default=False)

    values = relationship('EntityPropertyValue')


class EntityProperty(Base, JsonifyMixin):
    __tablename__ = 'entity_properties'

    id = Column(Integer, Sequence('entity_properties_id_seq'), primary_key=True)
    source_title = Column(Text, index=True)
    title = Column(Text, index=True)
    visible_order = Column(Integer, index=True)
    editable = Column(Boolean)
    type = Column(Enum('text', 'int', 'bool', 'reference_book', name='property_types'))
    control = Column(Text, index=True)
    searchable = Column(Boolean, index=True, default=False)
    address_field = Column(Boolean, index=True, default=False)
    number_field = Column(Boolean, index=True, default=False)
    table_width = Column(Text)
    reference_book_values = relationship('ReferenceBookValue')


class EntityPropertyValue(Base):
    __tablename__ = 'entities_properties_values'

    entity_property = relationship('EntityProperty')
    entity_property_id = Column(Integer, ForeignKey('entity_properties.id'), primary_key=True, index=True)

    entity = relationship('Entity')
    entity_id = Column(Integer, ForeignKey('entities.id'), primary_key=True, index=True)

    text = Column(Text, index=True)
    int = Column(Integer, index=True)
    bool = Column(Boolean, index=True)
    reference_book = relationship('ReferenceBookValue')
    reference_book_id = Column(Integer, ForeignKey('reference_books_values.id'), index=True)


class ReferenceBookValue(Base):
    __tablename__ = 'reference_books_values'

    id = Column(Integer, Sequence('reference_books_value_id_seq'), primary_key=True)
    reference_book = relationship('EntityProperty')
    reference_book_id = Column(Integer, ForeignKey('entity_properties.id'))
    value = Column(Text, index=True)


class EntityVersions(Base):
    __tablename__ = 'entity_versions'

    entity = relationship('Entity')
    entity_id = Column(Integer, ForeignKey('entities.id'), primary_key=True)
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