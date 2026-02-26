"""
Redis 기반 대화 히스토리 관리
- 사용자별 최근 대화를 Redis에 저장
- GPT 호출 시 이전 대화 컨텍스트로 활용
- TTL: 1시간 (마지막 대화로부터 1시간 후 자동 삭제)
"""
import redis
import json
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

HISTORY_TTL = 3600   # 1시간
MAX_TURNS = 5        # 최근 5턴 (질문+답변 쌍)


class ChatHistoryManager:

    @staticmethod
    def _key(user_id: int) -> str:
        return f"chat:history:{user_id}"

    @staticmethod
    def get_history(user_id: int) -> list[dict]:
        """Redis에서 대화 히스토리 가져오기 (OpenAI messages 형식)"""
        data = redis_client.get(ChatHistoryManager._key(user_id))
        return json.loads(data) if data else []

    @staticmethod
    def add_turn(user_id: int, question: str, answer: str):
        """대화 1턴 추가 후 저장"""
        key = ChatHistoryManager._key(user_id)
        history = ChatHistoryManager.get_history(user_id)

        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer})

        # 최근 MAX_TURNS턴만 유지 (오래된 것 제거)
        history = history[-(MAX_TURNS * 2):]

        redis_client.setex(key, HISTORY_TTL, json.dumps(history, ensure_ascii=False))

    @staticmethod
    def build_messages(user_id: int, prompt: str) -> list[dict]:
        """히스토리 + 현재 프롬프트를 합친 messages 리스트 반환"""
        history = ChatHistoryManager.get_history(user_id)
        return history + [{"role": "user", "content": prompt}]

    @staticmethod
    def clear(user_id: int):
        """대화 히스토리 초기화"""
        redis_client.delete(ChatHistoryManager._key(user_id))
