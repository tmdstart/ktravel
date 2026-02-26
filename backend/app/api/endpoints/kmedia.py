from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.destination import Destination
from app.schemas import DestinationAddRequest, DestinationAddResponse
from app.core.deps import get_current_user

router = APIRouter(prefix="/kmedia", tags=["K-Media"])

@router.post("/add", response_model=DestinationAddResponse)
async def add_kmedia_place(
    item: DestinationAddRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    K-콘텐츠 장소를 내 여행지에 저장
    """
    try:
        new_place = Destination(
            user_id=current_user['user_id'],
            name=item.name,
            place_type=item.place_type,
            reference_id=item.reference_id,
            location_name=item.location_name,
            latitude=item.latitude,
            longitude=item.longitude,
            notes=item.notes or "",
            visit_order=item.visit_order or 0,
            schedule_id=None  # 일정에 추가 X → 저장만
        )

        db.add(new_place)
        db.commit()
        db.refresh(new_place)

        return DestinationAddResponse(
            success=True,
            message=f"{new_place.name} 장소가 저장되었습니다.",
            destination_id=new_place.destination_id,
            schedule_id=0  # schedule_id 필수값
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
