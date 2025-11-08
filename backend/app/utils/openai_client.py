"""
OpenAI API 클라이언트
"""
from openai import OpenAI
from app.core.config import settings

# OpenAI 클라이언트 초기화
client = OpenAI(api_key=settings.OPENAI_API_KEY)

def chat_with_gpt(messages: list, model: str = None) -> str:
    """
    GPT와 채팅
    
    Args:
        messages: 대화 메시지 리스트 [{"role": "user", "content": "..."}]
        model: 사용할 모델 (기본값: settings.OPENAI_MODEL)
    
    Returns:
        GPT 응답 텍스트
    """
    if model is None:
        model = settings.OPENAI_MODEL
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    except Exception as e:
        raise Exception(f"OpenAI API 오류: {str(e)}")


def extract_destinations_from_text(text: str) -> list:
    """
    텍스트에서 여행지 추출
    
    Args:
        text: 사용자 메시지
    
    Returns:
        추출된 여행지 리스트
    """
    from app.utils.prompts import DESTINATION_EXTRACTION_PROMPT
    
    messages = [
        {"role": "system", "content": DESTINATION_EXTRACTION_PROMPT},
        {"role": "user", "content": text}
    ]
    
    try:
        response = chat_with_gpt(messages)
        
        # JSON 파싱 시도
        import json
        result = json.loads(response)
        destinations = result.get("destinations", [])
        
        # 빈 문자열이나 None 제거
        destinations = [d.strip() for d in destinations if d and d.strip()]
        
        return destinations
    
    except json.JSONDecodeError:
        # JSON 파싱 실패 시 빈 리스트 반환
        return []
    except Exception as e:
        print(f"여행지 추출 오류: {str(e)}")
        return []
