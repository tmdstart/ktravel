from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from fastapi import Depends

# SQLAlchemy 엔진 생성 - settings.DATABASE_URL 사용 (이미 인코딩됨)
DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"options": "-csearch_path=lgup2"},
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    echo=True  # 개발 시에만 사용, 프로덕션에서는 False
)

# 세션 로컬 클래스
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 (모든 ORM 모델의 부모)
Base = declarative_base()

# FastAPI 의존성으로 사용할 DB 세션
def get_db() -> Session:
    """ORM 세션 의존성 (FastAPI에서 Depends로 사용)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 테이블 생성 함수 (나중에 사용)
def create_tables():
    """모든 테이블을 데이터베이스에 생성"""
    Base.metadata.create_all(bind=engine)
    
def get_db_dependency():
    """FastAPI Depends 래퍼 함수"""
    return Depends(get_db)