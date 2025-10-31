// src/utils/mapUtils.js

// 1. Naver Maps API 로드 상태 확인 함수
export const isNaverMapsLoaded = () => 
    typeof window !== 'undefined' && 
    typeof window.naver !== 'undefined' && 
    typeof window.naver.maps !== 'undefined';

// 2. 위도(Latitude) 읽기 헬퍼
export const readLat = (p) => {
    if (!p) return undefined;
    return p.lat ?? p.latitude ?? p.y ?? p.latitude_y ?? undefined;
};

// 3. 경도(Longitude) 읽기 헬퍼
export const readLng = (p) => {
    if (!p) return undefined;
    return p.lng ?? p.longitude ?? p.x ?? p.longitude_x ?? undefined;
};