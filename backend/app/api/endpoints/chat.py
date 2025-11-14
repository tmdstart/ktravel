# app/api/endpoints/chat.py
"""
채팅 API 엔드포인트 (ORM 버전) - 축제 검색 기능 포함
🌊 Streaming 지원 추가!
✅ 질문 타입별 처리 추가 (비교, 조언, 랜덤, 장소검색)
🍽️ Restaurant 전용 라우팅 추가!
🎬 K-Contents 전용 라우팅 추가!
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.services.chat_service import ChatService
from app.services.chat_rest import ChatRestService  # 🍽️
from app.services.chat_kcontents import ChatKContentsService  # 🎬 새로 추가
from app.schemas import ChatMessage
from app.core.deps import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

# ===== 기존 K-pop Lumi 서비스 (Festival + Attraction) =====

@router.post("/send")
async def send_message(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GPT에게 메시지 전송 - 일반 방식 (기존)
    K-pop Demon Hunters Lumi 서비스 (Festival + Attraction)
    
    응답 형식:
    {
        "response": "GPT 응답",
        "convers_id": 123,
        "extracted_destinations": [],
        "results": [...],
        "festivals": [...],
        "attractions": [...],
        "has_festivals": true,
        "has_attractions": true,
        "map_markers": [...]
    }
    """
    try:
        result = ChatService.send_message(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 오류: {str(e)}")


@router.post("/send/stream")
async def send_message_streaming(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🌊 GPT에게 메시지 전송 - Streaming 방식 (기존)
    K-pop Demon Hunters Lumi 서비스 (Festival + Attraction)
    
    실시간으로 응답이 타이핑되는 것처럼 보임!
    체감 속도: 0.5초로 느껴짐
    
    응답 형식 (Server-Sent Events):
    data: {"type": "searching", "message": "검색 중..."}
    data: {"type": "found", "title": "남산타워"}
    data: {"type": "generating", "message": "Lumi 응답 생성 중..."}
    data: {"type": "chunk", "content": "Hey "}
    data: {"type": "chunk", "content": "Hunters! "}
    data: {"type": "done", "full_response": "...", "result": {...}}
    """
    try:
        # 🎯 서비스 레이어로 완전히 위임
        stream_generator = ChatService.send_message_streaming(
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
        raise HTTPException(status_code=500, detail=f"스트리밍 오류: {str(e)}")


# ===== 🍽️ Restaurant 서비스 =====

@router.post("/restaurant/send")
async def send_restaurant_message(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🍽️ 레스토랑 메시지 전송 - 일반 방식
    순수 음식점 정보 서비스 (Restaurant Only, No K-pop Character)
    
    응답 형식:
    {
        "response": "음식점 정보 응답",
        "convers_id": 123,
        "restaurants": [...],
        "has_restaurants": true,
        "map_markers": [...]
    }
    """
    try:
        result = ChatRestService.send_message(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"레스토랑 채팅 오류: {str(e)}")


@router.post("/restaurant/send/stream")
async def send_restaurant_message_streaming(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🌊🍽️ 레스토랑 메시지 전송 - Streaming 방식
    순수 음식점 정보 서비스 (Restaurant Only, No K-pop Character)
    
    응답 형식 (Server-Sent Events):
    data: {"type": "searching", "message": "맛집 검색 중..."}
    data: {"type": "found", "title": "진주집 여의도점"}
    data: {"type": "generating", "message": "맛집 정보 준비 중..."}
    data: {"type": "chunk", "content": "이 "}
    data: {"type": "chunk", "content": "음식점은 "}
    data: {"type": "done", "full_response": "...", "result": {...}}
    """
    try:
        # 🎯 레스토랑 서비스 레이어로 완전히 위임
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


# ===== 🎬 K-Contents 서비스 (NEW!) =====

@router.post("/kcontents/send")
async def send_kcontent_message(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🎬 K-Drama/K-Content 메시지 전송 - 일반 방식 (NEW!)
    K-Drama 촬영지 정보 서비스 (K-Contents Only)
    
    응답 형식:
    {
        "response": "K-Drama 촬영지 정보 응답",
        "convers_id": 123,
        "kcontents": [...],
        "has_kcontents": true,
        "map_markers": [...]
    }
    """
    try:
        result = ChatKContentsService.send_message(
            db=db,
            user_id=current_user['user_id'],
            message=request.message
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"K-Content 채팅 오류: {str(e)}")


@router.post("/kcontents/send/stream")
async def send_kcontent_message_streaming(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🌊🎬 K-Drama/K-Content 메시지 전송 - Streaming 방식 (NEW!)
    K-Drama 촬영지 정보 서비스 (K-Contents Only)
    
    응답 형식 (Server-Sent Events):
    data: {"type": "searching", "message": "🔍 K-Drama 촬영지 검색 중..."}
    data: {"type": "found", "title": "사랑의 불시착 - 북촌 한옥마을"}
    data: {"type": "generating", "message": "🎬 K-Drama 정보 준비 중..."}
    data: {"type": "chunk", "content": "OMG! "}
    data: {"type": "chunk", "content": "This is "}
    data: {"type": "done", "full_response": "...", "result": {...}}
    """
    try:
        # 🎯 K-Contents 서비스 레이어로 완전히 위임
        stream_generator = ChatKContentsService.send_message_streaming(
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


# ===== 대화 히스토리 조회 (공통) =====

@router.get("/history")
async def get_conversation_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """
    사용자의 대화 히스토리 조회
    모든 서비스의 대화 히스토리를 한 번에 가져옴
    """
    try:
        # 기존 서비스 사용 (모든 서비스가 같은 Conversation 테이블 사용)
        history = ChatService.get_conversation_history(
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