# app/utils/kcontents_search_utils.py - K-Pop 통합 서비스용 강화 버전

from typing import Dict, Any, List
import re

def preprocess_query(query: str) -> str:
    """검색 전 쿼리 정리 (불용어 제거)"""
    # 기존 로직 유지
    stopwords = {"a", "an", "the", "in", "at", "on", "me", "to", "introduce", "tell", "show", "explain", "describe"}
    words = [w for w in query.lower().split() if w not in stopwords]
    cleaned_query = " ".join(words)
    print(f"🔧 쿼리 정리: '{query}' → '{cleaned_query}'")
    return cleaned_query if cleaned_query else query

def normalize_query(query: str) -> str:
    """검색어를 정규화하여 더 정확한 매칭 (K-Pop, Restaurant 지원 추가)"""
    # ✨ K-Pop 및 레스토랑 관련 보정 추가
    corrections = {
        # K-Drama (기존)
        "crash landing on you": "사랑의 불시착",
        "itaewon class": "이태원 클라쓰",
        "goblin": "도깨비",
        # K-Pop 관련 추가
        "bts": "방탄소년단",
        "blackpink": "블랙핑크",
        "exo": "엑소",
        "nct": "엔시티",
        "jyp": "JYP 엔터테인먼트",
        "sm": "SM 엔터테인먼트",
        "yg": "YG 엔터테인먼트",
        "hybe": "하이브",
        # 레스토랑 관련 추가
        "korean bbq": "korean barbecue restaurant",
        "korean food": "korean restaurant",
        "chinese food": "chinese restaurant",
        "japanese food": "japanese restaurant",
        "hongdae food": "hongik university restaurant",
    }
    
    query_lower = query.lower()
    for eng, kor in corrections.items():
        if eng in query_lower:
            query = query.replace(eng, kor)
            print(f"🔧 검색어 보정: '{eng}' → '{kor}'")
    
    return query

def expand_search_terms(query: str) -> List[str]:
    """검색어를 자동으로 확장 (통합 서비스용)"""
    variants = [query]
    query_lower = query.lower()
    
    # 🔍 장소/촬영지 관련 확장 (기존 로직 유지)
    if "filming" in query_lower or "location" in query_lower:
        variants.append(query.replace("filming location", "촬영지"))
        variants.append(query.replace("location", "장소"))
        
    # 🍽️ 음식/식당 관련 확장 추가
    if "restaurant" in query_lower or "food" in query_lower:
        variants.append(query.replace("restaurant", "맛집"))
        variants.append(query.replace("food", "음식"))
        
    return list(set(variants))

def calculate_keyword_overlap(query: str, title: str) -> float:
    """키워드 겹치는 정도 계산"""
    query_words = set(query.lower().split())
    title_words = set(title.lower().split())
    
    overlap = len(query_words & title_words)
    total = len(query_words | title_words)
    
    return overlap / total if total > 0 else 0

def extract_keyword_simple(message: str) -> str:
    """단순 키워드 추출 (GPT 없이)"""
    remove_words = [
        'introduce', 'introduco', 'tell me about', 'what is', 'where is',
        'about', 'the', 'a', 'an', 'me', 'filming', 'location', 'restaurant', 'food', 'spot'
    ]
    
    keyword = message.lower()
    for word in remove_words:
        keyword = keyword.replace(word, ' ')
    
    keyword = ' '.join(keyword.split())
    
    if len(keyword.strip()) < 2:
        keyword = message
        
    return keyword.strip()

