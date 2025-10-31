import requests
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any

# 환경 변수에서 ODSAY_API_KEY를 불러옵니다.
ODSAY_API_KEY = os.getenv("ODSAY_API_KEY") 
ODSAY_URL = "https://api.odsay.com/v1/api/searchPubTransPathT?lang=1"

router = APIRouter(
    prefix="/api",
    tags=["kpath-map"],
)

# ----------------------------------------------------
# Pydantic 모델 정의
# ----------------------------------------------------

class RouteRequest(BaseModel):
    """경로 검색 요청 모델"""
    startLat: float = Field(..., description="출발지 위도")
    startLng: float = Field(..., description="출발지 경도")
    endLat: float = Field(..., description="도착지 위도")
    endLng: float = Field(..., description="도착지 경도")

class PathNode(BaseModel):
    """경로의 한 지점 (좌표)"""
    lat: float
    lng: float

class SegmentPath(BaseModel):
    """구간별 폴리라인 및 타입 정보"""
    trafficType: int                     # 1: 지하철, 2: 버스, 3: 도보
    coordinates: List[PathNode]

class RouteResponse(BaseModel):
    """경로 검색 응답 모델 (프론트엔드로 반환)"""
    segmentedPath: List[SegmentPath] = Field(..., description="구간별 교통수단 타입과 좌표 리스트")
    totalTime: int = Field(..., description="총 소요 시간 (분)")
    fare: int = Field(..., description="요금 (원)")
    subPath: List[Dict[str, Any]] = Field(..., description="경로 단계별 상세 정보")
    fullData: Dict[str, Any] = Field(..., description="ODSAY API 원본 응답 데이터 전체")

# ----------------------------------------------------
# 도보/대중교통 영문 변환 로직
# ----------------------------------------------------

TRAFFIC_MAP = {
    1: "Subway",
    2: "Bus",
    3: "Walk"
}

def convert_to_english(sub_path: Dict[str, Any]) -> None:
    """
    subPath 항목을 영문으로 변환
    - trafficName: Subway / Bus / Walk
    - sectionTimeText: "Walk 4 min" 등
    """
    traffic_type = sub_path.get('trafficType', 3)
    sub_path['trafficName'] = TRAFFIC_MAP.get(traffic_type, "Unknown")
    
    # 도보일 경우 안내 문구를 Walk X min 형태로
    time_min = sub_path.get('sectionTime', 0)
    if traffic_type == 3:
        sub_path['sectionTimeText'] = f"Walk {time_min} min"
    else:
        sub_path['sectionTimeText'] = f"{time_min} min"

# ----------------------------------------------------
# 경로 검색 엔드포인트
# ----------------------------------------------------

@router.post("/search/route", response_model=RouteResponse)
async def search_route(request: RouteRequest):
    """
    POST /api/search/route
    ODsay API를 호출하고 구간별 폴리라인, 상세 경로 정보를 반환합니다.
    """
    if not ODSAY_API_KEY:
        raise HTTPException(status_code=500, detail="서버 환경 설정 오류: ODSAY_API_KEY가 설정되지 않았습니다.")

    params = {
        'apiKey': ODSAY_API_KEY, 
        'SX': request.startLng,
        'SY': request.startLat,
        'EX': request.endLng,
        'EY': request.endLat,
        'CID': 1000,
        'output': 'json'
    }

    try:
        response = requests.get(ODSAY_URL, params=params, timeout=10)
        response.raise_for_status()
        data: Dict[str, Any] = response.json()

        if data.get('error'):
            error_msg = data['error']['message']
            raise HTTPException(status_code=404, detail=f"ODsay 경로 검색 실패: {error_msg}")

        if not data.get('result') or not data['result'].get('path'):
            raise HTTPException(status_code=404, detail="출발지/도착지 사이의 유효한 경로를 찾을 수 없습니다.")

        path_result = data['result']['path'][0]

        # 1. 핵심 정보 추출
        total_time = path_result['info'].get('totalTime', 0)
        fare = path_result['info'].get('payment', 0)
        sub_paths = path_result.get('subPath', [])

        # 2. subPath 항목 영문 변환
        for sub_path in sub_paths:
            convert_to_english(sub_path)

        # 3. 폴리라인 좌표 추출 및 세그먼트 생성
        segmented_paths: List[SegmentPath] = []
        current_segment_coords: List[PathNode] = [PathNode(lat=request.startLat, lng=request.startLng)]

        for sub_path in sub_paths:
            traffic_type = sub_path.get('trafficType', 3)
            segment_coords = []

            if current_segment_coords:
                segment_coords.append(current_segment_coords[-1])

            if sub_path.get('passStopList') and sub_path['passStopList'].get('stations'):
                for station in sub_path['passStopList']['stations']:
                    segment_coords.append(PathNode(lat=station['y'], lng=station['x']))

            if sub_path.get('endX'):
                segment_coords.append(PathNode(lat=sub_path['endY'], lng=sub_path['endX']))

            if len(segment_coords) > 1:
                segmented_paths.append(SegmentPath(
                    trafficType=traffic_type,
                    coordinates=segment_coords
                ))

            current_segment_coords = segment_coords

        # 4. 최종 응답 반환
        return RouteResponse(
            segmentedPath=segmented_paths,
            totalTime=total_time,
            fare=fare,
            subPath=sub_paths,
            fullData=data
        )

    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"외부 API 통신 오류: HTTP {e.response.status_code}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail="외부 경로 API와의 연결에 실패했습니다. (Timeout 등)")
    except HTTPException:
        raise
    except Exception as e:
        print(f"서버 내부 오류: {e}")
        raise HTTPException(status_code=500, detail="경로 데이터 처리 중 알 수 없는 서버 오류가 발생했습니다.")
