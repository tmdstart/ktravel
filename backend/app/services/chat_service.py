# app/services/chat_service.py
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import json
import os
import random
import re
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient

from app.models.conversation import Conversation  
from app.models.festival import Festival
from app.utils.openai_client import chat_with_gpt
from app.utils.prompts import (
    KEYWORD_EXTRACTION_PROMPT,
    FESTIVAL_RESPONSE_PROMPT,
    ATTRACTION_RESPONSE_PROMPT
)

class ChatService:
    
    # 🎯 Qdrant 설정
    QDRANT_URL = "http://172.17.0.1:6333"
    COLLECTION_NAME = "seoul-festival"
    ATTRACTION_COLLECTION = "seoul-attraction"
    
    # 🚀 임베딩 모델 캐싱 (재사용)
    _embedding_model = None
    
    @staticmethod
    def _get_embedding_model():
        """임베딩 모델 싱글톤 패턴으로 재사용"""
        if ChatService._embedding_model is None:
            ChatService._embedding_model = OpenAIEmbeddings(model="text-embedding-ada-002")
        return ChatService._embedding_model
    
    @staticmethod
    def send_message(db: Session, user_id: int, message: str) -> Dict[str, Any]:
        """
        메시지 처리 및 응답 생성 - 축제 + 관광명소 통합 검색 + 랜덤 추천
        🚀 속도 최적화: 단순 쿼리는 짧은 프롬프트 + description 활용
        """
        import time  # 🔍 시간 측정용
        
        try:
            total_start = time.time()
            
            # 🚀 1. 빠른 키워드 추출 (GPT 최소화)
            step_start = time.time()
            analysis = ChatService._analyze_message_fast(message)
            print(f"⏱️ 1. 키워드 추출: {time.time() - step_start:.3f}초")
            
            keyword = analysis.get('keyword', message)
            is_random = analysis.get('is_random_recommendation', False)
            is_simple_query = analysis.get('is_simple_query', False)  # 🚀 NEW
            
            results = []
            
            # 🎯 2-1. 랜덤 추천 요청인 경우
            if is_random:
                step_start = time.time()
                random_attractions = ChatService._get_random_attractions(count=10)
                print(f"⏱️ 2. 랜덤 추천: {time.time() - step_start:.3f}초")
                
                ai_response = ChatService._generate_random_response(random_attractions)
                
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
                    "extracted_destinations": [],
                    "results": random_attractions,
                    "festivals": [],
                    "attractions": random_attractions,
                    "has_festivals": False,
                    "has_attractions": len(random_attractions) > 0,
                    "map_markers": []
                }
            
            # 🚀 2-2. 축제 + 관광명소 검색
            step_start = time.time()
            festival = ChatService._search_best_festival(keyword)
            print(f"⏱️ 2. 축제 검색: {time.time() - step_start:.3f}초")
            if festival:
                festival['type'] = 'festival'
                results.append(festival)
            
            step_start = time.time()
            attraction = ChatService._search_best_attraction(keyword)
            print(f"⏱️ 3. 관광지 검색: {time.time() - step_start:.3f}초")
            if attraction:
                attraction['type'] = 'attraction'
                results.append(attraction)
            
            # 3. 유사도 높은 것 1개만 선택
            if results:
                results.sort(key=lambda x: x['similarity_score'], reverse=True)
                best_result = [results[0]]
            else:
                best_result = []
            
            # 🚀 4. 응답 생성 (description 활용 + 간단한 프롬프트)
            step_start = time.time()
            if is_simple_query and best_result:
                # 단순 쿼리: description 그대로 반환 (GPT 없음)
                ai_response = ChatService._get_description_only(best_result[0])
                print(f"✅ NEW VERSION: GPT 완전 제거 - description만 반환")
                print(f"⏱️ 4. 응답 생성 (단순): {time.time() - step_start:.3f}초")
            else:
                # 복잡한 쿼리: GPT 사용
                ai_response = ChatService._generate_final_response(message, best_result)
                print(f"🤖 복잡한 쿼리 - GPT 사용")
                print(f"⏱️ 4. 응답 생성 (복잡): {time.time() - step_start:.3f}초")
            
            # 5. 대화 저장
            step_start = time.time()
            conversation = Conversation(
                user_id=user_id,
                question=message,
                response=ai_response
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            print(f"⏱️ 5. DB 저장: {time.time() - step_start:.3f}초")
            
            print(f"⏱️ 총 소요 시간: {time.time() - total_start:.3f}초\n")
            
            # 6. 응답 구성
            return {
                "response": ai_response,
                "convers_id": conversation.convers_id,
                "extracted_destinations": [],
                "results": best_result,
                "festivals": [r for r in best_result if r.get('type') == 'festival'],
                "attractions": [r for r in best_result if r.get('type') == 'attraction'],
                "has_festivals": any(r.get('type') == 'festival' for r in best_result),
                "has_attractions": any(r.get('type') == 'attraction' for r in best_result),
                "map_markers": ChatService._create_map_markers(best_result)
            }
            
        except Exception as e:
            raise Exception(f"채팅 처리 중 오류 발생: {str(e)}")
    
    @staticmethod
    def _analyze_message_fast(message: str) -> Dict[str, Any]:
        """
        🚀 최적화: 빠른 키워드 분석 (GPT 호출 최소화)
        """
        try:
            message_lower = message.lower()
            
            # 🎯 1단계: 랜덤 추천 감지 (GPT 없이)
            random_keywords = ['가볼만한', '추천', '어디 갈', '관광지', '명소', '갈만한', '여행지', 'recommend']
            if any(keyword in message_lower for keyword in random_keywords):
                print(f"🎲 랜덤 추천 감지: '{message}'")
                return {"is_random_recommendation": True, "keyword": "", "is_simple_query": False}
            
            # 🚀 2단계: 단순 쿼리 감지 (GPT 없이 처리)
            simple_patterns = [
                r'(introduce|introduco|소개|알려|정보|설명|tell me about)',  # 🎯 오타 허용
                r'(what is|뭐야|무엇|어디)',
            ]
            
            is_simple = any(re.search(pattern, message_lower) for pattern in simple_patterns)
            
            if is_simple:
                # 단순 쿼리는 GPT 없이 키워드만 추출
                keyword = ChatService._extract_keyword_simple(message)
                print(f"🚀 단순 쿼리 감지 (GPT 생략): '{keyword}'")
                return {
                    "is_random_recommendation": False,
                    "keyword": keyword,
                    "is_simple_query": True  # 🚀 description 직접 반환
                }
            
            # 🎯 3단계: 복잡한 쿼리만 GPT 사용
            print(f"🤖 복잡한 쿼리 - GPT 사용: '{message}'")
            
            analysis_messages = [
                {
                    "role": "system",
                    "content": KEYWORD_EXTRACTION_PROMPT
                },
                {
                    "role": "user",
                    "content": f"사용자 메시지: \"{message}\""
                }
            ]
            
            gpt_response = chat_with_gpt(analysis_messages)
            
            try:
                result = json.loads(gpt_response)
                result['is_random_recommendation'] = False
                result['is_simple_query'] = False
                print(f"🤖 키워드 추출 성공: {result}")
                return result
            except json.JSONDecodeError:
                print(f"⚠️ JSON 파싱 실패, 원본 사용")
                return {
                    "is_random_recommendation": False,
                    "keyword": message,
                    "is_simple_query": True
                }
                
        except Exception as e:
            print(f"❌ 키워드 추출 오류: {e}")
            import traceback
            traceback.print_exc()
            return {
                "is_random_recommendation": False,
                "keyword": message,
                "is_simple_query": True
            }
    
    @staticmethod
    def _extract_keyword_simple(message: str) -> str:
        """
        🚀 단순 키워드 추출 (GPT 없이)
        """
        remove_words = [
            'introduce', 'tell me about', 'what is', 'where is',
            '소개', '알려줘', '알려', '정보', '설명', '어디', '뭐야', '무엇',
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
    def _get_description_only(result: Dict[str, Any]) -> str:
        """
        🚀 GPT 완전 제거 - description만 반환 (RDB 방식)
        - 10초 → 0초!
        """
        description = result.get('description', '')
        title = result.get('title', '')
        
        if not description or description.strip() == '':
            return f"🎯 {title}에 대한 정보를 찾았습니다! 아래 카드에서 자세한 내용을 확인해주세요 😊"
        
        # 🚀 GPT 없이 description 그대로 반환 (RDB 방식)
        # 사용자가 원하는 긴 설명은 이미 description에 다 있음
        return description
    
    @staticmethod
    def _get_random_attractions(count: int = 10) -> List[Dict[str, Any]]:
        """
        🎯 랜덤 관광명소 추천
        """
        try:
            print(f"🎲 랜덤 관광명소 {count}개 추천 시작...")
            
            qdrant_client = QdrantClient(
                url=ChatService.QDRANT_URL,
                timeout=60,
                prefer_grpc=False
            )
            
            random_offset = random.randint(0, 100)
            
            scroll_result = qdrant_client.scroll(
                collection_name=ChatService.ATTRACTION_COLLECTION,
                limit=count * 3,
                offset=random_offset,
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
        """
        🎯 랜덤 추천 응답 생성
        """
        if not attractions:
            return "죄송합니다. 추천할 관광지를 찾을 수 없습니다. 😢"
        
        return f"🎯 서울의 추천 관광지 {len(attractions)}곳을 아래에 준비했습니다! 자세한 정보가 필요하시면 구체적인 장소명을 말씀해주세요! 😊"
    
    @staticmethod
    def _search_best_festival(keyword: str) -> Dict[str, Any]:
        """
        🎯 축제 벡터 검색
        """
        try:
            qdrant_client = QdrantClient(
                url=ChatService.QDRANT_URL,
                timeout=60,
                prefer_grpc=False
            )
            
            # 🚀 임베딩 모델 재사용
            embedding_model = ChatService._get_embedding_model()
            query_embedding = embedding_model.embed_query(keyword)
            
            search_results = qdrant_client.search(
                collection_name=ChatService.COLLECTION_NAME,
                query_vector=query_embedding,
                limit=1,
                score_threshold=0.3,
                with_payload=True,
                with_vectors=False
            )
            
            if not search_results:
                print(f"🔍 축제 검색 결과 없음: '{keyword}'")
                return None
            
            result = search_results[0]
            festival_data = result.payload.get("metadata", {})
            
            formatted_data = {
                "festival_id": festival_data.get("festival_id", festival_data.get("row")),
                "title": festival_data.get("title"),
                "filter_type": festival_data.get("filter_type"), 
                "start_date": festival_data.get("start_date"),
                "end_date": festival_data.get("end_date"),
                "image_url": festival_data.get("image_url"),
                "detail_url": festival_data.get("detail_url"),
                "latitude": float(festival_data.get("latitude", 0)) if festival_data.get("latitude") else 0.0,
                "longitude": float(festival_data.get("longitude", 0)) if festival_data.get("longitude") else 0.0,
                "description": festival_data.get("description"),
                "similarity_score": result.score
            }
            
            print(f"🎯 축제 검색 성공: '{formatted_data['title']}' (유사도: {result.score:.3f})")
            return formatted_data
            
        except Exception as e:
            print(f"축제 검색 오류: {e}")
            return None
    
    @staticmethod
    def _search_best_attraction(keyword: str) -> Dict[str, Any]:
        """
        🎯 관광명소 벡터 검색
        """
        try:
            qdrant_client = QdrantClient(
                url=ChatService.QDRANT_URL,
                timeout=60,
                prefer_grpc=False
            )
            
            # 🚀 임베딩 모델 재사용
            embedding_model = ChatService._get_embedding_model()
            query_embedding = embedding_model.embed_query(keyword)
            
            search_results = qdrant_client.search(
                collection_name=ChatService.ATTRACTION_COLLECTION,
                query_vector=query_embedding,
                limit=1,
                score_threshold=0.3,
                with_payload=True,
                with_vectors=False
            )
            
            if not search_results:
                print(f"🔍 관광명소 검색 결과 없음: '{keyword}'")
                return None
            
            result = search_results[0]
            attraction_data = result.payload.get("metadata", {})
            
            formatted_data = {
                "attr_id": attraction_data.get("attr_id"),
                "title": attraction_data.get("title"),
                "url": attraction_data.get("url"),
                "description": attraction_data.get("description"),
                "phone": attraction_data.get("phone"),
                "hours_of_operation": attraction_data.get("hours_of_operation"),
                "holidays": attraction_data.get("holidays"),
                "address": attraction_data.get("address"),
                "transportation": attraction_data.get("transportation"),
                "image_urls": attraction_data.get("image_urls"),
                "image_count": attraction_data.get("image_count", 0),
                "latitude": float(attraction_data.get("latitude", 0)),
                "longitude": float(attraction_data.get("longitude", 0)),
                "attr_code": attraction_data.get("attr_code"),
                "similarity_score": result.score
            }
            
            print(f"🎯 관광명소 검색 성공: '{formatted_data['title']}' (유사도: {result.score:.3f})")
            return formatted_data
            
        except Exception as e:
            print(f"관광명소 검색 오류: {e}")
            return None
    
    @staticmethod  
    def _create_map_markers(results_data: List[Dict]) -> List[Dict]:
        """
        지도 마커 데이터 생성 (축제 + 관광명소)
        """
        markers = []
        for item in results_data:
            lat = item.get('latitude', 0.0)
            lng = item.get('longitude', 0.0)
            
            if lat and lng and lat != 0.0 and lng != 0.0:
                marker = {
                    "id": item.get('festival_id') or item.get('attr_id'),
                    "title": item['title'],
                    "latitude": float(lat),
                    "longitude": float(lng),
                    "type": item.get('type', 'festival')
                }
                
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
                
                markers.append(marker)
        
        return markers
    
    @staticmethod
    def _generate_final_response(message: str, results_data: List[Dict]) -> str:
        """
        GPT를 통한 최종 응답 생성 (복잡한 쿼리에만 사용)
        🚀 전체 description 사용
        """
        try:
            if results_data:
                result = results_data[0]
                result_type = result.get('type', 'festival')
                
                # 🚀 전체 description 사용 (잘라내지 않음)
                description = result.get('description', '')
                
                if result_type == 'festival':
                    prompt = FESTIVAL_RESPONSE_PROMPT.format(
                        message=message,
                        title=result.get('title'),
                        start_date=result.get('start_date'),
                        end_date=result.get('end_date'),
                        description=description
                    )
                else:
                    prompt = ATTRACTION_RESPONSE_PROMPT.format(
                        message=message,
                        title=result.get('title'),
                        address=result.get('address'),
                        hours_of_operation=result.get('hours_of_operation'),
                        description=description
                    )
                
                response_messages = [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
                
                return chat_with_gpt(response_messages)
                
            else:
                return "안녕하세요! 축제나 관광명소에 대해 궁금한 것이 있으시면 언제든 물어보세요! 😊"
                
        except Exception as e:
            if results_data:
                result = results_data[0]
                return f"🎯 {result.get('title')}을(를) 찾았습니다! 아래 정보를 확인해주세요 😊"
            else:
                return "안녕하세요! 궁금한 것이 있으시면 언제든 물어보세요! 😊"
    
    @staticmethod
    def get_conversation_history(db: Session, user_id: int, limit: int = 50) -> List[Dict]:
        """
        대화 히스토리 조회
        """
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