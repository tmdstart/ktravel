// src/components/location_modal/MapModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import './MapModal.css'

// 📌 이미지 import: MapModal.jsx (src/components/location_modal/) 기준 상대 경로
import ConcertMarkerImg from '../../assets/concert_marker.png'; 

// 네이버 지도 클라이언트 ID를 환경 변수에서 가져옵니다.
const NAVER_MAPS_CLIENT_ID = process.env.REACT_APP_NAVER_MAPS_CLIENT_ID;

// 📌 요청하신 URL: submodules=panorama&language=en
const NAVER_MAPS_URL = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}&submodules=panorama&language=en`;

const MapModal = ({ concert, onClose, onAddSchedule }) => {
    // 지도를 렌더링할 DOM 요소를 참조하기 위한 ref
    const mapElement = useRef(null);
    // naver.maps가 완전히 준비되었는지를 나타내는 상태
    const [mapReady, setMapReady] = useState(false); 
    
    // 임시 좌표 설정 (장소 검색 불가능 시)
    const [mapCenter, setMapCenter] = useState(null); 
    
    // 📌 안정적인 API 로딩 로직 (이전 에러 해결 목적)
    useEffect(() => {
        let timerId = null;

        // 맵 API가 실제로 사용 가능한지 확인하는 함수
        const checkNaverMapReadiness = () => {
            // window.naver와 window.naver.maps가 모두 존재할 때만 준비 완료로 간주
            if (window.naver && window.naver.maps) {
                clearTimeout(timerId);
                setMapReady(true);
                // API 준비 완료 시 임시 중심 좌표 설정
                setMapCenter(new window.naver.maps.LatLng(37.5665, 126.9780)); // 서울 시청 임시 좌표
            } else {
                // 아직 준비 안 됨, 100ms 후 다시 확인 (폴링)
                timerId = setTimeout(checkNaverMapReadiness, 100); 
            }
        };

        // 스크립트 로드
        if (!window.naver && NAVER_MAPS_CLIENT_ID && !document.getElementById('naver-map-script')) {
            const script = document.createElement('script');
            script.src = NAVER_MAPS_URL;
            script.async = true;
            script.id = 'naver-map-script';
            document.head.appendChild(script);

            // 스크립트 로드 완료 후 준비 확인 시작
            script.onload = checkNaverMapReadiness;
            
        } else if (window.naver && !mapReady) {
            // 이미 스크립트는 로드되었지만 mapReady가 false인 경우 (재실행)
            checkNaverMapReadiness();
        }

        return () => {
            // 컴포넌트 언마운트 시 타이머 정리
            if (timerId) clearTimeout(timerId);
        };
    }, [mapReady, NAVER_MAPS_CLIENT_ID]);


    // 지도 렌더링 및 마커 표시 로직
    useEffect(() => {
        // mapReady 상태가 true여야 지도 객체(window.naver.maps)에 접근 가능
        if (!mapReady || !mapElement.current || !mapCenter) return;

        const naver = window.naver;
        
        // 1. 지도 생성 옵션 (영문)
        const mapOptions = {
            center: mapCenter, 
            zoom: 15, 
            mapTypeId: naver.maps.MapTypeId.NORMAL,
            mapTypeControl: true,
            scaleControl: true,
            logoControl: true,
            language: 'en'
        };

        // 2. 지도 렌더링
        const map = new naver.maps.Map(mapElement.current, mapOptions);

        // 📌 3. 마커 이미지 설정
        const customMarkerImage = {
            url: ConcertMarkerImg, // import된 이미지 URL 변수 사용
            size: new naver.maps.Size(50, 50),
            scaledSize: new naver.maps.Size(32, 45),
            // 마커 이미지의 하단 중앙을 좌표에 맞춤
            anchor: new naver.maps.Point(16, 32) 
        };

        // 4. 마커 표시 (커스텀 이미지 적용)
        new naver.maps.Marker({
            position: mapCenter,
            map: map,
            title: concert.title,
            icon: customMarkerImage // 📌 커스텀 마커 이미지 적용
        });

    }, [mapReady, mapCenter, concert.title]); // mapReady가 true가 될 때 재실행

    // 장소 추가 버튼 클릭 핸들러
    const handleAddClick = () => {
        onAddSchedule(concert);
        onClose(); 
    };

    return (
        <div className="map-modal-overlay" onClick={onClose}>
            <div className="map-modal-content" onClick={e => e.stopPropagation()}>
                <button className="map-modal-close" onClick={onClose}>×</button>
                
                <h2>{concert.title} Location</h2>
                <p className="modal-place-name">Place: {concert.place}</p>
                
                {/* 📌 지도 표시 영역 (ref 연결) */}
                <div 
                    ref={mapElement} 
                    className="map-container" 
                    style={{ height: '350px' }}
                >
                    {/* 지도가 로드되지 않았을 때 표시될 로딩 메시지 */}
                    {!mapReady && (
                         <p style={{textAlign: 'center', paddingTop: '150px', color: '#666'}}>
                             Loading Map API...
                         </p>
                    )}
                </div>

                {/* 📌 장소 추가 버튼 */}
                <button className="modal-add-schedule-button" onClick={handleAddClick}>
                    Add Place to Schedule 💜
                </button>
            </div>
        </div>
    );
};

export default MapModal;