def analyze_message_fast(message: str) -> Dict[str, Any]:
    """초고속 키워드 분석 - 통합 서비스용 질문 타입 자동 분류"""
    try:
        message_lower = message.lower().strip()
        
        # ----------------------------------------------------
        # 🎭 K-Content/K-Pop 키워드 (조기 분류를 위해 먼저 정의)
        # ----------------------------------------------------
        kpop_keywords = [
            'drama', 'kdrama', '드라마', '촬영지', 'k-pop', 'idol', '아이돌', '연예인', 
            'agency', '소속사', '콘서트', 'concert'
        ]
        has_kpop_keyword = any(kw in message_lower for kw in kpop_keywords)

        # 🍽️ 레스토랑 키워드 추가 (조기 분류를 위해 먼저 정의)
        restaurant_keywords = ['restaurant', 'food', 'eat', 'dining', 'meal', 'cuisine', 'dish', '레스토랑', '음식', '맛집']
        has_restaurant_keyword = any(kw in message_lower for kw in restaurant_keywords)
        
        print(f"\n🔍 질문 분석 시작: '{message}'")
        
        # ----------------------------------------------------
        # 🆕 1. 비검색/일반 대화 및 모호한 질문 처리 (최우선 순위) 💡
        # ----------------------------------------------------
        
        # 1-1. 자기소개 질문 감지
        who_are_you_patterns = ['who are you', '너 누구니', '자기소개', 'introduce yourself', '소개해 줘']
        if any(p in message_lower for p in who_are_you_patterns):
            print("  ✅ 자기소개 질문 감지")
            return {"type": "self_introduction", "keyword": message, "count": None}

        # 1-2. 인삿말/감사/짧은 대화 감지
        greeting_patterns = ['hi', 'hello', '안녕', 'ㅎㅇ', '하이', '감사', '고마워', '고맙', '좋아']
        
        # 쿼리가 4단어 이하의 짧은 대화이거나 명백한 인삿말/감사 표현일 경우
        is_short_query = len(message_lower.split()) <= 4
        if any(p in message_lower for p in greeting_patterns) or is_short_query:
            # 단, 이 짧은 쿼리가 특정 검색 키워드(예: "JYP 어디야")를 포함하지 않을 때만 일반 대화로 분류
            if not has_kpop_keyword and not has_restaurant_keyword:
                print("  ✅ 인삿말/짧은 대화 감지 (일반 대화로 분류)")
                return {"type": "general_conversation", "keyword": message, "count": None}

        # === 수량 추출 === (기존 로직 유지)
        number_patterns = [
            r'(\d+)곳', r'(\d+)개', r'(\d+)가지',
            r'(\d+)\s*places?', r'(\d+)\s*spots?', r'(\d+)\s*locations?'
        ]
        
        extracted_count = None
        for pattern in number_patterns:
            match = re.search(pattern, message_lower)
            if match:
                extracted_count = int(match.group(1))
                print(f"  ✅ 수량 발견: {extracted_count}개")
                break
        
        # === 비교 질문 감지 === (기존 로직 유지)
        comparison_patterns = [
            ' vs ', 'vs.', ' versus ', 'which one', 'which is better', 'compare'
        ]
        for pattern in comparison_patterns:
            if pattern in message_lower:
                return {
                    "type": "comparison",
                    "keyword": message,
                    "count": extracted_count
                }
        
        # === 일반 조언/팁 질문 감지 === (기존 로직 유지)
        advice_patterns = [
            'tip', 'tips', 'advice', '팁', '조언', 'how to', '어떻게', '방법',
            'what should i know', '알아야', '준비', 'etiquette', '에티켓', 'visit', '방문'
        ]
        has_advice_keyword = any(kw in message_lower for kw in advice_patterns)
        
        # ✨ 주변 검색 요청 감지 (Geo-Filter 트리거)
        if (has_restaurant_keyword or has_kpop_keyword) and ('근처' in message_lower or 'near' in message_lower or '주변' in message_lower):
            print("  ✅ 주변/연계 검색 요청 감지 (Geo-Filter 가능)")
            return {
                "type": "proximity_search", # 새로운 타입 정의
                "keyword": message,
                "count": extracted_count
            }

        # 💡 일반 조언/팁 질문 (장소 키워드 없이 조언 키워드만 있을 때)
        if has_advice_keyword and not (has_kpop_keyword or has_restaurant_keyword):
            return {
                "type": "general_advice",
                "keyword": message,
                "count": extracted_count
            }
        
        # === 추천 질문 감지 === (기존 로직 유지)
        recommendation_patterns = [
            'recommend', 'suggestion', 'suggest', '추천',
            'best', 'top', 'popular', '인기'
        ]
        has_recommendation = any(kw in message_lower for kw in recommendation_patterns)
        
        if has_recommendation or extracted_count:
            return {
                "type": "random_recommendation",
                "keyword": message,
                "count": extracted_count or 10
            }wq
            
        
        # ----------------------------------------------------
        # 3. 특정 DB 검색 (정확한 키워드가 있을 경우) 🔍
        # ----------------------------------------------------
        keyword = extract_keyword_simple(message)
        
        if has_kpop_keyword:
            print("  🔍 K-Content/K-Pop 검색 요청 감지")
            return {"type": "kcontent_search", "keyword": keyword, "count": extracted_count}
        elif has_restaurant_keyword:
            print("  🔍 Restaurant/Food 검색 요청 감지")
            return {"type": "restaurant_search", "keyword": keyword, "count": extracted_count}
        else:
            # 🎯 최종 Fallback: 위 모든 비검색/구체적 검색 조건에 해당하지 않을 경우
            #   -> DB 검색이 불필요한 '일반 대화'로 판단하여 GPT 기본 지식으로 응답하도록 유도합니다.
            if len(keyword) < 3: # 키워드가 너무 짧으면 일반 대화로 처리
                print("  💬 특정 키워드 부재/모호: 일반 대화 (General Conversation)로 분류")
                return {"type": "general_conversation", "keyword": message, "count": extracted_count}
            
            # 드라마/음식 키워드가 없지만 검색 의도가 있다고 가정하고 Entertainment로 분류 (기존 로직 유지)
            return {"type": "entertainment_search", "keyword": keyword, "count": extracted_count}
        
    except Exception as e:
        print(f"❌ 키워드 추출 오류: {e}")
        # 오류 발생 시 안전하게 일반 대화로 폴백
        return {"type": "general_conversation", "keyword": message, "count": None}