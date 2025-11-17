# app/services/chat_kcontents.py

"""
🚀 K-Pop 통합 서비스 (K-Contents, Restaurant, Entertainment 검색 및 Geo-Filter 지원)
- Qdrant의 3개 컬렉션을 모두 검색하여 통합 응답 제공
- prompt3.py를 기반으로 각 컬렉션에 맞는 응답 톤 유지
"""
from typing import Dict, Any, List, Generator
from sqlalchemy.orm import Session
import json
import os
import random
import re
import asyncio
import time
import traceback
from qdrant_client.http.models import PointStruct

# 🚀 외부 모듈 Import
from app.models.conversation import Conversation 
from app.utils.openai_client import chat_with_gpt, chat_with_gpt_stream
from app.utils.prompt3 import (
    KCONTENT_QUICK_PROMPT, RESTAURANT_QUICK_PROMPT, ENTERTAINMENT_QUICK_PROMPT, 
    KCONTENT_COMPARISON_PROMPT, KCONTENT_ADVICE_PROMPT, 
    GENERAL_COMPARISON_PROMPT, GENERAL_ADVICE_PROMPT 
)
from app.core.qdrant_client import get_qdrant_client, get_embedding_model, get_collection_name
from app.utils.kcontents_search_utils import (
    preprocess_query, 
    normalize_query, 
    expand_search_terms, 
    calculate_keyword_overlap, 
    analyze_message_fast, 
    extract_keyword_simple
)


