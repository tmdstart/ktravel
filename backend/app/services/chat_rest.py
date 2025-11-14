# app/services/chat_rest.py
"""
🍽️ 통합 채팅 서비스 (Restaurant + Festival + Attraction)
- K-pop Lumi 캐릭터 없음 (순수 정보 제공)
- 3-way 병렬 검색
- prompt2.py 사용 (영어, 전문가/친절 톤)
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import json
import os
import random
import re
import asyncio
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from concurrent.futures import ThreadPoolExecutor

from app.models.conversation import Conversation  
from app.utils.openai_client import chat_with_gpt, chat_with_gpt_stream
from app.utils.prompt2 import (
    # Restaurant prompts (전문가 톤)
    RESTAURANT_QUICK_PROMPT,
    RESTAURANT_COMPARISON_PROMPT,
    RESTAURANT_ADVICE_PROMPT,
    # Festival prompts (친절한 안내)
    FESTIVAL_QUICK_PROMPT,
    FESTIVAL_COMPARISON_PROMPT,
    FESTIVAL_ADVICE_PROMPT,
    # Attraction prompts (친절한 안내)
    ATTRACTION_QUICK_PROMPT,
    ATTRACTION_COMPARISON_PROMPT,
    ATTRACTION_ADVICE_PROMPT,
    # General prompts
    GENERAL_COMPARISON_PROMPT,
    GENERAL_ADVICE_PROMPT
)

class ChatRestService:
    
    # 🎯 Qdrant 설정 (3개 컬렉션 모두 사용)
    QDRANT_URL = "http://172.17.0.1:6333"
    FESTIVAL_COLLECTION = "seoul-festival"
    ATTRACTION_COLLECTION = "seoul-attraction"
    RESTAURANT_COLLECTION = "seoul-restaurant"
    
    # 🚀 임베딩 모델 캐싱 (재사용)
    _embedding_model = None
    
    # 🚀 Qdrant 클라이언트 캐싱 (재사용)
    _qdrant_client = None
    
    @staticmethod
    def _get_embedding_model():
        """임베딩 모델 싱글톤 패턴으로 재사용"""
        if ChatRestService._embedding_model is None:
            ChatRestService._embedding_model = OpenAIEmbeddings(model="text-embedding-ada-002")
        return ChatRestService._embedding_model
    
    @staticmethod
    def _get_qdrant_client():
        """Qdrant 클라이언트 싱글톤 패턴으로 재사용"""
        if ChatRestService._qdrant_client is None:
            ChatRestService._qdrant_client = QdrantClient(
                url=ChatRestService.QDRANT_URL,
                timeout=60,
                prefer_grpc=False
            )
        return ChatRestService._qdrant_client
    
    # ===== 🔧 검색어 개선 기능 =====
    
    @staticmethod
    def _preprocess_query(query: str) -> str:
        """검색 전 쿼리 정리"""
        
        # 1. 불용어 제거
        stopwords = {"a", "an", "the", "in", "at", "on", "me", "to", "introduce", "tell", "show", "explain", "describe"}
        words = [w for w in query.lower().split() if w not in stopwords]
        
        # 2. 재조합
        cleaned_query = " ".join(words)
        
        print(f"🔧 쿼리 정리: '{query}' → '{cleaned_query}'")
        return cleaned_query if cleaned_query else query
    
    @staticmethod
    def _normalize_query(query: str) -> str:
        """검색어를 정규화하여 더 정확한 매칭 (통합 버전)"""
        
        # 통합 보정 규칙
        corrections = {
            # 일반 장소명
            "namsan tower": "namsan seoul tower",
            "n tower": "namsan seoul tower", 
            "seoul tower": "namsan seoul tower",
            "63 building": "63빌딩",
            "lotte tower": "lotte world tower",
            "dongdaemun": "dongdaemun design plaza",
            "myeongdong": "myeongdong shopping street",
            "gangnam": "gangnam district",
            "hongdae": "hongik university area",
            "bukchon": "bukchon hanok village",
            "insadong": "insadong cultural street",
            "itaewon": "itaewon global village",
            
            # 음식 종류
            "korean bbq": "korean barbecue",
            "korean food": "korean restaurant",
            "chinese food": "chinese restaurant", 
            "japanese food": "japanese restaurant",
            "italian food": "italian restaurant",
            
            # 지역명 + 음식점
            "hongdae food": "hongik university restaurant",
            "hongdae food scene": "hongik university dining",
            "gangnam food": "gangnam district restaurant", 
            "gangnam korean bbq": "gangnam barbecue",
            "myeongdong food": "myeongdong restaurant",
            "itaewon food": "itaewon international restaurant",
            "itaewon restaurants": "itaewon global dining",
            "insadong food": "insadong traditional restaurant",
            "yeouido food": "yeouido business district restaurant",
        }
        
        query_lower = query.lower()
        
        for wrong, correct in corrections.items():
            if wrong in query_lower:
                query = query.replace(wrong, correct)
                print(f"🔧 검색어 보정: '{wrong}' → '{correct}'")
        
        return query
    
    @staticmethod
    def _expand_search_terms(query: str) -> List[str]:
        """검색어를 자동으로 확장 (통합 버전)"""
        
        variants = [query]
        
        # 자동 변형 규칙들
        query_lower = query.lower()
        
        # 서울 추가
        if "seoul" not in query_lower and len(query.split()) <= 2:
            variants.append(f"{query} seoul")
            variants.append(f"seoul {query}")
        
        # 일반 장소 관련 변형
        if "tower" in query_lower:
            variants.append(query.replace("tower", "타워").replace("Tower", "타워"))
        if "palace" in query_lower:
            variants.append(query.replace("palace", "궁").replace("Palace", "궁"))
        if "temple" in query_lower:
            variants.append(query.replace("temple", "사").replace("Temple", "사"))
        if "market" in query_lower:
            variants.append(query.replace("market", "시장").replace("Market", "시장"))
        if "park" in query_lower:
            variants.append(query.replace("park", "공원").replace("Park", "공원"))
        
        # 음식점 관련 변형
        if "restaurant" in query_lower:
            variants.append(query.replace("restaurant", "맛집").replace("Restaurant", "맛집"))
        if "food" in query_lower:
            variants.append(query.replace("food", "음식").replace("Food", "음식"))
        
        return list(set(variants))  # 중복 제거
    
    @staticmethod
    def _calculate_keyword_overlap(query: str, title: str) -> float:
        """키워드 겹치는 정도 계산"""
        query_words = set(query.lower().split())
        title_words = set(title.lower().split())
        
        overlap = len(query_words & title_words)
        total = len(query_words | title_words)
        
        return overlap / total if total > 0 else 0
    
    @staticmethod
    def _improved_search(query: str, search_type: str = "attraction") -> Dict[str, Any]:
        """🔧 현실적으로 개선된 검색 (통합 버전)"""
        
        try:
            print(f"🔍 개선된 검색 시작: '{query}' (타입: {search_type})")
            
            # 1. 쿼리 전처리 (불용어 제거)
            cleaned_query = ChatRestService._preprocess_query(query)
            
            # 2. 검색어 정규화
            normalized_query = ChatRestService._normalize_query(cleaned_query)
            
            # 3. 검색어 확장
            search_variants = ChatRestService._expand_search_terms(normalized_query)
            print(f"🔧 검색 변형들: {search_variants}")
            
            # 4. 모든 변형으로 검색
            best_result = None
            best_score = 0
            
            qdrant_client = ChatRestService._get_qdrant_client()
            embedding_model = ChatRestService._get_embedding_model()
            
            # 🎯 컬렉션 선택
            if search_type == "restaurant":
                collection_name = ChatRestService.RESTAURANT_COLLECTION
            elif search_type == "festival":
                collection_name = ChatRestService.FESTIVAL_COLLECTION
            else:
                collection_name = ChatRestService.ATTRACTION_COLLECTION
            
            for variant in search_variants:
                try:
                    query_embedding = embedding_model.embed_query(variant)
                    
                    search_results = qdrant_client.search(
                        collection_name=collection_name,
                        query_vector=query_embedding,
                        limit=5,
                        score_threshold=0.3,  # 낮은 임계값으로 더 많은 결과
                        with_payload=True,
                        with_vectors=False
                    )
                    
                    for result in search_results:
                        # Vector 유사도 + 키워드 매칭 점수
                        vector_score = result.score
                        
                        # 타입별로 제목 추출
                        if search_type == "restaurant":
                            metadata = result.payload.get("metadata", {})
                            title = metadata.get("name", "")
                        elif search_type == "festival":
                            metadata = result.payload.get("metadata", {})
                            title = metadata.get("title", "")
                        else:  # attraction
                            metadata = result.payload.get("metadata", {})
                            title = metadata.get("title", "")
                            
                        keyword_score = ChatRestService._calculate_keyword_overlap(cleaned_query, title)
                        combined_score = vector_score * 0.8 + keyword_score * 0.2
                        
                        if combined_score > best_score:
                            best_score = combined_score
                            best_result = result
                            print(f"✅ 더 좋은 결과: '{variant}' → 점수: {combined_score:.3f}")
                
                except Exception as e:
                    print(f"⚠️ 변형 '{variant}' 검색 실패: {e}")
                    continue
            
            # 5. 결과 반환 (임계값 0.5)
            if best_result and best_score > 0.5:
                return best_result
            else:
                print(f"❌ 유효한 결과 없음 (최고 점수: {best_score:.3f})")
                return None
                
        except Exception as e:
            print(f"❌ 개선된 검색 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    # ===== 🍽️📍🎭 검색 함수들 =====
    
    @staticmethod
    def _search_best_restaurant(keyword: str) -> Dict[str, Any]:
        """🍽️ 레스토랑 벡터 검색"""
        try:
            print(f"🍽️ 레스토랑 검색: '{keyword}'")
            
            result = ChatRestService._improved_search(keyword, search_type="restaurant")
            
            if not result:
                print(f"🔍 레스토랑 검색 결과 없음: '{keyword}'")
                return None
            
            # metadata에서 데이터 추출
            metadata = result.payload.get("metadata", {})
            page_content = result.payload.get("page_content", "")
            
            formatted_data = {
                "id": str(metadata.get("restaurant_id", "")),
                "restaurant_name": metadata.get("name", ""),
                "place": metadata.get("place", ""),
                "place_en": metadata.get("place", ""),
                "subway": metadata.get("subway", ""),
                "description": page_content[:200] if page_content else "",
                "latitude": float(metadata.get("latitude", 0)),
                "longitude": float(metadata.get("longitude", 0)),
                "similarity_score": result.score,
                "type": "restaurant"
            }
            
            print(f"🎯 레스토랑 검색 성공: '{formatted_data['restaurant_name']}' (유사도: {result.score:.3f})")
            return formatted_data
            
        except Exception as e:
            print(f"레스토랑 검색 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def _search_best_festival(keyword: str) -> Dict[str, Any]:
        """🎭 축제 벡터 검색"""
        try:
            print(f"🎭 축제 검색: '{keyword}'")
            
            result = ChatRestService._improved_search(keyword, search_type="festival")
            
            if not result:
                print(f"🔍 축제 검색 결과 없음: '{keyword}'")
                return None
            
            festival_data = result.payload.get("metadata", {})
            
            formatted_data = {
                "festival_id": festival_data.get("festival_id", festival_data.get("row")),
                "title": festival_data.get("title", ""),
                "filter_type": festival_data.get("filter_type", ""), 
                "start_date": festival_data.get("start_date", ""),
                "end_date": festival_data.get("end_date", ""),
                "image_url": festival_data.get("image_url", ""),
                "detail_url": festival_data.get("detail_url", ""),
                "latitude": float(festival_data.get("latitude", 0)) if festival_data.get("latitude") else 0.0,
                "longitude": float(festival_data.get("longitude", 0)) if festival_data.get("longitude") else 0.0,
                "description": festival_data.get("description", ""),
                "similarity_score": result.score,
                "type": "festival"
            }
            
            print(f"🎯 축제 검색 성공: '{formatted_data['title']}' (유사도: {result.score:.3f})")
            return formatted_data
            
        except Exception as e:
            print(f"축제 검색 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def _search_best_attraction(keyword: str) -> Dict[str, Any]:
        """📍 관광명소 벡터 검색"""
        try:
            print(f"📍 관광명소 검색: '{keyword}'")
            
            result = ChatRestService._improved_search(keyword, search_type="attraction")
            
            if not result:
                print(f"🔍 관광명소 검색 결과 없음: '{keyword}'")
                return None
            
            attraction_data = result.payload.get("metadata", {})
            
            formatted_data = {
                "attr_id": attraction_data.get("attr_id", ""),
                "title": attraction_data.get("title", ""),
                "url": attraction_data.get("url", ""),
                "description": attraction_data.get("description", ""),
                "phone": attraction_data.get("phone", ""),
                "hours_of_operation": attraction_data.get("hours_of_operation", "Operating hours not available"),
                "holidays": attraction_data.get("holidays", ""),
                "address": attraction_data.get("address", ""),
                "transportation": attraction_data.get("transportation", ""),
                "image_urls": attraction_data.get("image_urls", []),
                "image_count": attraction_data.get("image_count", 0),
                "latitude": float(attraction_data.get("latitude", 0)),
                "longitude": float(attraction_data.get("longitude", 0)),
                "attr_code": attraction_data.get("attr_code", ""),
                "similarity_score": result.score,
                "type": "attraction"
            }
            
            print(f"🎯 관광명소 검색 성공: '{formatted_data['title']}' (유사도: {result.score:.3f})")
            return formatted_data
            
        except Exception as e:
            print(f"관광명소 검색 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    # ===== 메인 메시지 처리 함수 =====
    
    @staticmethod
    def send_message(db: Session, user_id: int, message: str) -> Dict[str, Any]:
        """
        🚀 통합 메시지 처리 - Festival + Attraction + Restaurant
        """
        import time
        
        try:
            total_start = time.time()
            
            print(f"🌐 통합 서비스 요청: '{message}'")
            
            # 🚀 1. 빠른 키워드 추출 + 질문 타입 분류
            step_start = time.time()
            analysis = ChatRestService._analyze_message_fast(message)
            print(f"⏱️ 1. 키워드 추출: {time.time() - step_start:.3f}초")
            
            question_type = analysis.get('type', 'place_search')
            keyword = analysis.get('keyword', message)
            is_random = analysis.get('is_random_recommendation', False)
            
            # 🍽️ 레스토랑 관련 키워드 감지
            is_restaurant_query = ChatRestService._is_restaurant_query(message)
            
            # ===== 질문 타입별 처리 =====
            
            # 🤔 비교 질문 처리
            if question_type == "comparison":
                print(f"🤔 비교 질문 감지 → GPT 직접 처리")
                
                # 레스토랑 비교인지 일반 비교인지 구분
                if is_restaurant_query:
                    prompt = RESTAURANT_COMPARISON_PROMPT.format(message=message)
                else:
                    prompt = GENERAL_COMPARISON_PROMPT.format(message=message)
                
                ai_response = chat_with_gpt(
                    [{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.7
                )
                
                conversation = Conversation(
                    user_id=user_id,
                    question=message,
                    response=ai_response
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                print(f"⏱️ 총 소요 시간: {time.time() - total_start:.3f}초\n")
                
                return {
                    "response": ai_response,
                    "convers_id": conversation.convers_id,
                    "restaurants": [],
                    "festivals": [],
                    "attractions": [],
                    "has_restaurants": False,
                    "has_festivals": False,
                    "has_attractions": False,
                    "map_markers": []
                }
            
            # 💡 일반 조언/팁 질문 처리
            elif question_type == "general_advice":
                print(f"💡 조언 질문 감지 → GPT 직접 처리")
                
                # 레스토랑 조언인지 일반 조언인지 구분
                if is_restaurant_query:
                    prompt = RESTAURANT_ADVICE_PROMPT.format(message=message)
                else:
                    prompt = GENERAL_ADVICE_PROMPT.format(message=message)
                
                ai_response = chat_with_gpt(
                    [{"role": "user", "content": prompt}],
                    max_tokens=350,
                    temperature=0.7
                )
                
                conversation = Conversation(
                    user_id=user_id,
                    question=message,
                    response=ai_response
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                print(f"⏱️ 총 소요 시간: {time.time() - total_start:.3f}초\n")
                
                return {
                    "response": ai_response,
                    "convers_id": conversation.convers_id,
                    "restaurants": [],
                    "festivals": [],
                    "attractions": [],
                    "has_restaurants": False,
                    "has_festivals": False,
                    "has_attractions": False,
                    "map_markers": []
                }
            
            # 🎯 랜덤 추천 처리
            elif is_random or question_type == "random_recommendation":
                print(f"🎯 추천 질문 감지 → 수량 기반 추천")
                
                count = analysis.get('count', 10)
                random_attractions = ChatRestService._get_random_attractions(count=count)
                
                ai_response = ChatRestService._generate_random_response(random_attractions)
                
                conversation = Conversation(
                    user_id=user_id,
                    question=message,
                    response=ai_response
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                print(f"⏱️ 총 소요 시간: {time.time() - total_start:.3f}초\n")
                
                return {
                    "response": ai_response,
                    "convers_id": conversation.convers_id,
                    "results": random_attractions,
                    "festivals": [],
                    "attractions": random_attractions,
                    "restaurants": [],
                    "has_festivals": False,
                    "has_attractions": len(random_attractions) > 0,
                    "has_restaurants": False,
                    "map_markers": ChatRestService._create_map_markers(random_attractions)
                }
            
            # 🚀 특정 장소 검색 (기본 동작 - 3-way 병렬 검색)
            else:
                # 🚀 2. Festival + Attraction + Restaurant 3-way 병렬 검색
                step_start = time.time()
                
                with ThreadPoolExecutor(max_workers=3) as executor:
                    festival_future = executor.submit(ChatRestService._search_best_festival, keyword)
                    attraction_future = executor.submit(ChatRestService._search_best_attraction, keyword)
                    restaurant_future = executor.submit(ChatRestService._search_best_restaurant, keyword)
                    
                    festival = festival_future.result()
                    attraction = attraction_future.result()
                    restaurant = restaurant_future.result()
                
                print(f"⏱️ 2. 3-way 병렬 검색: {time.time() - step_start:.3f}초")
                
                # 결과 수집
                results = []
                if festival:
                    festival['type'] = 'festival'
                    results.append(festival)
                if attraction:
                    attraction['type'] = 'attraction'
                    results.append(attraction)
                if restaurant:
                    restaurant['type'] = 'restaurant'
                    results.append(restaurant)
                
                # 유사도 높은 것 1개만 선택
                if results:
                    results.sort(key=lambda x: x['similarity_score'], reverse=True)
                    best_result = [results[0]]
                else:
                    best_result = []
                
                # 🚀 3. 응답 생성
                step_start = time.time()
                ai_response = ChatRestService._generate_final_response(message, best_result)
                print(f"⏱️ 3. 응답 생성: {time.time() - step_start:.3f}초")
                
                # 4. DB 저장
                step_start = time.time()
                conversation = Conversation(
                    user_id=user_id,
                    question=message,
                    response=ai_response
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                print(f"⏱️ 4. DB 저장: {time.time() - step_start:.3f}초")
                
                print(f"⏱️ 총 소요 시간: {time.time() - total_start:.3f}초\n")
                
                # 🗺️ 지도 마커 생성 (타입별로)
                map_markers = []
                if best_result:
                    map_markers = ChatRestService._create_map_markers(best_result)
                
                # 5. 응답 구성
                return {
                    "response": ai_response,
                    "convers_id": conversation.convers_id,
                    "results": best_result,
                    "festivals": [r for r in best_result if r.get('type') == 'festival'],
                    "attractions": [r for r in best_result if r.get('type') == 'attraction'],
                    "restaurants": [r for r in best_result if r.get('type') == 'restaurant'],
                    "has_festivals": any(r.get('type') == 'festival' for r in best_result),
                    "has_attractions": any(r.get('type') == 'attraction' for r in best_result),
                    "has_restaurants": any(r.get('type') == 'restaurant' for r in best_result),
                    "map_markers": map_markers
                }
            
        except Exception as e:
            raise Exception(f"통합 채팅 처리 중 오류 발생: {str(e)}")
    
    @staticmethod
    async def send_message_streaming(db: Session, user_id: int, message: str):
        """
        🌊 통합 스트리밍 메시지 처리 - 제너레이터 반환
        """
        try:
            # 🚀 1. 질문 타입 분석
            analysis = ChatRestService._analyze_message_fast(message)
            question_type = analysis.get('type', 'place_search')
            keyword = analysis.get('keyword', message)
            is_random = analysis.get('is_random_recommendation', False)
            
            # 🍽️ 레스토랑 관련 키워드 감지
            is_restaurant_query = ChatRestService._is_restaurant_query(message)
            
            print(f"📋 스트리밍 분석: type={question_type}, keyword={keyword}, restaurant={is_restaurant_query}")
            
            # ===== 질문 타입별 처리 =====
            
            # 🤔 비교 질문 처리
            if question_type == "comparison":
                yield f"data: {json.dumps({'type': 'generating', 'message': '🤔 Comparing options...'}, ensure_ascii=False)}\n\n"
                
                # 레스토랑 비교인지 일반 비교인지 구분
                if is_restaurant_query:
                    prompt = RESTAURANT_COMPARISON_PROMPT.format(message=message)
                else:
                    prompt = GENERAL_COMPARISON_PROMPT.format(message=message)
                
                # 스트리밍 응답
                full_response = ""
                for chunk in chat_with_gpt_stream([{"role": "user", "content": prompt}], max_tokens=300, temperature=0.7):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)
                
                # 대화 저장
                conversation = Conversation(user_id=user_id, question=message, response=full_response)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id, 'restaurants': [], 'festivals': [], 'attractions': [], 'has_restaurants': False, 'has_festivals': False, 'has_attractions': False}, ensure_ascii=False)}\n\n"
                return
            
            # 💡 일반 조언/팁 질문 처리
            elif question_type == "general_advice":
                yield f"data: {json.dumps({'type': 'generating', 'message': '💡 Preparing helpful tips...'}, ensure_ascii=False)}\n\n"
                
                # 레스토랑 조언인지 일반 조언인지 구분
                if is_restaurant_query:
                    prompt = RESTAURANT_ADVICE_PROMPT.format(message=message)
                else:
                    prompt = GENERAL_ADVICE_PROMPT.format(message=message)
                
                # 스트리밍 응답
                full_response = ""
                for chunk in chat_with_gpt_stream([{"role": "user", "content": prompt}], max_tokens=350, temperature=0.7):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)
                
                # 대화 저장
                conversation = Conversation(user_id=user_id, question=message, response=full_response)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id, 'restaurants': [], 'festivals': [], 'attractions': [], 'has_restaurants': False, 'has_festivals': False, 'has_attractions': False}, ensure_ascii=False)}\n\n"
                return
            
            # 🎯 랜덤 추천 처리
            elif is_random or question_type == "random_recommendation":
                yield f"data: {json.dumps({'type': 'random', 'message': '🎲 Finding great places...'}, ensure_ascii=False)}\n\n"
                
                random_attractions = ChatRestService._get_random_attractions(count=10)
                ai_response = ChatRestService._generate_random_response(random_attractions)
                
                # 대화 저장
                conversation = Conversation(user_id=user_id, question=message, response=ai_response)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': ai_response, 'results': random_attractions, 'attractions': random_attractions, 'convers_id': conversation.convers_id, 'has_festivals': False, 'has_attractions': True, 'has_restaurants': False}, ensure_ascii=False)}\n\n"
                return
            
            # 🚀 특정 장소 검색 (기본 동작 - 3-way 병렬 검색)
            else:
                yield f"data: {json.dumps({'type': 'searching', 'message': '🔍 Searching for information...'}, ensure_ascii=False)}\n\n"
                
                # 3-way 병렬 검색
                with ThreadPoolExecutor(max_workers=3) as executor:
                    festival_future = executor.submit(ChatRestService._search_best_festival, keyword)
                    attraction_future = executor.submit(ChatRestService._search_best_attraction, keyword)
                    restaurant_future = executor.submit(ChatRestService._search_best_restaurant, keyword)
                    
                    festival = festival_future.result()
                    attraction = attraction_future.result()
                    restaurant = restaurant_future.result()
                
                # 결과 수집
                results = []
                if festival:
                    festival['type'] = 'festival'
                    results.append(festival)
                if attraction:
                    attraction['type'] = 'attraction'
                    results.append(attraction)
                if restaurant:
                    restaurant['type'] = 'restaurant'
                    results.append(restaurant)
                
                if not results:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Sorry, I couldn not find any information about that. 😅'}, ensure_ascii=False)}\n\n"
                    return
                
                # 유사도 높은 것 선택
                results.sort(key=lambda x: x['similarity_score'], reverse=True)
                result = results[0]
                
                title = result.get('title') or result.get('restaurant_name')
                yield f"data: {json.dumps({'type': 'found', 'title': title, 'result': result}, ensure_ascii=False)}\n\n"
                
                yield f"data: {json.dumps({'type': 'generating', 'message': '💫 Preparing response...'}, ensure_ascii=False)}\n\n"
                
                # 프롬프트 생성 (타입별)
                description = result.get('description', '')[:500]
                result_type = result.get('type', 'attraction')
                
                if result_type == 'festival':
                    prompt = FESTIVAL_QUICK_PROMPT.format(
                        title=title,
                        start_date=result.get('start_date', ''),
                        end_date=result.get('end_date', ''),
                        description=description,
                        message=message
                    )
                elif result_type == 'restaurant':
                    prompt = RESTAURANT_QUICK_PROMPT.format(
                        restaurant_name=result.get('restaurant_name', ''),
                        place=result.get('place', ''),
                        description=description,
                        message=message
                    )
                else:  # attraction
                    prompt = ATTRACTION_QUICK_PROMPT.format(
                        title=title,
                        address=result.get('address', ''),
                        hours_of_operation=result.get('hours_of_operation', 'Operating hours not available'),
                        description=description,
                        message=message
                    )
                
                # 스트리밍 응답
                full_response = ""
                for chunk in chat_with_gpt_stream([{"role": "user", "content": prompt}], max_tokens=250, temperature=0.6):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)
                
                # 대화 저장
                conversation = Conversation(user_id=user_id, question=message, response=full_response)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                # 지도 마커 생성
                map_markers = ChatRestService._create_map_markers([result])
                
                # 완료 메시지
                completion_data = {
                    'type': 'done',
                    'full_response': full_response,
                    'convers_id': conversation.convers_id,
                    'result': result,
                    'results': [result],
                    'festivals': [r for r in [result] if r.get('type') == 'festival'],
                    'attractions': [r for r in [result] if r.get('type') == 'attraction'],
                    'restaurants': [r for r in [result] if r.get('type') == 'restaurant'],
                    'has_festivals': result.get('type') == 'festival',
                    'has_attractions': result.get('type') == 'attraction',
                    'has_restaurants': result.get('type') == 'restaurant',
                    'map_markers': map_markers
                }
                
                yield f"data: {json.dumps(completion_data, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            print(f"❌ Streaming 오류: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
    
    # ===== 🔧 헬퍼 함수들 =====
    
    @staticmethod
    def _is_restaurant_query(message: str) -> bool:
        """메시지가 레스토랑 관련 질문인지 판단"""
        restaurant_keywords = [
            'restaurant', 'food', 'eat', 'dining', 'meal', 'cuisine', 'dish',
            '레스토랑', '음식', '먹', '식당', '맛집', '요리', '음식점'
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in restaurant_keywords)
    
    @staticmethod
    def _analyze_message_fast(message: str) -> Dict[str, Any]:
        """
        🚀 초고속 키워드 분석 - 질문 타입 자동 분류
        """
        try:
            message_lower = message.lower().strip()
            
            print(f"\n🔍 질문 분석 시작: '{message}'")
            
            # === 수량 추출 ===
            import re
            number_patterns = [
                r'(\d+)곳', r'(\d+)개', r'(\d+)가지',
                r'(\d+)\s*places?', r'(\d+)\s*spots?'
            ]
            
            extracted_count = None
            for pattern in number_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    extracted_count = int(match.group(1))
                    print(f"   ✅ 수량 발견: {extracted_count}개")
                    break
            
            # === 비교 질문 감지 ===
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
            
            # === 일반 조언/팁 질문 감지 ===
            advice_patterns = [
                'tip', 'tips', 'advice', '팁', '조언',
                'how to', '어떻게', '방법',
                'what should i know', '알아야', '준비',
                'culture', '문화', 'etiquette', '에티켓'
            ]
            
            has_advice_keyword = any(kw in message_lower for kw in advice_patterns)
            
            place_keywords = [
                'palace', 'temple', 'tower', 'museum', 'park',
                '궁', '사찰', '타워', '박물관', '공원',
                'restaurant', 'food', '레스토랑', '음식', '맛집'
            ]
            has_place = any(place in message_lower for place in place_keywords)
            
            if has_advice_keyword and not has_place:
                return {
                    "type": "general_advice",
                    "keyword": message,
                    "count": extracted_count
                }
            
            # === 추천 질문 감지 ===
            recommendation_patterns = [
                'recommend', 'suggestion', 'suggest', '추천',
                'places to visit', 'where to go', '가볼',
                'best places', 'top places', '명소'
            ]
            
            has_recommendation = any(kw in message_lower for kw in recommendation_patterns)
            
            if has_recommendation or extracted_count:
                return {
                    "type": "recommendation",
                    "keyword": message,
                    "count": extracted_count or 10
                }
            
            # === 특정 장소 검색 (기본) ===
            keyword = ChatRestService._extract_keyword_simple(message)
            return {
                "type": "place_search",
                "keyword": keyword,
                "count": extracted_count
            }
            
        except Exception as e:
            print(f"❌ 키워드 추출 오류: {e}")
            return {
                "type": "place_search",
                "keyword": message,
                "count": None
            }

    @staticmethod
    def _extract_keyword_simple(message: str) -> str:
        """🚀 단순 키워드 추출 (GPT 없이)"""
        remove_words = [
            'introduce', 'introduco', 'tell me about', 'what is', 'where is',
            'about', 'the', 'a', 'an', 'me'
        ]
        
        keyword = message.lower()
        for word in remove_words:
            keyword = keyword.replace(word, '')
        
        keyword = ' '.join(keyword.split())
        
        if len(keyword.strip()) < 2:
            keyword = message
        
        return keyword.strip()
    
    @staticmethod
    def _get_random_attractions(count: int = 10) -> List[Dict[str, Any]]:
        """🎯 랜덤 관광명소 추천"""
        try:
            print(f"🎲 랜덤 관광명소 {count}개 추천 시작...")
            
            qdrant_client = ChatRestService._get_qdrant_client()
            
            fetch_count = min(count * 5, 100)
            
            scroll_result = qdrant_client.scroll(
                collection_name=ChatRestService.ATTRACTION_COLLECTION,
                limit=fetch_count,
                offset=random.randint(0, 50),
                with_payload=True,
                with_vectors=False
            )
            
            points = scroll_result[0]
            
            if not points:
                print(f"❌ 관광명소를 가져올 수 없습니다")
                return []
            
            print(f"📊 가져온 관광명소: {len(points)}개")
            
            random.shuffle(points)
            selected_points = points[:count]
            
            attractions = []
            for point in selected_points:
                attraction_data = point.payload.get("metadata", {})
                
                formatted_data = {
                    "attr_id": attraction_data.get("attr_id"),
                    "title": attraction_data.get("title"),
                    "type": "attraction"
                }
                
                attractions.append(formatted_data)
                print(f"  ✅ {formatted_data['title']}")
            
            print(f"🎲 랜덤 추천 완료: {len(attractions)}개")
            return attractions
            
        except Exception as e:
            print(f"❌ 랜덤 추천 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def _generate_random_response(attractions: List[Dict]) -> str:
        """🎯 랜덤 추천 응답 생성"""
        if not attractions:
            return "Sorry, I couldn't find any recommendations at the moment. 😢"
        
        return f"🎯 Here are {len(attractions)} recommended places in Seoul! Ask me about any specific location for more details! 😊"
    
    @staticmethod
    def _create_map_markers(results_data: List[Dict]) -> List[Dict]:
        """지도 마커 데이터 생성 (통합)"""
        markers = []
        for item in results_data:
            lat = item.get('latitude', 0.0)
            lng = item.get('longitude', 0.0)
            
            if lat and lng and lat != 0.0 and lng != 0.0:
                marker = {
                    "id": item.get('festival_id') or item.get('attr_id') or item.get('id'),
                    "title": item.get('title') or item.get('restaurant_name'),
                    "latitude": float(lat),
                    "longitude": float(lng),
                    "type": item.get('type', 'attraction')
                }
                
                # 타입별 추가 정보
                if item.get('type') == 'festival':
                    marker.update({
                        "festival_id": item['festival_id'],
                        "description": item.get('description', '')[:100] + "...",
                        "image_url": item.get('image_url'),
                        "start_date": item.get('start_date'),
                        "end_date": item.get('end_date')
                    })
                elif item.get('type') == 'attraction':
                    marker.update({
                        "attr_id": item['attr_id'],
                        "address": item.get('address'),
                        "phone": item.get('phone'),
                        "image_urls": item.get('image_urls')
                    })
                elif item.get('type') == 'restaurant':
                    marker.update({
                        "restaurant_id": item.get('id'),
                        "place": item.get('place'),
                        "place_en": item.get('place_en'),
                        "subway": item.get('subway'),
                        "description": item.get('description', '')[:100] + "..."
                    })
                
                markers.append(marker)
        
        return markers
    
    @staticmethod
    def _generate_final_response(message: str, results_data: List[Dict]) -> str:
        """🎤 최종 응답 생성 (통합)"""
        try:
            if not results_data:
                return "Hello! Feel free to ask me about Seoul's restaurants, festivals, or attractions! 😊"
            
            result = results_data[0]
            result_type = result.get('type', 'attraction')
            
            print(f"🎤 GPT 응답 생성 (타입: {result_type})")
            return ChatRestService._gpt_response(message, result, result_type)
                
        except Exception as e:
            print(f"❌ 응답 생성 오류: {e}")
            import traceback
            traceback.print_exc()
            if results_data:
                result = results_data[0]
                title = result.get('title') or result.get('restaurant_name')
                return f"🎯 Found information about {title}! Check the details below 😊"
            else:
                return "Hello! Feel free to ask me anything! 😊"
    
    @staticmethod
    def _gpt_response(message: str, result: Dict, result_type: str) -> str:
        """🎤 타입별 GPT 응답"""
        title = result.get('title', '') or result.get('restaurant_name', '')
        description = result.get('description', '')
        
        if result_type == 'festival':
            prompt = FESTIVAL_QUICK_PROMPT.format(
                title=title,
                start_date=result.get('start_date', ''),
                end_date=result.get('end_date', ''),
                description=description[:500],
                message=message
            )
        elif result_type == 'restaurant':
            prompt = RESTAURANT_QUICK_PROMPT.format(
                restaurant_name=result.get('restaurant_name', ''),
                place=result.get('place', ''),
                description=description[:500],
                message=message
            )
        else:  # attraction
            prompt = ATTRACTION_QUICK_PROMPT.format(
                title=title,
                address=result.get('address', ''),
                hours_of_operation=result.get('hours_of_operation', ''),
                description=description[:500],
                message=message
            )
        
        response_messages = [{"role": "user", "content": prompt}]
        
        return chat_with_gpt(response_messages, max_tokens=250, temperature=0.6)
    
    @staticmethod
    def get_conversation_history(db: Session, user_id: int, limit: int = 50) -> List[Dict]:
        """대화 히스토리 조회"""
        conversations = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.datetime.desc()).limit(limit).all()
        
        return [
            {
                "conversation_id": conv.convers_id,
                "message": conv.question,
                "response": conv.response,
                "created_at": conv.datetime.isoformat()
            }
            for conv in reversed(conversations)
        ]