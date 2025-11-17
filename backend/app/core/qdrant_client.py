# app/core/qdrant_client.py
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from typing import Dict, Any

# 🎯 설정 상수
QDRANT_URL = "http://172.17.0.1:6333"
KCONTENT_COLLECTION = "seoul-kcontents"
RESTAURANT_COLLECTION = "seoul-restaurant"
ENTERTAINMENT_COLLECTION = "seoul-entertainment"

COLLECTION_MAPPING = {
    "kcontent": KCONTENT_COLLECTION,
    "restaurant": RESTAURANT_COLLECTION,
    "entertainment": ENTERTAINMENT_COLLECTION
}

# 🚀 캐시 변수
_embedding_model = None
_qdrant_client = None

def get_embedding_model() -> OpenAIEmbeddings:
    """임베딩 모델 싱글톤 패턴으로 재사용"""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = OpenAIEmbeddings(model="text-embedding-ada-002")
    return _embedding_model

def get_qdrant_client() -> QdrantClient:
    """Qdrant 클라이언트 싱글톤 패턴으로 재사용"""
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            url=QDRANT_URL,
            timeout=60,
            prefer_grpc=False
        )
    return _qdrant_client

def get_collection_name(data_type: str = "kcontent") -> str:
    """데이터 유형에 따라 컬렉션 이름을 반환"""
    data_type = data_type.lower()
    
    if data_type in COLLECTION_MAPPING:
        return COLLECTION_MAPPING[data_type]
    
    raise ValueError(f"Unknown data type: {data_type}. Supported types are: {list(COLLECTION_MAPPING.keys())}.")