from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# 🎯 기본 스키마 (먼저 정의)
class DestinationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

# 생성용 스키마
class DestinationCreate(DestinationBase):
    user_id: int = Field(..., gt=0)
    extracted_from_convers_id: Optional[int] = Field(None, gt=0)

# 응답용 스키마
class DestinationResponse(DestinationBase):
    destination_id: int
    user_id: int
    extracted_from_convers_id: Optional[int] = None
    
    # 🎯 새 필드들 추가 (Optional로 기존 호환성 유지)
    place_type: int = 0
    reference_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    created_at: datetime
    
    class Config:
        from_attributes = True

# 대화에서 추출된 여행지 생성용
class DestinationFromConversation(BaseModel):
    names: list[str] = Field(..., min_items=1)
    conversation_id: int = Field(..., gt=0)

# 🎯 축제/명소/레스토랑/K-Contents 추가용 새로운 스키마들
class DestinationAddRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    day_number: int  # 🎯 schedule_id → day_number
    place_type: int = Field(
        default=2, 
        ge=0, 
        le=3,  # ✅ 수정: le=2 → le=3 (K-Contents 지원)
        description="0=레스토랑, 1=관광명소, 2=축제, 3=K-Contents"  # ✅ 설명 업데이트
    )
    reference_id: Optional[int] = Field(None, gt=0, description="restaurant_id, attr_id, festival_id, 또는 content_id")
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    notes: Optional[str] = Field(None, max_length=500, description="사용자 메모")
    visit_order: Optional[int] = None


class DestinationAddResponse(BaseModel):
    success: bool
    message: str
    destination_id: Optional[int] = None
    schedule_id: int  # 🎯 day_number → schedule_id

####################################
# 아래는 현재 사용하지 않는 스키마들

# # 수정용 스키마
# class DestinationUpdate(BaseModel):
#     name: Optional[str] = Field(None, min_length=1, max_length=255)

# # 목록용 간단한 스키마
# class DestinationSummary(BaseModel):
#     destination_id: int
#     name: str
    
#     class Config:
#         from_attributes = True

# # 사용자별 여행지 목록 조회용
# class UserDestinationsResponse(BaseModel):
#     destinations: list[DestinationResponse]
#     total_count: int

# # 🎯 기존 DestinationCreate도 확장
# class DestinationCreateExtended(DestinationBase):
#     user_id: int = Field(..., gt=0)
#     extracted_from_convers_id: Optional[int] = Field(None, gt=0)
#     place_type: int = Field(default=0, ge=0, le=2)
#     reference_id: Optional[int] = Field(None, gt=0)
#     latitude: Optional[float] = Field(None, ge=-90, le=90)
#     longitude: Optional[float] = Field(None, ge=-180, le=180)