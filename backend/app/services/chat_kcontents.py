# app/services/chat_kcontents.py
"""
🎬 K-Contents 전용 채팅 서비스 (K-Drama/K-Movie 촬영지)
- KContents Collection만 검색
- Festival/Attraction/Restaurant 검색 안함
- prompt3.py 사용 (열정적인 K-Drama 팬 가이드 톤)
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
from app.utils.prompt3 import (
    KCONTENT_QUICK_PROMPT,
    KCONTENT_COMPARISON_PROMPT,
    KCONTENT_ADVICE_PROMPT,
    KCONTENT_GENERAL_COMPARISON_PROMPT,
    KCONTENT_GENERAL_ADVICE_PROMPT
)

class ChatKContentsService:
    
    # 🎯 Qdrant 설정 (KContents만)
    QDRANT_URL = "http://172.17.0.1:6333"
    KCONTENT_COLLECTION = "seoul-kcontents"
    
    # 🚀 임베딩 모델 캐싱 (재사용)
    _embedding_model = None
    
    # 🚀 Qdrant 클라이언트 캐싱 (재사용)
    _qdrant_client = None
    
    @staticmethod
    def _get_embedding_model():
        """임베딩 모델 싱글톤 패턴으로 재사용"""
        if ChatKContentsService._embedding_model is None:
            ChatKContentsService._embedding_model = OpenAIEmbeddings(model="text-embedding-ada-002")
        return ChatKContentsService._embedding_model
    
    @staticmethod
    def _get_qdrant_client():
        """Qdrant 클라이언트 싱글톤 패턴으로 재사용"""
        if ChatKContentsService._qdrant_client is None:
            ChatKContentsService._qdrant_client = QdrantClient(
                url=ChatKContentsService.QDRANT_URL,
                timeout=60,
                prefer_grpc=False
            )
        return ChatKContentsService._qdrant_client
    
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
        """검색어를 정규화하여 더 정확한 매칭 (K-Drama용)"""
        
        # K-Drama/K-Content 특화 보정 규칙
        corrections = {
            # 드라마 제목 영어 → 한글
            "crash landing on you": "사랑의 불시착",
            "itaewon class": "이태원 클라쓰",
            "kingdom": "킹덤",
            "goblin": "도깨비",
            "descendants of the sun": "태양의 후예",
            "my love from the star": "별에서 온 그대",
            
            # 일반 용어
            "filming location": "촬영지",
            "drama location": "드라마 촬영지",
            "kdrama": "한국 드라마",
            "k-drama": "한국 드라마",
        }
        
        query_lower = query.lower()
        
        for eng, kor in corrections.items():
            if eng in query_lower:
                query = query.replace(eng, kor)
                print(f"🔧 검색어 보정: '{eng}' → '{kor}'")
        
        return query
    
    @staticmethod
    def _expand_search_terms(query: str) -> List[str]:
        """검색어를 자동으로 확장 (K-Drama용)"""
        
        variants = [query]
        
        # 자동 변형 규칙들
        query_lower = query.lower()
        
        # 촬영지 관련 변형
        if "filming" in query_lower or "location" in query_lower:
            variants.append(query.replace("filming location", "촬영지"))
            variants.append(query.replace("location", "장소"))
        
        # 드라마 관련 변형
        if "drama" in query_lower:
            variants.append(query.replace("drama", "드라마"))
        
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
    def _improved_search(query: str) -> Dict[str, Any]:
        """🔧 현실적으로 개선된 K-Content 검색"""
        
        try:
            print(f"🔍 K-Content 검색 시작: '{query}'")
            
            # 1. 쿼리 전처리 (불용어 제거)
            cleaned_query = ChatKContentsService._preprocess_query(query)
            
            # 2. 검색어 정규화
            normalized_query = ChatKContentsService._normalize_query(cleaned_query)
            
            # 3. 검색어 확장
            search_variants = ChatKContentsService._expand_search_terms(normalized_query)
            print(f"🔧 검색 변형들: {search_variants}")
            
            # 4. 모든 변형으로 검색
            best_result = None
            best_score = 0
            
            qdrant_client = ChatKContentsService._get_qdrant_client()
            embedding_model = ChatKContentsService._get_embedding_model()
            
            for variant in search_variants:
                try:
                    query_embedding = embedding_model.embed_query(variant)
                    
                    search_results = qdrant_client.search(
                        collection_name=ChatKContentsService.KCONTENT_COLLECTION,
                        query_vector=query_embedding,
                        limit=5,
                        score_threshold=0.3,  # 낮은 임계값으로 더 많은 결과
                        with_payload=True,
                        with_vectors=False
                    )
                    
                    for result in search_results:
                        # Vector 유사도 + 키워드 매칭 점수
                        vector_score = result.score
                        
                        # 🎯 metadata에서 drama_name으로 제목 추출
                        metadata = result.payload.get("metadata", {})
                        drama_name = metadata.get("drama_name", "")
                        location_name = metadata.get("location_name", "")
                        combined_title = f"{drama_name} {location_name}"
                        
                        keyword_score = ChatKContentsService._calculate_keyword_overlap(cleaned_query, combined_title)
                        combined_score = vector_score * 0.8 + keyword_score * 0.2
                        
                        if combined_score > best_score:
                            best_score = combined_score
                            best_result = result
                            print(f"✅ 더 좋은 결과: '{variant}' → 점수: {combined_score:.3f}")
                
                except Exception as e:
                    print(f"⚠️ 변형 '{variant}' 검색 실패: {e}")
                    continue
            
            # 5. 결과 반환 (임계값 0.4로 낮춤)
            if best_result and best_score > 0.4:
                return best_result
            else:
                print(f"❌ 유효한 결과 없음 (최고 점수: {best_score:.3f})")
                return None
                
        except Exception as e:
            print(f"❌ K-Content 검색 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    # ===== 🎬 K-Content 검색 함수 =====
    
    @staticmethod
    def _search_best_kcontent(keyword: str) -> Dict[str, Any]:
        """🎬 K-Content 벡터 검색"""
        try:
            print(f"🎬 K-Content 검색: '{keyword}'")
            
            result = ChatKContentsService._improved_search(keyword)
            
            if not result:
                print(f"🔍 K-Content 검색 결과 없음: '{keyword}'")
                return None
            
            # 🎯 payload.metadata에서 데이터 추출
            kcontent_metadata = result.payload.get("metadata", {})
            
            formatted_data = {
                "content_id": kcontent_metadata.get("content_id", ""),
                "drama_name": kcontent_metadata.get("drama_name", ""),
                "drama_name_en": kcontent_metadata.get("drama_name_en", ""),
                "location_name": kcontent_metadata.get("location_name", ""),
                "location_name_en": kcontent_metadata.get("location_name_en", ""),
                "address": kcontent_metadata.get("address", ""),
                "address_en": kcontent_metadata.get("address_en", ""),
                "trip_tip": kcontent_metadata.get("trip_tip", ""),
                "trip_tip_en": kcontent_metadata.get("trip_tip_en", ""),
                "keyword": kcontent_metadata.get("keyword", ""),
                "keyword_en": kcontent_metadata.get("keyword_en", ""),
                "category": kcontent_metadata.get("category", ""),
                "category_en": kcontent_metadata.get("category_en", ""),
                "thumbnail": kcontent_metadata.get("thumbnail", ""),  # 🎯 메인 이미지
                "image_url": kcontent_metadata.get("image_url", ""),
                "latitude": float(kcontent_metadata.get("latitude", 0)),
                "longitude": float(kcontent_metadata.get("longitude", 0)),
                "similarity_score": result.score,
                "type": "kcontent"
            }
            
            print(f"🎯 K-Content 검색 성공: '{formatted_data['drama_name']}' at '{formatted_data['location_name']}' (유사도: {result.score:.3f})")
            return formatted_data
            
        except Exception as e:
            print(f"K-Content 검색 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    # ===== 메인 메시지 처리 함수 =====
    
    @staticmethod
    def send_message(db: Session, user_id: int, message: str) -> Dict[str, Any]:
        """
        🚀 K-Content 메시지 처리
        """
        import time
        
        try:
            total_start = time.time()
            
            print(f"🎬 K-Content 서비스 요청: '{message}'")
            
            # 🚀 1. 빠른 키워드 추출 + 질문 타입 분류
            step_start = time.time()
            analysis = ChatKContentsService._analyze_message_fast(message)
            print(f"⏱️ 1. 키워드 추출: {time.time() - step_start:.3f}초")
            
            question_type = analysis.get('type', 'kcontent_search')
            keyword = analysis.get('keyword', message)
            is_random = analysis.get('is_random_recommendation', False)
            
            # ===== 질문 타입별 처리 =====
            
            # 🤔 비교 질문 처리
            if question_type == "comparison":
                print(f"🤔 비교 질문 감지 → GPT 직접 처리")
                
                prompt = KCONTENT_COMPARISON_PROMPT.format(message=message)
                
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
                    "kcontents": [],
                    "has_kcontents": False,
                    "map_markers": []
                }
            
            # 💡 일반 조언/팁 질문 처리
            elif question_type == "general_advice":
                print(f"💡 조언 질문 감지 → GPT 직접 처리")
                
                prompt = KCONTENT_ADVICE_PROMPT.format(message=message)
                
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
                    "kcontents": [],
                    "has_kcontents": False,
                    "map_markers": []
                }
            
            # 🎯 랜덤 추천 처리
            elif is_random or question_type == "random_recommendation":
                print(f"🎯 추천 질문 감지 → 수량 기반 추천")
                
                count = analysis.get('count', 10)
                random_kcontents = ChatKContentsService._get_random_kcontents(count=count)
                
                ai_response = ChatKContentsService._generate_random_response(random_kcontents)
                
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
                    "results": random_kcontents,
                    "kcontents": random_kcontents,
                    "has_kcontents": len(random_kcontents) > 0,
                    "map_markers": ChatKContentsService._create_map_markers(random_kcontents)
                }
            
            # 🚀 특정 K-Content 검색 (기본 동작)
            else:
                # 🚀 2. K-Content 검색
                step_start = time.time()
                kcontent = ChatKContentsService._search_best_kcontent(keyword)
                print(f"⏱️ 2. K-Content 검색: {time.time() - step_start:.3f}초")
                
                # 결과 처리
                if kcontent:
                    kcontent['type'] = 'kcontent'
                    best_result = [kcontent]
                else:
                    best_result = []
                
                # 🚀 3. 응답 생성
                step_start = time.time()
                ai_response = ChatKContentsService._generate_final_response(message, best_result)
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
                
                # 🗺️ 지도 마커 생성
                map_markers = []
                if best_result:
                    map_markers = ChatKContentsService._create_map_markers(best_result)
                
                # 5. 응답 구성
                return {
                    "response": ai_response,
                    "convers_id": conversation.convers_id,
                    "results": best_result,
                    "kcontents": best_result,
                    "has_kcontents": len(best_result) > 0,
                    "map_markers": map_markers
                }
            
        except Exception as e:
            raise Exception(f"K-Content 채팅 처리 중 오류 발생: {str(e)}")
    
    @staticmethod
    async def send_message_streaming(db: Session, user_id: int, message: str):
        """
        🌊 K-Content 스트리밍 메시지 처리 - 제너레이터 반환
        """
        try:
            # 🚀 1. 질문 타입 분석
            analysis = ChatKContentsService._analyze_message_fast(message)
            question_type = analysis.get('type', 'kcontent_search')
            keyword = analysis.get('keyword', message)
            is_random = analysis.get('is_random_recommendation', False)
            
            print(f"📋 K-Content 스트리밍 분석: type={question_type}, keyword={keyword}")
            
            # ===== 질문 타입별 처리 =====
            
            # 🤔 비교 질문 처리
            if question_type == "comparison":
                yield f"data: {json.dumps({'type': 'generating', 'message': '🤔 Comparing K-Drama locations...'}, ensure_ascii=False)}\n\n"
                
                prompt = KCONTENT_COMPARISON_PROMPT.format(message=message)
                
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
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id, 'kcontents': [], 'has_kcontents': False}, ensure_ascii=False)}\n\n"
                return
            
            # 💡 일반 조언/팁 질문 처리
            elif question_type == "general_advice":
                yield f"data: {json.dumps({'type': 'generating', 'message': '💡 Preparing K-Drama tips...'}, ensure_ascii=False)}\n\n"
                
                prompt = KCONTENT_ADVICE_PROMPT.format(message=message)
                
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
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id, 'kcontents': [], 'has_kcontents': False}, ensure_ascii=False)}\n\n"
                return
            
            # 🎯 랜덤 추천 처리
            elif is_random or question_type == "random_recommendation":
                yield f"data: {json.dumps({'type': 'random', 'message': '🎲 Finding amazing K-Drama locations...'}, ensure_ascii=False)}\n\n"
                
                random_kcontents = ChatKContentsService._get_random_kcontents(count=10)
                ai_response = ChatKContentsService._generate_random_response(random_kcontents)
                
                # 대화 저장
                conversation = Conversation(user_id=user_id, question=message, response=ai_response)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                
                # 🗺️ 랜덤 추천 마커 디버깅
                print(f"🗺️ 랜덤 마커 생성 시작: kcontents 개수={len(random_kcontents)}")
                map_markers = ChatKContentsService._create_map_markers(random_kcontents)
                print(f"🗺️ 랜덤 생성된 마커: {len(map_markers)}개")
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': ai_response, 'results': random_kcontents, 'kcontents': random_kcontents, 'convers_id': conversation.convers_id, 'has_kcontents': True, 'map_markers': map_markers}, ensure_ascii=False)}\n\n"
                return
            
            # 🚀 특정 K-Content 검색 (기본 동작)
            else:
                yield f"data: {json.dumps({'type': 'searching', 'message': '🔍 Searching for K-Drama location...'}, ensure_ascii=False)}\n\n"
                
                # K-Content 검색
                kcontent = ChatKContentsService._search_best_kcontent(keyword)
                
                if not kcontent:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Sorry, I could not find that K-Drama location. 😅'}, ensure_ascii=False)}\n\n"
                    return
                
                kcontent['type'] = 'kcontent'
                
                title = f"{kcontent['drama_name']} - {kcontent['location_name']}"
                yield f"data: {json.dumps({'type': 'found', 'title': title, 'result': kcontent}, ensure_ascii=False)}\n\n"
                
                yield f"data: {json.dumps({'type': 'generating', 'message': '🎬 Preparing K-Drama info...'}, ensure_ascii=False)}\n\n"
                
                # 프롬프트 생성
                prompt = KCONTENT_QUICK_PROMPT.format(
                    drama_name=kcontent.get('drama_name', ''),
                    location_name=kcontent.get('location_name', ''),
                    address=kcontent.get('address', ''),
                    trip_tip=kcontent.get('trip_tip', '')[:500],
                    keyword=kcontent.get('keyword', ''),
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
                
                # 🗺️ 지도 마커 생성 - 디버깅 로그 추가!
                print(f"🗺️ 마커 생성 시작: kcontent 데이터 확인")
                print(f"  - drama_name: {kcontent.get('drama_name', 'MISSING')}")
                print(f"  - location_name: {kcontent.get('location_name', 'MISSING')}")
                print(f"  - latitude: {kcontent.get('latitude', 'MISSING')}")
                print(f"  - longitude: {kcontent.get('longitude', 'MISSING')}")
                print(f"  - content_id: {kcontent.get('content_id', 'MISSING')}")
                
                map_markers = ChatKContentsService._create_map_markers([kcontent])
                print(f"🗺️ 생성된 마커 결과:")
                print(f"  - 마커 개수: {len(map_markers)}")
                print(f"  - 마커 데이터: {map_markers}")
                
                # 완료 메시지
                completion_data = {
                    'type': 'done',
                    'full_response': full_response,
                    'convers_id': conversation.convers_id,
                    'result': kcontent,
                    'results': [kcontent],
                    'kcontents': [kcontent],
                    'has_kcontents': True,
                    'map_markers': map_markers
                }
                
                print(f"🗺️ 완료 데이터 전송: map_markers={len(map_markers)}개")
                yield f"data: {json.dumps(completion_data, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            print(f"❌ K-Content Streaming 오류: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
    
    # ===== 🔧 헬퍼 함수들 =====
    
    @staticmethod
    def _analyze_message_fast(message: str) -> Dict[str, Any]:
        """
        🚀 초고속 키워드 분석 - K-Content 질문 타입 자동 분류
        """
        try:
            message_lower = message.lower().strip()
            
            print(f"\n🔍 K-Content 질문 분석 시작: '{message}'")
            
            # === 수량 추출 ===
            import re
            number_patterns = [
                r'(\d+)곳', r'(\d+)개', r'(\d+)가지',
                r'(\d+)\s*places?', r'(\d+)\s*spots?', r'(\d+)\s*locations?'
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
                'etiquette', '에티켓', 'visit', '방문'
            ]
            
            has_advice_keyword = any(kw in message_lower for kw in advice_patterns)
            
            # K-Drama 관련 키워드가 없으면 조언 질문
            drama_keywords = [
                'drama', 'filming', 'location', 'scene',
                '드라마', '촬영지', '장면', '장소'
            ]
            has_drama = any(kw in message_lower for kw in drama_keywords)
            
            if has_advice_keyword and not has_drama:
                return {
                    "type": "general_advice",
                    "keyword": message,
                    "count": extracted_count
                }
            
            # === 추천 질문 감지 ===
            recommendation_patterns = [
                'recommend', 'suggestion', 'suggest', '추천',
                'best', 'top', 'popular', '인기'
            ]
            
            has_recommendation = any(kw in message_lower for kw in recommendation_patterns)
            
            if has_recommendation or extracted_count:
                return {
                    "type": "recommendation",
                    "keyword": message,
                    "count": extracted_count or 10
                }
            
            # === 특정 K-Content 검색 (기본) ===
            keyword = ChatKContentsService._extract_keyword_simple(message)
            return {
                "type": "kcontent_search",
                "keyword": keyword,
                "count": extracted_count
            }
            
        except Exception as e:
            print(f"❌ 키워드 추출 오류: {e}")
            return {
                "type": "kcontent_search",
                "keyword": message,
                "count": None
            }

    @staticmethod
    def _extract_keyword_simple(message: str) -> str:
        """🚀 단순 키워드 추출 (GPT 없이)"""
        remove_words = [
            'introduce', 'introduco', 'tell me about', 'what is', 'where is',
            'about', 'the', 'a', 'an', 'me', 'filming', 'location'
        ]
        
        keyword = message.lower()
        for word in remove_words:
            keyword = keyword.replace(word, '')
        
        keyword = ' '.join(keyword.split())
        
        if len(keyword.strip()) < 2:
            keyword = message
        
        return keyword.strip()
    
    @staticmethod
    def _get_random_kcontents(count: int = 10) -> List[Dict[str, Any]]:
        """🎯 랜덤 K-Content 추천"""
        try:
            print(f"🎲 랜덤 K-Content {count}개 추천 시작...")
            
            qdrant_client = ChatKContentsService._get_qdrant_client()
            
            fetch_count = min(count * 5, 100)
            
            scroll_result = qdrant_client.scroll(
                collection_name=ChatKContentsService.KCONTENT_COLLECTION,
                limit=fetch_count,
                offset=random.randint(0, 50),
                with_payload=True,
                with_vectors=False
            )
            
            points = scroll_result[0]
            
            if not points:
                print(f"❌ K-Content를 가져올 수 없습니다")
                return []
            
            print(f"📊 가져온 K-Content: {len(points)}개")
            
            random.shuffle(points)
            selected_points = points[:count]
            
            kcontents = []
            for point in selected_points:
                # 🎯 payload.metadata에서 데이터 추출
                kcontent_metadata = point.payload.get("metadata", {})
                
                formatted_data = {
                    "content_id": kcontent_metadata.get("content_id"),
                    "drama_name": kcontent_metadata.get("drama_name"),
                    "location_name": kcontent_metadata.get("location_name"),
                    "thumbnail": kcontent_metadata.get("thumbnail", ""),
                    "latitude": float(kcontent_metadata.get("latitude", 0)),
                    "longitude": float(kcontent_metadata.get("longitude", 0)),
                    "type": "kcontent"
                }
                
                kcontents.append(formatted_data)
                print(f"  ✅ {formatted_data['drama_name']} - {formatted_data['location_name']}")
            
            print(f"🎲 랜덤 추천 완료: {len(kcontents)}개")
            return kcontents
            
        except Exception as e:
            print(f"❌ 랜덤 추천 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def _generate_random_response(kcontents: List[Dict]) -> str:
        """🎯 랜덤 추천 응답 생성"""
        if not kcontents:
            return "Sorry, I couldn't find any K-Drama locations at the moment. 😢"
        
        return f"🎬 OMG! Here are {len(kcontents)} amazing K-Drama filming locations in Seoul! Each spot is iconic and perfect for K-Drama fans! Ask me about any specific location for more details! 💕✨"
    
    @staticmethod
    def _create_map_markers(kcontents_data: List[Dict]) -> List[Dict]:
        """지도 마커 데이터 생성 (K-Content) - 디버깅 로그 추가"""
        print(f"🗺️ _create_map_markers 호출: 입력 데이터 {len(kcontents_data)}개")
        
        markers = []
        for i, item in enumerate(kcontents_data):
            print(f"🗺️ 마커 {i+1} 처리 중:")
            print(f"  - item 타입: {type(item)}")
            print(f"  - item 키들: {list(item.keys()) if isinstance(item, dict) else 'NOT DICT'}")
            
            lat = item.get('latitude', 0.0)
            lng = item.get('longitude', 0.0)
            
            print(f"  - 좌표: lat={lat}, lng={lng}")
            print(f"  - 좌표 타입: lat={type(lat)}, lng={type(lng)}")
            print(f"  - 좌표 유효성: lat != 0.0 = {lat != 0.0}, lng != 0.0 = {lng != 0.0}")
            
            if lat and lng and lat != 0.0 and lng != 0.0:
                marker = {
                    "id": item.get('content_id'),
                    "title": f"{item.get('drama_name')} - {item.get('location_name')}",
                    "latitude": float(lat),
                    "longitude": float(lng),
                    "type": "kcontent",
                    "content_id": item.get('content_id'),
                    "drama_name": item.get('drama_name'),
                    "location_name": item.get('location_name'),
                    "address": item.get('address'),
                    "thumbnail": item.get('thumbnail'),
                    "trip_tip": item.get('trip_tip', '')[:100] + "..."
                }
                
                markers.append(marker)
                print(f"  ✅ 마커 {i+1} 생성 성공: {marker['title']}")
            else:
                print(f"  ❌ 마커 {i+1} 스킵: 좌표 무효 (lat={lat}, lng={lng})")
        
        print(f"🗺️ _create_map_markers 완료: 총 {len(markers)}개 마커 생성")
        return markers
    
    @staticmethod
    def _generate_final_response(message: str, kcontents_data: List[Dict]) -> str:
        """🎬 최종 응답 생성 (K-Content)"""
        try:
            if not kcontents_data:
                return "Hey K-Drama fan! 🎬 Ask me about any filming location in Seoul and I'll share all the exciting details! 💕"
            
            kcontent = kcontents_data[0]
            
            print(f"🎬 GPT 응답 생성 (K-Content)")
            return ChatKContentsService._gpt_response(message, kcontent)
                
        except Exception as e:
            print(f"❌ 응답 생성 오류: {e}")
            import traceback
            traceback.print_exc()
            if kcontents_data:
                kcontent = kcontents_data[0]
                return f"🎬 Found the filming location for {kcontent.get('drama_name')}! Check the details below 💕"
            else:
                return "Hey K-Drama fan! 🎬 Ask me anything! 😊"
    
    @staticmethod
    def _gpt_response(message: str, kcontent: Dict) -> str:
        """🎬 K-Content GPT 응답"""
        prompt = KCONTENT_QUICK_PROMPT.format(
            drama_name=kcontent.get('drama_name', ''),
            location_name=kcontent.get('location_name', ''),
            address=kcontent.get('address', ''),
            trip_tip=kcontent.get('trip_tip', '')[:500],
            keyword=kcontent.get('keyword', ''),
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