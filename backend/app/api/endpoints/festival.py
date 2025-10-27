"""
콘서트 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from app.database.connection import get_db
# ⚠️ ConcertQueries를 임포트하도록 변경했다고 가정
from app.database.queries.concert_queries import MusicalQueries

# ⚠️ 라우터 경로 및 태그를 뮤지컬 관련으로 변경
router = APIRouter(
    prefix="/api/musicals",
    tags=["musicals"]
)

# Response 모델: 뮤지컬 테이블 구조에 맞게 변경
class MusicalResponse(BaseModel):
    # ⚠️ 컬럼 이름 변경: concert_id -> musical_id
    musical_id: int 
    # ⚠️ filter_type 제거 (뮤지컬 테이블에 없다고 가정)
    title: str
    start_date: Optional[date]
    end_date: Optional[date]
    # ⚠️ place 추가
    place: Optional[str]
    # ⚠️ image -> image
    image: Optional[str] 
    # ⚠️ link 추가
    link: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    # ⚠️ description 제거 (뮤지컬 테이블에 없다고 가정)

    class Config:
        # Pydantic v2 호환성을 위해 from_attributes 사용
        from_attributes = True

# 모든 뮤지컬 조회
@router.get("/", response_model=List[MusicalResponse]) # ⚠️ 모델 이름 변경
async def get_all_musicals( # ⚠️ 함수 이름 변경
    skip: int = 0, # ⚠️ filter_type 제거
    limit: int = 100
):
    """모든 뮤지컬/공연 목록 조회"""
    with get_db() as (conn, cursor):
        # ⚠️ MusicalQueries 호출, filter_type 인자 제거
        result = MusicalQueries.get_all_musicals_with_error_handling(
            cursor, skip, limit
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result["data"]

# 특정 뮤지컬 조회
@router.get("/{musical_id}", response_model=MusicalResponse) # ⚠️ 경로 및 모델 이름 변경
async def get_musical_by_id(musical_id: int): # ⚠️ 함수 이름 및 인자 이름 변경
    """특정 뮤지컬/공연 상세 정보"""
    with get_db() as (conn, cursor):
        # ⚠️ MusicalQueries 호출
        result = MusicalQueries.get_musical_by_id_with_validation(cursor, musical_id)
        
        if not result["success"]:
            status_code = result.get("status_code", 500)
            raise HTTPException(status_code=status_code, detail=result["error"])
        
        return result["data"]

# 진행 중인 뮤지컬
@router.get("/status/ongoing", response_model=List[MusicalResponse]) # ⚠️ 모델 이름 변경
async def get_ongoing_musicals(): # ⚠️ 함수 이름 변경
    """현재 진행 중인 뮤지컬/공연"""
    with get_db() as (conn, cursor):
        # ⚠️ MusicalQueries 호출
        result = MusicalQueries.get_ongoing_musicals_with_error_handling(cursor)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result["data"]

# 예정된 뮤지컬
@router.get("/status/upcoming", response_model=List[MusicalResponse]) # ⚠️ 모델 이름 변경
async def get_upcoming_musicals(): # ⚠️ 함수 이름 변경
    """예정된 뮤지컬/공연"""
    with get_db() as (conn, cursor):
        # ⚠️ MusicalQueries 호출
        result = MusicalQueries.get_upcoming_musicals_with_error_handling(cursor)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result["data"]

# 검색
@router.get("/search/query", response_model=List[MusicalResponse]) # ⚠️ 모델 이름 변경
async def search_musicals(q: str): # ⚠️ 함수 이름 변경
    """뮤지컬/공연 검색"""
    with get_db() as (conn, cursor):
        # ⚠️ MusicalQueries 호출
        result = MusicalQueries.search_musicals_with_error_handling(cursor, q)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result["data"]