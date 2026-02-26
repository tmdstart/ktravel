# models/restaurant.py
from sqlalchemy import Column, Integer, String, DECIMAL, Text
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Restaurant(Base):
    __tablename__ = "celeb_restaurants"

    restaurant_id = Column(Integer, primary_key=True, index=True)

    # 기본 정보
    restaurant_name = Column(String(255), nullable=False, index=True)
    place = Column(String(255), nullable=True)
    image_path = Column(String(500), nullable=True)
    
    # 좌표
    latitude = Column(DECIMAL(10, 8), nullable=True)
    longitude = Column(DECIMAL(11, 8), nullable=True)

    # 지하철/유형
    near_subway = Column(String(255), nullable=True)
    type = Column(String(255), nullable=True)

    # 내용
    description_clean = Column(Text, nullable=True)

    # 번역 데이터
    restaurant_name_en = Column(String(255), nullable=True)
    place_en = Column(String(255), nullable=True)
    near_subway_en = Column(String(255), nullable=True)
    type_en = Column(String(255), nullable=True)
    description_clean_en = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Restaurant(restaurant_id={self.restaurant_id}, name='{self.restaurant_name}')>"

    def to_dict(self):
        """객체를 딕셔너리로 변환"""
        return {
            "restaurant_id": self.restaurant_id,
            "restaurant_name": self.restaurant_name,
            "place": self.place,
            "image_path": self.image_path,
            "Latitude": float(self.latitude) if self.latitude else None,
            "Longitude": float(self.longitude) if self.longitude else None,
            "near_subway": self.near_subway,
            "type": self.type,
            "description_clean": self.description_clean,

            "restaurant_name_en": self.restaurant_name_en,
            "place_en": self.place_en,
            "near_subway_en": self.near_subway_en,
            "type_en": self.type_en,
            "description_clean_en": self.description_clean_en,
        }
