"""
채팅 API 엔드포인트 (완전 수정본)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.chat_service import ChatService
from app.services.chat_rest import ChatRestService
from app.services.chat_kcontents import ChatIntegratedService  # ✅ 수정: 올바른 파일명
from app.schemas import ChatMessage
from app.core.deps import get_current_user

# ✅ 수정: prefix 제거 (main.py에서 /api 추가하므로)
router = APIRouter(tags=["chat"])


# ===== 🎬 K-Contents 통합 서비스 (MAIN) =====

@router.post("/chat/send")
async def send_message(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🎬 통합 서비스 - 일반 방식
    K-Contents + Restaurant + Entertainment 모두 검색
    """
    try:
        result = ChatIntegratedService.send_message(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통합 채팅 오류: {str(e)}")


@router.post("/chat/send/stream")
async def send_message_streaming(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🌊 통합 서비스 - Streaming 방식
    K-Contents + Restaurant + Entertainment 모두 검색
    """
    try:
        stream_generator = ChatIntegratedService.send_message_streaming(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        
        return StreamingResponse(
            stream_generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통합 스트리밍 오류: {str(e)}")


# ===== 🍽️ Restaurant 전용 서비스 =====

@router.post("/chat/restaurant/send")
async def send_restaurant_message(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """🍽️ 레스토랑 전용 - 일반 방식"""
    try:
        result = ChatRestService.send_message(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"레스토랑 채팅 오류: {str(e)}")


@router.post("/chat/restaurant/send/stream")
async def send_restaurant_message_streaming(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """🌊 레스토랑 전용 - Streaming 방식"""
    try:
        stream_generator = ChatRestService.send_message_streaming(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        
        return StreamingResponse(
            stream_generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"레스토랑 스트리밍 오류: {str(e)}")


# ===== 🎤 K-Contents 전용 별칭 엔드포인트 =====

@router.post("/chat/kcontents/send")
async def send_kcontent_message(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🎬 K-Contents 전용 별칭 엔드포인트
    실제로는 통합 서비스를 호출
    """
    try:
        result = ChatIntegratedService.send_message(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"K-Content 채팅 오류: {str(e)}")


@router.post("/chat/kcontents/send/stream")
async def send_kcontent_message_streaming(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🌊 K-Contents 전용 별칭 엔드포인트 - Streaming
    실제로는 통합 서비스를 호출
    """
    try:
        stream_generator = ChatIntegratedService.send_message_streaming(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        
        return StreamingResponse(
            stream_generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"K-Content 스트리밍 오류: {str(e)}")


# ===== 📜 대화 히스토리 조회 =====

@router.get("/chat/history")
async def get_conversation_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """사용자의 대화 히스토리 조회"""
    try:
        history = ChatIntegratedService.get_conversation_history(
            db=db,
            user_id=current_user['user_id'],
            limit=limit
        )
        
        return {
            "conversations": history,
            "total": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"히스토리 조회 오류: {str(e)}")