class ChatIntegratedService:
    
    # -----------------------------------------------------------------
    # 🆕 [추가] 일반 대화 및 자기소개 프롬프트 정의
    # -----------------------------------------------------------------
    SELF_INTRODUCTION_PROMPT = """
You are a K-Pop and K-Drama tour expert and tour guide chatbot.
Your role is to accurately find and kindly recommend Korean drama filming locations, K-Pop idol-related places, restaurants, and hot places in Seoul that users want.
Please explain your role to the user in 4 to 5 concise and vibrant English sentences of no more than 300 characters.
    plus emoji"""
    
    GENERAL_CONVERSATION_PROMPT = """
You are a K-Pop and K-Drama tour expert and friendly tour guide chatbot.
If you need to give a general conversation or advice without a search result for a user's question, please answer me kindly and briefly.
Always answer in English, but keep the tone of a lively and enjoyable tour guide.
    """
    # -----------------------------------------------------------------


    # ===== 🔧 내부 헬퍼 함수: 검색 및 데이터 처리 (생략 없이 이전 내용 유지) =====
    
    @staticmethod
    def _improved_search(query: str, data_type: str, geo_filter: Any = None) -> Any:
        # ... (이전 코드 유지)
        try:
            print(f"🔍 [{data_type.upper()}] 통합 검색 시작: '{query}'")
            
            # 1. 쿼리 전처리
            cleaned_query = preprocess_query(query)
            normalized_query = normalize_query(cleaned_query)
            search_variants = expand_search_terms(normalized_query)
            
            # 2. Qdrant 준비
            qdrant_client = get_qdrant_client()
            embedding_model = get_embedding_model()
            collection_name = get_collection_name(data_type) 
            
            best_result = None
            best_score = 0
            
            # 3. 모든 변형으로 검색 및 점수 통합
            for variant in search_variants:
                try:
                    query_embedding = embedding_model.embed_query(variant)
                    
                    query_filter = geo_filter if geo_filter else None
                    
                    search_results = qdrant_client.search(
                        collection_name=collection_name,
                        query_vector=query_embedding,
                        query_filter=query_filter, 
                        limit=5,
                        score_threshold=0.3, 
                        with_payload=True,
                        with_vectors=False
                    )
                    
                    for result in search_results:
                        vector_score = result.score
                        metadata = result.payload.get("metadata", {})
                        
                        if data_type == "kcontent":
                             title_parts = [metadata.get("drama_name", ""), metadata.get("location_name", "")]
                        else:
                             title_parts = [metadata.get("name", ""), metadata.get("title", "")] 
                        
                        combined_title = " ".join(filter(None, title_parts))
                        
                        keyword_score = calculate_keyword_overlap(cleaned_query, combined_title) 
                        combined_score = vector_score * 0.8 + keyword_score * 0.2
                        
                        if combined_score > best_score:
                            best_score = combined_score
                            best_result = result
                            print(f"✅ 더 좋은 결과 ({data_type}): '{variant}' → 점수: {combined_score:.3f}")
                            
                except Exception as e:
                    print(f"⚠️ 변형 '{variant}' 검색 실패: {e}")
                    continue
            
            # 4. 결과 반환 
            if best_result and best_score > 0.4:
                return best_result
            else:
                print(f"❌ [{data_type.upper()}] 유효한 결과 없음 (최고 점수: {best_score:.3f})")
                return None
                
        except Exception as e:
            print(f"❌ [{data_type.upper()}] 통합 검색 오류: {e}")
            traceback.print_exc()
            return None
            
    @staticmethod
    def _extract_and_format_payload(result: Any, data_type: str) -> Dict[str, Any]:
        # ... (이전 코드 유지)
        if not result: return None

        metadata = result.payload.get("metadata", {})
        
        formatted_data = {
            "similarity_score": getattr(result, 'score', 0.0),
            "type": data_type,
            "latitude": float(metadata.get("latitude", 0)) if metadata.get("latitude") is not None else 0.0,
            "longitude": float(metadata.get("longitude", 0)) if metadata.get("longitude") is not None else 0.0,
            "address": metadata.get("address", ""),
            "address_en": metadata.get("address_en", ""),
            "thumbnail": metadata.get("thumbnail", ""),
            "image_url": metadata.get("image_url", ""),
            "drama_name_en": metadata.get("drama_name_en", ""),
            "drama_name": metadata.get("drama_name_ko", ""),
            "tip": metadata.get("trip_tip", metadata.get("tip", ""))
        }

        if data_type == "kcontent":
            formatted_data.update({
                "content_id": metadata.get("content_id", ""),
                "drama_name_en": metadata.get("drama_name_en", ""),
                "drama_name": metadata.get("drama_name_ko", ""), 
                "location_name": metadata.get("location_name_en", ""), 
                "address": metadata.get("address_en", ""), 
                "image_url": metadata.get("thumbnail", ""), 
                "tip": metadata.get("trip_tip_en", ""), 
            })
        elif data_type == "restaurant":
            formatted_data.update({
                "item_id": metadata.get("restaurant_id", ""),
                "title": metadata.get("name", ""),
                "category": metadata.get("food_category", ""),
            })
        elif data_type == "entertainment":
            formatted_data.update({
                "item_id": metadata.get("entertainment_id", ""),
                "title": metadata.get("name", ""),
                "category": metadata.get("category", ""),
            })
            
        return formatted_data

    @staticmethod
    def _search_best_item(keyword: str, data_type: str) -> Dict[str, Any]:
        result = ChatIntegratedService._improved_search(keyword, data_type)
        return ChatIntegratedService._extract_and_format_payload(result, data_type)
        
    @staticmethod
    def _search_best_kcontent(keyword: str) -> Dict[str, Any]: return ChatIntegratedService._search_best_item(keyword, "kcontent")
    @staticmethod
    def _search_best_restaurant(keyword: str) -> Dict[str, Any]: return ChatIntegratedService._search_best_item(keyword, "restaurant")
    @staticmethod
    def _search_best_entertainment(keyword: str) -> Dict[str, Any]: return ChatIntegratedService._search_best_item(keyword, "entertainment")
        
    # ===== 🛠️ 랜덤 및 지도 마커 헬퍼 함수 (생략 없이 이전 내용 유지) =====
    
    @staticmethod
    def _get_random_items(count: int = 10, data_type: str = "kcontent") -> List[Dict[str, Any]]:
        try:
            print(f"🎲 랜덤 [{data_type.upper()}] {count}개 추천 시작...")
            
            qdrant_client = get_qdrant_client()
            collection_name = get_collection_name(data_type)
            
            scroll_result = qdrant_client.scroll(
                collection_name=collection_name,
                limit=count, 
                offset=random.randint(0, 100), 
                with_payload=True,
                with_vectors=False
            )
            
            random_items = []
            for point in scroll_result[0]:
                formatted_data = ChatIntegratedService._extract_and_format_payload(point, data_type)
                if formatted_data:
                    random_items.append(formatted_data)
            
            return random_items
            
        except Exception as e:
            print(f"❌ 랜덤 추천 오류: {e}")
            return []
    
    @staticmethod
    def _create_map_markers(items_data: List[Dict]) -> List[Dict]:
        markers = []
        for item in items_data:
            lat = item.get('latitude', 0.0)
            lng = item.get('longitude', 0.0)
            
            if lat and lng and lat != 0.0 and lng != 0.0:
                marker = {
                    "id": item.get('item_id', item.get('content_id')), 
                    "title": item.get('title', ''),
                    "latitude": float(lat),
                    "longitude": float(lng),
                    "type": item.get('type', 'kcontent'),
                    "thumbnail": item.get('thumbnail', ''),
                    "tip": item.get('tip', '')[:100] + "..." 
                }
                markers.append(marker)
        
        return markers
        
    @staticmethod
    def _gpt_response(message: str, item: Dict) -> str:
        data_type = item.get('type', 'kcontent')
        
        if data_type == "kcontent":
            prompt_template = KCONTENT_QUICK_PROMPT
            formatted_prompt = prompt_template.format(
                drama_name=item.get('drama_name', ''), location_name=item.get('location_name', ''),
                address=item.get('address', ''), trip_tip=item.get('tip', '')[:500],
                message=message
            )
        elif data_type == "restaurant":
            prompt_template = RESTAURANT_QUICK_PROMPT 
            formatted_prompt = prompt_template.format(
                name=item.get('title', ''), address=item.get('address', ''),
                category=item.get('category', ''), tip=item.get('tip', '')[:500],
                message=message
            )
        else: # entertainment
            prompt_template = ENTERTAINMENT_QUICK_PROMPT 
            formatted_prompt = prompt_template.format(
                name=item.get('title', ''), address=item.get('address', ''),
                category=item.get('category', ''), tip=item.get('tip', '')[:500],
                message=message
            )

        response_messages = [{"role": "user", "content": formatted_prompt}]
        return chat_with_gpt(response_messages, max_tokens=250, temperature=0.6)


    # ===== 🚀 메인 메시지 처리 함수 (Non-Streaming) - 이전 내용 유지 및 수정 적용 =====
    
    @staticmethod
    def send_message(db: Session, user_id: int, message: str) -> Dict[str, Any]:
        """🚀 통합 서비스 메시지 처리 (Non-Streaming)"""
        
        try:
            total_start = time.time()
            print(f"🌐 통합 서비스 요청: '{message}'")
            
            # 1. 질문 타입 분류
            analysis = analyze_message_fast(message)
            question_type = analysis.get('type', 'entertainment_search') 
            keyword = analysis.get('keyword', message)
            count = analysis.get('count', 10)
            
            print(f"📋 분석 결과: Type={question_type}, Keyword='{keyword}'")
            
            # 2. 질문 타입에 따른 분기 처리
            
            results = []
            map_markers = []
            ai_response = ""

            if question_type in ["comparison", "general_advice", "self_introduction"]:
                if question_type == "self_introduction":
                     prompt = ChatIntegratedService.SELF_INTRODUCTION_PROMPT
                elif question_type == "comparison":
                    prompt = GENERAL_COMPARISON_PROMPT.format(message=message)
                else:
                    prompt = GENERAL_ADVICE_PROMPT.format(message=message)

                ai_response = chat_with_gpt([{"role": "user", "content": prompt}], max_tokens=300, temperature=0.7)
                
            elif question_type == "random_recommendation":
                target_type = "kcontent"
                if "restaurant" in keyword.lower(): target_type = "restaurant"
                elif "drama" not in keyword.lower() and "k-pop" in keyword.lower(): target_type = "entertainment"
                
                random_items = ChatIntegratedService._get_random_items(count=count, data_type=target_type)
                ai_response = f"🎯 {target_type.upper()} 랜덤 추천 결과: {len(random_items)}개 항목을 찾아왔어요! 지도에서 확인해 보세요! ✨"
                results = random_items
                
            else:
                # 🔍 특정 항목 검색 (통합)
                if question_type == "kcontent_search":
                    best_item = ChatIntegratedService._search_best_kcontent(keyword)
                elif question_type == "restaurant_search":
                    best_item = ChatIntegratedService._search_best_restaurant(keyword)
                elif question_type == "proximity_search":
                    best_item = ChatIntegratedService._search_best_restaurant(keyword)
                else: # entertainment_search
                    best_item = ChatIntegratedService._search_best_entertainment(keyword)
                    
                
                if best_item:
                    results = [best_item]
                    ai_response = ChatIntegratedService._generate_final_response(message, results)
                else:
                    # 검색 실패 시, 일반 대화 Fallback (Non-Streaming 버전)
                    prompt = f"{ChatIntegratedService.GENERAL_CONVERSATION_PROMPT} 사용자의 질문: {message}"
                    ai_response = chat_with_gpt([{"role": "user", "content": prompt}], max_tokens=250, temperature=0.7)
            
            # 3. 응답 생성 및 DB 저장 (검색 결과가 있을 때만 마커 생성)
            if results:
                 map_markers = ChatIntegratedService._create_map_markers(results)
            
            conversation = Conversation(user_id=user_id, question=message, response=ai_response)
            db.add(conversation); db.commit(); db.refresh(conversation)
            
            print(f"⏱️ 총 소요 시간: {time.time() - total_start:.3f}초\n")
            
            # 4. 최종 응답 구성
            return {
                "response": ai_response, 
                "convers_id": conversation.convers_id, 
                "results": results,
                "has_results": len(results) > 0, 
                "map_markers": map_markers
            }
            
        except Exception as e:
            print(f"❌ 통합 채팅 처리 중 오류 발생: {str(e)}")
            traceback.print_exc()
            raise Exception(f"통합 채팅 처리 중 오류 발생: {str(e)}")

    
    # ===== 🌊 메인 메시지 처리 함수 (Streaming) - GPT 일반 대화 기능 강화 및 Fallback 수정 =====

    @staticmethod
    async def send_message_streaming(db: Session, user_id: int, message: str) -> Generator:
        """🌊 통합 서비스 스트리밍 메시지 처리 - 제너레이터 반환"""
        
        try:
            # 1. 질문 타입 분류 및 인삿말 강제 분류
            analysis = analyze_message_fast(message)
            question_type = analysis.get('type', 'search_or_general')
            keyword = analysis.get('keyword', message)
            count = analysis.get('count', 10)
            
            # 🚨 [강화 로직] 단순 인삿말/감사 표현을 비검색 타입으로 강제 분류합니다.
            normalized_msg = message.strip().lower()
            if len(normalized_msg) <= 4 and normalized_msg in ['hi', 'hello', '안녕', 'ㅎㅇ', '하이', '감사', '고마워']:
                question_type = 'general_advice' # DB 검색을 건너뛰는 타입으로 강제 지정
                print("🚨 인삿말/감사 표현 감지: 'general_advice' 타입으로 강제 변경했습니다.")

            print(f"📋 통합 스트리밍 분석: type={question_type}, keyword={keyword}")
            
            
            # ----------------------------------------------------
            # 1. 비검색 질문 처리 (self_introduction, comparison, general_advice)
            # ----------------------------------------------------
            if question_type == "self_introduction" or question_type in ["comparison", "general_advice"]:
                
                prompt_data = {
                    "self_introduction": (ChatIntegratedService.SELF_INTRODUCTION_PROMPT, 150, 0.5),
                    "comparison": (GENERAL_COMPARISON_PROMPT.format(message=message), 350, 0.7),
                    "general_advice": (GENERAL_ADVICE_PROMPT.format(message=message), 350, 0.7)
                }.get(question_type)
                
                # ❗ 질문 타입이 'general_advice' 이면서 명확한 prompt_data가 없을 경우, 일반 대화로 처리
                if not prompt_data and question_type == 'general_advice':
                    prompt_text, max_tokens, temperature = (f"{ChatIntegratedService.GENERAL_CONVERSATION_PROMPT} 사용자의 질문: {message}", 200, 0.6)
                elif not prompt_data:
                    raise ValueError(f"Unknown question_type or prompt configuration: {question_type}")
                else:
                    prompt_text = prompt_data[0]
                    max_tokens = prompt_data[1]
                    temperature = prompt_data[2]
                    
                # GPT 스트리밍 실행
                yield f"data: {json.dumps({'type': 'generating', 'message': '🤔 Preparing response...'}, ensure_ascii=False)}\n\n"

                full_response = ""
                for chunk in chat_with_gpt_stream([{"role": "user", "content": prompt_text}], max_tokens=max_tokens, temperature=temperature):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)
                    
                # DB 저장 및 최종 응답
                conversation = Conversation(user_id=user_id, question=message, response=full_response)
                db.add(conversation); db.commit(); db.refresh(conversation)
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id, 'results': [], 'has_results': False}, ensure_ascii=False)}\n\n"
                return
                
            # ----------------------------------------------------
            # 2. 랜덤 추천 처리 (기존 로직 유지)
            # ----------------------------------------------------
            elif question_type == "random_recommendation":
                yield f"data: {json.dumps({'type': 'random', 'message': '🎲 Finding random items...'}, ensure_ascii=False)}\n\n"
                target_type = "kcontent"
                if "restaurant" in keyword.lower(): target_type = "restaurant"
                elif "drama" not in keyword.lower() and "k-pop" in keyword.lower(): target_type = "entertainment"
                
                random_items = ChatIntegratedService._get_random_items(count=count, data_type=target_type)
                
                ai_response = f"🎯 {target_type.upper()} 랜덤 추천 결과: {len(random_items)}개 항목을 찾아왔어요! 지도에서 확인해 보세요! ✨"
                map_markers = ChatIntegratedService._create_map_markers(random_items)
                
                conversation = Conversation(user_id=user_id, question=message, response=ai_response)
                db.add(conversation); db.commit(); db.refresh(conversation)
                
                yield f"data: {json.dumps({'type': 'done', 'full_response': ai_response, 'results': random_items, 'convers_id': conversation.convers_id, 'has_results': True, 'map_markers': map_markers}, ensure_ascii=False)}\n\n"
                return

            # ----------------------------------------------------
            # 3. 검색 시도 (kcontent_search, restaurant_search, entertainment_search, proximity_search, or default search_or_general)
            # ----------------------------------------------------
            search_type = question_type.replace('_search', '') if '_search' in question_type else question_type
            best_item = None

            yield f"data: {json.dumps({'type': 'searching', 'message': f'🔍 Searching for {search_type} item...'}, ensure_ascii=False)}\n\n"
            
            if question_type == "kcontent_search" or search_type == "search_or_general": # search_or_general은 kcontent로 우선 시도
                best_item = ChatIntegratedService._search_best_kcontent(keyword)
            elif question_type == "restaurant_search" or question_type == "proximity_search":
                best_item = ChatIntegratedService._search_best_restaurant(keyword)
            elif question_type == "entertainment_search":
                best_item = ChatIntegratedService._search_best_entertainment(keyword)
            
            # ----------------------------------------------------
            # 4. 검색 결과 처리 및 일반 대화 Fallback (검색 실패 시)
            # ----------------------------------------------------
            if not best_item:
                # ❗ 검색 실패: 일반 대화 모드로 전환
                print(f"❌ 검색 실패 (Type: {question_type}). 일반 대화로 전환합니다.")
                
                prompt = f"{ChatIntegratedService.GENERAL_CONVERSATION_PROMPT} 사용자의 질문: {message}"
                yield f"data: {json.dumps({'type': 'generating', 'message': '💬 Switching to general conversation mode...'}, ensure_ascii=False)}\n\n"

                full_response = ""
                for chunk in chat_with_gpt_stream([{"role": "user", "content": prompt}], max_tokens=250, temperature=0.7):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)

                conversation = Conversation(user_id=user_id, question=message, response=full_response)
                db.add(conversation); db.commit(); db.refresh(conversation)

                yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id, 'results': [], 'has_results': False}, ensure_ascii=False)}\n\n"
                return 
                
            # ----------------------------------------------------
            # 5. 검색 성공 시 (기존 로직 유지)
            # ----------------------------------------------------
            else:
                title = best_item.get('title', 'Found Item')
                yield f"data: {json.dumps({'type': 'found', 'title': title, 'result': best_item}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'generating', 'message': f'🎤 Preparing {search_type} info...'}, ensure_ascii=False)}\n\n"

                full_response = ""
                prompt = ChatIntegratedService._get_gpt_prompt(message, best_item) 
                
                for chunk in chat_with_gpt_stream([{"role": "user", "content": prompt}], max_tokens=250, temperature=0.6):
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)
                
                conversation = Conversation(user_id=user_id, question=message, response=full_response)
                db.add(conversation); db.commit(); db.refresh(conversation)
                
                map_markers = ChatIntegratedService._create_map_markers([best_item])
                
                completion_data = {
                    'type': 'done', 'full_response': full_response, 'convers_id': conversation.convers_id,
                    'results': [best_item], 
                    'has_results': True, 'map_markers': map_markers
                }
                
                yield f"data: {json.dumps(completion_data, ensure_ascii=False)}\n\n"
                return
        
        except Exception as e:
            print(f"❌ 통합 서비스 Streaming 오류: {e}")
            traceback.print_exc() 
            yield f"data: {json.dumps({'type': 'error', 'message': '서버 처리 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}, ensure_ascii=False)}\n\n"


    # ===== 🔧 최종 응답 생성 헬퍼 (이전 내용 유지) =====

    @staticmethod
    def _generate_final_response(message: str, results: List[Dict]) -> str:
        # ... (이전 코드 유지)
        try:
            if not results:
                return "죄송해요! 해당 키워드와 일치하는 K-Pop, K-Drama, 레스토랑 또는 엔터테인먼트 정보를 찾지 못했습니다. 😥 다른 키워드로 다시 시도해 주시겠어요?"
            
            if len(results) == 1:
                return ChatIntegratedService._gpt_response(message, results[0])
            
            else:
                return f"🌟 {len(results)}개의 멋진 장소를 찾았습니다! 각 장소의 자세한 정보는 아래 카드를 확인해 주세요! ✨"
                
        except Exception as e:
            print(f"❌ 최종 응답 생성 오류: {e}")
            return "응답을 생성하는 데 문제가 발생했지만, 정보를 찾았습니다! 아래 카드를 확인해 주세요. 😊"
    
    @staticmethod
    def _get_gpt_prompt(message: str, item: Dict) -> str:
        # ... (이전 코드 유지)
        data_type = item.get('type', 'kcontent')
        
        if data_type == "kcontent":
            prompt_template = KCONTENT_QUICK_PROMPT
            return prompt_template.format(
                drama_name_en=item.get('drama_name_en', ''), 
                drama_name=item.get('drama_name', ''),
                location_name=item.get('location_name', ''),
                address=item.get('address', ''),
                image_url=item.get('image_url', ''),
                tip=item.get('tip', '')[:500],
                message=message
            )
        elif data_type == "restaurant":
            prompt_template = RESTAURANT_QUICK_PROMPT
            return prompt_template.format(
                name=item.get('title', ''), address=item.get('address', ''),
                category=item.get('category', ''), tip=item.get('tip', '')[:500],
                message=message
            )
        else: # entertainment
            prompt_template = ENTERTAINMENT_QUICK_PROMPT
            return prompt_template.format(
                name=item.get('title', ''), address=item.get('address', ''),
                category=item.get('category', ''), tip=item.get('tip', '')[:500],
                message=message
            )
    
    @staticmethod
    def get_conversation_history(db: Session, user_id: int, limit: int = 50) -> List[Dict]:
        # ... (이전 코드 유지)
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