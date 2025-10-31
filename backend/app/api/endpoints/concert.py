"""
콘서트 API 엔드포인트 (ORM 버전)
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date
from app.database.connection import get_db 
# 모델 및 스키마 이름을 'Festival'에서 'Concert'로 변경합니다.
from app.models.concert import Concert 
from app.schemas import ( 
    ConcertResponse,
    ConcertSummary, # 사용하지 않지만 일단 유지합니다.
    ConcertsResponse # 사용하지 않지만 일단 유지합니다.
)

router = APIRouter(
    prefix="/api/concerts", # URL 접두사를 /api/concerts로 변경
    tags=["concerts"] # 태그를 concerts로 변경
)

@router.get("/", response_model=List[ConcertResponse])
async def get_all_concerts(
    # filter_type 필드가 모델에서 제거되었으므로, 인자도 제거합니다.
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """모든 콘서트 목록 조회 (ORM 버전)"""
    try:
        query = db.query(Concert)
        
        # filter_type 로직이 모델에서 제거되었으므로, 관련 코드를 제거합니다.
        
        # 정렬 및 페이징
        concerts = query.order_by(
            Concert.start_date.desc()
        ).offset(skip).limit(limit).all()
        
        return concerts
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"콘서트 조회 오류: {str(e)}")

@router.get("/{concert_id}", response_model=ConcertResponse)
async def get_concert_by_id(
    concert_id: int, # 인자 이름 변경
    db: Session = Depends(get_db)
):
    """특정 콘서트 상세 정보 (ORM 버전)"""
    try:
        # 모델명과 ID 필드명 변경 (Festival.fastival_id -> Concert.concert_id)
        concert = db.query(Concert).filter(
            Concert.concert_id == concert_id
        ).first()
        
        if not concert:
            raise HTTPException(status_code=404, detail="콘서트를 찾을 수 없습니다")
        
        return concert
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"콘서트 조회 오류: {str(e)}")

@router.get("/status/ongoing", response_model=List[ConcertResponse])
async def get_ongoing_concerts( # 함수명 변경
    db: Session = Depends(get_db)
):
    """현재 진행 중인 콘서트 (ORM 버전)"""
    try:
        today = date.today()
        
        # 모델명 변경 및 날짜 비교 유지
        concerts = db.query(Concert).filter(
            and_(
                Concert.start_date <= today,
                Concert.end_date >= today
            )
        ).order_by(Concert.start_date).all()
        
        return concerts
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"진행 중인 콘서트 조회 오류: {str(e)}")

@router.get("/status/upcoming", response_model=List[ConcertResponse])
async def get_upcoming_concerts( # 함수명 변경
    db: Session = Depends(get_db)
):
    """예정된 콘서트 (ORM 버전)"""
    try:
        today = date.today()
        
        # 모델명 변경 및 날짜 비교 유지
        concerts = db.query(Concert).filter(
            Concert.start_date > today
        ).order_by(Concert.start_date).limit(50).all()
        
        return concerts
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예정된 콘서트 조회 오류: {str(e)}")

@router.get("/search/query", response_model=List[ConcertResponse])
async def search_concerts( # 함수명 변경
    q: str,
    db: Session = Depends(get_db)
):
    """콘서트 검색 (ORM 버전)"""
    try:
        if len(q.strip()) < 2:
            raise HTTPException(status_code=400, detail="검색어는 2글자 이상이어야 합니다")
        
        # description 필드가 모델에서 제거되었으므로, title만 검색하도록 수정합니다.
        # place 필드도 추가 검색 대상으로 고려할 수 있으나, 기존 로직에 맞춰 title만 유지
        concerts = db.query(Concert).filter(
            Concert.title.contains(q)
            # 기존 Festival.description.contains(q)는 제거됨
        ).order_by(Concert.start_date.desc()).limit(100).all()
        
        return concerts
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"콘서트 검색 오류: {str(e)}")

# @router.get("/filter/type/{filter_type}", ...) 엔드포인트는
# 모델에서 filter_type 필드가 제거되었으므로 함께 제거합니다.

@router.get("/date/range", response_model=List[ConcertResponse])
async def get_concerts_by_date_range( # 함수명 변경
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    """날짜 범위별 콘서트 조회 (ORM 버전)"""
    try:
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="시작 날짜가 종료 날짜보다 늦습니다")
        
        # 모델명 변경 및 날짜 범위 필터링 로직 유지
        concerts = db.query(Concert).filter(
            or_(
                and_(Concert.start_date >= start_date, Concert.start_date <= end_date),
                and_(Concert.end_date >= start_date, Concert.end_date <= end_date),
                and_(Concert.start_date <= start_date, Concert.end_date >= end_date)
            )
        ).order_by(Concert.start_date).all()
        
        return concerts
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"날짜별 콘서트 조회 오류: {str(e)}")
