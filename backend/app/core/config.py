from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus

class Settings(BaseSettings):
    # 데이터베이스
    DATABASE_HOST: str = "db"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "ktravel"
    DATABASE_USER: str = "ktravel_user"
    DATABASE_PASSWORD: str = "ktravel_password"
    
    # Redis (세션 저장소)
    REDIS_URL: str = "redis://redis:6379/0"
    
    # 세션 설정
    SECRET_KEY: str = "your-secret-key-change-this"
    SESSION_EXPIRE_HOURS: int = 24
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Kakao API
    KAKAO_REST_API_KEY: str = ""
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Qdrant 설정
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "seoul-festival"
    
    @property
    def DATABASE_URL(self) -> str:
        encoded_password = quote_plus(self.DATABASE_PASSWORD)
        return f"postgresql+psycopg2://{self.DATABASE_USER}:{encoded_password}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
