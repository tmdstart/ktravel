from sqlalchemy import Column, Integer, String, Date, Float # Float을 추가했습니다.
from sqlalchemy.sql import func
from app.database.connection import Base # 가정된 import 경로 유지

class Concert(Base):
    __tablename__ = "concert"  # 실제 테이블명이 'concert'라고 가정하고 수정합니다.
                               # 만약 실제 테이블명이 'festival'이었다면 "festival"을 사용하세요.
    
    # 기본 필드들: concert_id, title
    concert_id = Column(Integer, primary_key=True, index=True) # concert_id: INT, NOT NULL
    title = Column(String(255), nullable=False, index=True) # title: VARCHAR(255), NOT NULL
    
    # 날짜 정보: start_date, end_date
    start_date = Column(Date, nullable=False) # start_date: DATE, NOT NULL (필수)
    end_date = Column(Date, nullable=True) # end_date: DATE, NULL 허용
    
    # 추가된 필드들: place, image, link, latitude, longitude
    place = Column(String(255), nullable=True) # place: VARCHAR(255), NULL 허용
    image = Column(String(255), nullable=True) # image: VARCHAR(255), NULL 허용
    link = Column(String(255), nullable=True) # link: VARCHAR(255), NULL 허용
    
    # latitude, longitude는 DOUBLE이므로 Float 타입 사용
    latitude = Column(Float, nullable=True) # latitude: DOUBLE, NULL 허용
    longitude = Column(Float, nullable=True) # longitude: DOUBLE, NULL 허용
    
    
    def __repr__(self):
        return f"<Concert(concert_id={self.concert_id}, title='{self.title}', start_date='{self.start_date}')>"