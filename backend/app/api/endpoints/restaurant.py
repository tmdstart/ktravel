from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from app.database.connection import get_db
from app.models.restaurant import Restaurant

router = APIRouter(
    prefix="/restaurants",
    tags=["Restaurant Map"],
)


@router.get("/map", summary="음식점 지도 데이터 조회")
def get_restaurants_for_map(
    db: Session = Depends(get_db),
    keyword: Optional[str] = Query(None, description="음식점 이름 또는 지하철 검색"),
    limit: int = Query(100, description="최대 조회 개수 (기본 100개)")
):
    """
    ✅ 음식점 지도 마커용 데이터 조회

    - 좌표, 이미지, 이름 제공
    - keyword가 있으면 필터링
    """
    query = db.query(Restaurant)

    if keyword:
        search = f"%{keyword}%"
        query = query.filter(
            (Restaurant.restaurant_name.ilike(search)) |
            (Restaurant.near_subway.ilike(search)) |
            (Restaurant.place.ilike(search))
        )

    results = query.limit(limit).all()

    if not results:
        raise HTTPException(status_code=404, detail="검색된 음식점이 없습니다")

    return [
        {
            "id": item.restaurant_id,
            "name": item.restaurant_name,
            "image": item.image_path,
            "place": item.place,
            "latitude": float(item.Latitude) if item.Latitude else None,
            "longitude": float(item.Longitude) if item.Longitude else None,
            "near_subway": item.near_subway,
        }
        for item in results
    ]


@router.get("/nearby", summary="주변 음식점 조회 (500m 반경)")
def get_nearby_restaurants(
    lat: float = Query(..., description="K-Content 목적지 위도"),
    lng: float = Query(..., description="K-Content 목적지 경도"),
    radius: int = Query(500, description="검색 반경 (미터 단위, 기본 500m)", ge=100, le=5000),
    db: Session = Depends(get_db)
):
    """
    ✅ K-Content 목적지 주변 음식점 조회 (Haversine 공식 사용)
    
    **사용 예시:**
    - `/restaurants/nearby?lat=37.5665&lng=126.9780&radius=500`
    
    **파라미터:**
    - `lat`: 목적지 위도 (필수)
    - `lng`: 목적지 경도 (필수)
    - `radius`: 검색 반경 (기본 500m, 최소 100m, 최대 5000m)
    
    **반환 데이터:**
    - 거리순으로 정렬된 음식점 목록
    - 각 음식점의 좌표, 이름, 거리 포함
    """
    try:
        # ✅ Haversine 공식: 두 지점 간 거리 계산 (단위: km)
        # 6371 = 지구 반지름 (km)
        query = text("""
            SELECT *
            FROM (
                SELECT
                    restaurant_id,
                    restaurant_name_en AS name,
                    place_en AS place,
                    image_path,
                    latitude,
                    longitude,
                    near_subway_en AS near_subway,
                    type_en AS type,
                    description_clean_en AS description_clean,
                    (6371 * 1000 * acos(
                        cos(radians(:lat)) * cos(radians(latitude)) *
                        cos(radians(longitude) - radians(:lng)) +
                        sin(radians(:lat)) * sin(radians(latitude))
                    )) AS distance_meters
                FROM celeb_restaurants
                WHERE
                    latitude IS NOT NULL
                    AND longitude IS NOT NULL
            ) AS sub
            WHERE sub.distance_meters <= :radius
            ORDER BY sub.distance_meters ASC
        """)

        params = {
            "lat": lat,
            "lng": lng,
            "radius": radius  # 미터 단위로 직접 비교
        }

        result = db.execute(query, params)
        rows = result.fetchall()

        # ✅ 결과를 딕셔너리로 변환
        restaurants = []
        for row in rows:
            restaurants.append({
                "restaurant_id": row.restaurant_id,
                "name": row.name,
                "place": row.place,
                "image": row.image_path,
                "latitude": float(row.latitude) if row.latitude else None,
                "longitude": float(row.longitude) if row.longitude else None,
                "near_subway": row.near_subway,
                "type": row.type,
                "description": row.description_clean,
                "distance_meters": round(row.distance_meters, 1)  # 소수점 1자리
            })

        return {
            "success": True,
            "count": len(restaurants),
            "restaurants": restaurants,
            "search_params": {
                "center_lat": lat,
                "center_lng": lng,
                "radius_meters": radius
            }
        }

    except Exception as e:
        print(f"❌ 주변 음식점 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"쿼리 실패: {str(e)}")


@router.get("/search", summary="음식점 검색 (키워드)")
def search_restaurants(
    keyword: str = Query(..., min_length=1, description="검색 키워드"),
    limit: int = Query(20, description="최대 조회 개수", ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ✅ 음식점 이름, 장소, 지하철역으로 검색
    
    **사용 예시:**
    - `/restaurants/search?keyword=강남&limit=10`
    """
    search = f"%{keyword}%"
    
    results = db.query(Restaurant).filter(
        (Restaurant.restaurant_name.ilike(search)) |
        (Restaurant.place.ilike(search)) |
        (Restaurant.near_subway.ilike(search))
    ).limit(limit).all()

    if not results:
        return {
            "success": True,
            "count": 0,
            "restaurants": [],
            "message": f"'{keyword}' 검색 결과가 없습니다."
        }

    return {
        "success": True,
        "count": len(results),
        "restaurants": [item.to_dict() for item in results]
    }


@router.get("/{restaurant_id}", summary="음식점 상세 정보")
def get_restaurant_detail(
    restaurant_id: int,
    db: Session = Depends(get_db)
):
    """
    ✅ 특정 음식점의 상세 정보 조회
    """
    restaurant = db.query(Restaurant).filter(
        Restaurant.restaurant_id == restaurant_id
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=404, 
            detail=f"restaurant_id={restaurant_id}인 음식점을 찾을 수 없습니다."
        )

    return {
        "success": True,
        "restaurant": restaurant.to_dict()
    }