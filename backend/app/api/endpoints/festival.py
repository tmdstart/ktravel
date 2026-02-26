"""
축제 API 엔드포인트 (ORM 버전)
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date, datetime
from app.database.connection import get_db  # ← backend. 제거
from app.models.festival import Festival     # ← backend. 제거
from app.schemas import (                    # ← backend. 제거
    FestivalResponse,
    #FestivalSummary,
    #FestivalsResponse
)

router = APIRouter(
    prefix="/api/festivals",
    tags=["festivals"]
)

@router.get("/{festival_id}", response_model=FestivalResponse)
async def get_festival_by_id(
    festival_id: int,
    db: Session = Depends(get_db)
):
    """특정 축제 상세 정보 (ORM 버전)"""
    try:
        festival = db.query(Festival).filter(
            Festival.festival_id == festival_id
        ).first()
        
        if not festival:
            raise HTTPException(status_code=404, detail="축제를 찾을 수 없습니다")
        
        return festival
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"축제 조회 오류: {str(e)}")

@router.get("/search/query", response_model=List[FestivalResponse])
async def search_festivals(
    q: str,
    db: Session = Depends(get_db)
):
    """축제 검색 (ORM 버전)"""
    try:
        if len(q.strip()) < 2:
            raise HTTPException(status_code=400, detail="검색어는 2글자 이상이어야 합니다")
        
        # 제목 또는 설명에서 검색
        festivals = db.query(Festival).filter(
            or_(
                Festival.title.contains(q),
                Festival.description.contains(q)
            )
        ).order_by(Festival.start_date.desc()).limit(100).all()
        
        return festivals
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"축제 검색 오류: {str(e)}")

################################
# 아래는 현재 사용하지 않는 엔드포인트들

# @router.get("/", response_model=List[FestivalResponse])
# async def get_all_festivals(
#     filter_type: Optional[str] = None,
#     skip: int = 0,
#     limit: int = 100,
#     db: Session = Depends(get_db)
# ):
#     """모든 축제 목록 조회 (ORM 버전)"""
#     try:
#         query = db.query(Festival)
        
#         # 필터 타입이 있으면 적용
#         if filter_type:
#             query = query.filter(Festival.filter_type == filter_type)
        
#         # 정렬 및 페이징
#         festivals = query.order_by(
#             Festival.start_date.desc()
#         ).offset(skip).limit(limit).all()
        
#         return festivals
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"축제 조회 오류: {str(e)}")

# @router.get("/status/ongoing", response_model=List[FestivalResponse])
# async def get_ongoing_festivals(
#     db: Session = Depends(get_db)
# ):
#     """현재 진행 중인 축제 (ORM 버전)"""
#     try:
#         today = date.today()
        
#         festivals = db.query(Festival).filter(
#             and_(
#                 Festival.start_date <= today,
#                 Festival.end_date >= today
#             )
#         ).order_by(Festival.start_date).all()
        
#         return festivals
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"진행 중인 축제 조회 오류: {str(e)}")

# @router.get("/status/upcoming", response_model=List[FestivalResponse])
# async def get_upcoming_festivals(
#     db: Session = Depends(get_db)
# ):
#     """예정된 축제 (ORM 버전)"""
#     try:
#         today = date.today()
        
#         festivals = db.query(Festival).filter(
#             Festival.start_date > today
#         ).order_by(Festival.start_date).limit(50).all()
        
#         return festivals
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"예정된 축제 조회 오류: {str(e)}")

# @router.get("/filter/type/{filter_type}", response_model=List[FestivalResponse])
# async def get_festivals_by_type(
#     filter_type: str,
#     limit: int = 50,
#     db: Session = Depends(get_db)
# ):
#     """축제 유형별 조회 (ORM 버전)"""
#     try:
#         festivals = db.query(Festival).filter(
#             Festival.filter_type == filter_type
#         ).order_by(Festival.start_date.desc()).limit(limit).all()
        
#         return festivals
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"유형별 축제 조회 오류: {str(e)}")

# @router.get("/date/range", response_model=List[FestivalResponse])
# async def get_festivals_by_date_range(
#     start_date: date,
#     end_date: date,
#     db: Session = Depends(get_db)
# ):
#     """날짜 범위별 축제 조회 (ORM 버전)"""
#     try:
#         if start_date > end_date:
#             raise HTTPException(status_code=400, detail="시작 날짜가 종료 날짜보다 늦습니다")
        
#         festivals = db.query(Festival).filter(
#             or_(
#                 and_(Festival.start_date >= start_date, Festival.start_date <= end_date),
#                 and_(Festival.end_date >= start_date, Festival.end_date <= end_date),
#                 and_(Festival.start_date <= start_date, Festival.end_date >= end_date)
#             )
#         ).order_by(Festival.start_date).all()
        
#         return festivals
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"날짜별 축제 조회 오류: {str(e)}")