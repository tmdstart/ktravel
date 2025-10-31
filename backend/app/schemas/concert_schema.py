from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import date

# -------------------------------
# 기본 스키마
# -------------------------------
class ConcertBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    start_date: date
    end_date: Optional[date] = None
    place: Optional[str] = Field(None, max_length=255)
    image: Optional[HttpUrl] = None  # URL 형식 검증 추가
    link: Optional[HttpUrl] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# -------------------------------
# 생성용 스키마
# -------------------------------
class ConcertCreate(ConcertBase):
    pass  # start_date는 NOT NULL 필수이므로 그대로 둠

# -------------------------------
# 수정용 스키마
# -------------------------------
class ConcertUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[date] = None  # 서버에서 None 처리 시 NOT NULL 체크 필요
    end_date: Optional[date] = None
    place: Optional[str] = Field(None, max_length=255)
    image: Optional[HttpUrl] = None
    link: Optional[HttpUrl] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# -------------------------------
# 응답용 스키마
# -------------------------------
class ConcertResponse(ConcertBase):
    concert_id: int

    model_config = {
        "from_attributes": True
    }

# -------------------------------
# 목록용 간단한 스키마
# -------------------------------
class ConcertSummary(BaseModel):
    concert_id: int
    title: str
    start_date: date
    end_date: Optional[date] = None
    place: Optional[str] = None

    model_config = {
        "from_attributes": True
    }

# -------------------------------
# 콘서트 목록 조회용
# -------------------------------
class ConcertsResponse(BaseModel):
    concerts: List[ConcertResponse]
    total_count: int

# -------------------------------
# 진행 중/예정 콘서트 조회용
# -------------------------------
class OngoingConcertsResponse(BaseModel):
    ongoing_concerts: List[ConcertResponse]
    upcoming_concerts: List[ConcertResponse]

# -------------------------------
# 콘서트 검색용
# -------------------------------
class ConcertSearch(BaseModel):
    query: str = Field(..., min_length=1)
    start_date: Optional[date] = None
    end_date: Optional[date] = None

# -------------------------------
# 날짜 범위별 콘서트 조회용
# -------------------------------
class ConcertDateRange(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
