from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    tags=["Map Search & Geocoding"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# ✅ Google Geocoding API Endpoint
GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"


async def get_coordinates_from_google(query: str) -> Dict[str, float]:
    """
    Google Geocoding API로 좌표를 조회하는 함수
    """
    params = {
        "address": query,
        "key": GOOGLE_API_KEY,
        "language": "en"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(GEOCODING_URL, params=params)
        data = response.json()

        if data["status"] != "OK":
            return None

        location = data["results"][0]["geometry"]["location"]

        return {
            "latitude": location["lat"],
            "longitude": location["lng"]
        }


@router.get("/location", response_model=Dict[str, Any])
async def search_location_endpoint(
    query: str = Query(..., description="검색할 장소 이름 또는 주소")
):
    """
    ✅ GET /search/location
    구글 API를 호출해 실제 좌표 반환
    """

    if not GOOGLE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="환경 변수 GOOGLE_API_KEY 가 설정되지 않았습니다. `.env` 확인!"
        )

    coords = await get_coordinates_from_google(query)

    if not coords:
        raise HTTPException(
            status_code=404,
            detail=f"구글 API에서 '{query}' 에 대한 좌표를 찾지 못했습니다."
        )

    return {
        "query": query,
        "latitude": coords["latitude"],
        "longitude": coords["longitude"],
        "message": f"'{query}' 의 좌표 조회 성공"
    }
