// src/components/NaverMap.jsx
import React, { useEffect, useRef, useState } from 'react';

const NAVER_MAPS_CLIENT_ID = process.env.REACT_APP_NAVER_MAPS_CLIENT_ID;
const NAVER_MAPS_URL = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}&language=en&submodules=geocoder`;

const NaverMap = () => {
    const mapElement = useRef(null);
    const mapLoaded = useRef(false);
    const [map, setMap] = useState(null);
    const [markers, setMarkers] = useState([]);

    useEffect(() => {
        const initializeMap = () => {
            if (mapLoaded.current || !window.naver || !window.naver.maps) return;

            if (mapElement.current) {
                mapLoaded.current = true;

                const mapOptions = {
                    center: new window.naver.maps.LatLng(37.5665, 126.9780),
                    zoom: 12,
                    mapTypeId: window.naver.maps.MapTypeId.NORMAL
                };

                const newMap = new window.naver.maps.Map(mapElement.current, mapOptions);
                setMap(newMap);
            }
        };

        if (window.naver && window.naver.maps) {
            initializeMap();
            return;
        }

        const script = document.createElement('script');
        script.src = NAVER_MAPS_URL;
        script.async = true;
        script.onload = initializeMap;
        script.onerror = () => console.error("네이버 지도 API 로드 실패. Client ID 확인 필요");
        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    // 🎯 통합 마커 추가 함수 (축제 + 관광명소)
    useEffect(() => {
        if (map) {
            window.addMapMarkers = (mapMarkers) => {
                addMarkers(mapMarkers);
            };
            
            // 기존 호환성 유지
            window.addFestivalMarkers = (mapMarkers) => {
                addMarkers(mapMarkers);
            };
        }
    }, [map]);

    // 🎯 일정에 추가 (축제 + 관광명소 모두 지원)
    const addToDestinations = async (markerData, itemId) => {
        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                alert('로그인이 필요합니다.');
                return;
            }

            const dayInput = document.getElementById(`dayInput_${itemId}`);
            const dayNumber = parseInt(dayInput.value) || 1;
            
            if (dayNumber < 1 || dayNumber > 30) {
                alert('❌ 1일차부터 30일차까지만 입력 가능합니다.');
                return;
            }

            // 🎯 타입에 따라 place_type 결정
            const placeType = markerData.type === 'attraction' ? 1 : 2;  // 1: 관광명소, 2: 축제
            const referenceId = markerData.type === 'attraction' 
                ? markerData.attr_id 
                : markerData.festival_id;

            const destinationData = {
                name: markerData.title,
                day_number: dayNumber,
                place_type: placeType,
                reference_id: referenceId,
                latitude: parseFloat(markerData.latitude),
                longitude: parseFloat(markerData.longitude)
            };

            const response = await fetch('http://localhost:8000/api/destinations/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionId}`
                },
                body: JSON.stringify(destinationData)
            });

            if (response.ok) {
                alert(`✅ "${markerData.title}"이(가) ${dayNumber}일차 일정에 추가되었습니다!`);
            } else {
                const error = await response.json();
                alert(`❌ 추가 실패: ${error.message || '오류가 발생했습니다.'}`);
            }
        } catch (error) {
            console.error('Error adding destination:', error);
            alert('❌ 목적지 추가 중 오류가 발생했습니다.');
        }
    };

    const addMarkers = (mapMarkers) => {
        if (!map || !mapMarkers || mapMarkers.length === 0) return;

        // 기존 마커들 제거
        markers.forEach(marker => marker.setMap(null));
        
        const newMarkers = [];

        mapMarkers.forEach((markerData) => {
            if (markerData.latitude && markerData.longitude) {
                
                // 🎯 마커 아이콘 타입별 구분
                const markerIcon = markerData.type === 'attraction' 
                    ? {
                        content: '<div style="background: #4285f4; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">📍</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    }
                    : {
                        content: '<div style="background: #ea4335; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🎭</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    };

                const marker = new window.naver.maps.Marker({
                    position: new window.naver.maps.LatLng(markerData.latitude, markerData.longitude),
                    map: map,
                    title: markerData.title,
                    icon: markerIcon
                });

                // 🎯 정보창 내용 - 타입별로 다르게 표시
                const itemId = markerData.type === 'attraction' ? markerData.attr_id : markerData.festival_id;
                
                // 🎯 이미지 URL 가져오기
                let imageUrl = null;
                if (markerData.type === 'festival' && markerData.image_url) {
                    imageUrl = markerData.image_url;
                } else if (markerData.type === 'attraction' && markerData.image_urls) {
                    // image_urls가 배열이면 첫 번째, 문자열이면 그대로 사용
                    imageUrl = Array.isArray(markerData.image_urls) 
                        ? markerData.image_urls[0] 
                        : markerData.image_urls;
                }
                
                let infoContent = `
                    <div style="padding: 15px; max-width: 280px; font-family: Arial, sans-serif;">
                `;
                
                // 🎯 이미지 표시
                if (imageUrl) {
                    infoContent += `
                        <div style="margin-bottom: 10px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <img 
                                src="${imageUrl}" 
                                alt="${markerData.title}"
                                style="
                                    width: 100%;
                                    height: 150px;
                                    object-fit: cover;
                                    display: block;
                                "
                                onerror="this.style.display='none'"
                            />
                        </div>
                    `;
                }
                
                infoContent += `
                        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: bold;">
                            ${markerData.type === 'attraction' ? '📍' : '🎭'} ${markerData.title}
                        </h4>
                `;

                // 축제 정보
                if (markerData.type === 'festival') {
                    if (markerData.start_date && markerData.end_date) {
                        infoContent += `
                            <p style="margin: 5px 0; font-size: 13px; color: #666; background: #fff3cd; padding: 4px 8px; border-radius: 4px;">
                                📅 ${markerData.start_date} ~ ${markerData.end_date}
                            </p>
                        `;
                    }
                }
                
                // 관광명소 정보
                if (markerData.type === 'attraction') {
                    if (markerData.address) {
                        infoContent += `
                            <p style="margin: 5px 0; font-size: 12px; color: #666;">
                                📍 ${markerData.address.substring(0, 40)}${markerData.address.length > 40 ? '...' : ''}
                            </p>
                        `;
                    }
                    if (markerData.phone && markerData.phone !== 'nan') {
                        infoContent += `
                            <p style="margin: 5px 0; font-size: 12px; color: #666;">
                                📞 ${markerData.phone}
                            </p>
                        `;
                    }
                }

                infoContent += `
                    <!-- 일차 입력 -->
                    <div style="margin: 10px 0; text-align: center;">
                        <input 
                            type="number" 
                            id="dayInput_${itemId}" 
                            placeholder="몇일차?" 
                            min="1" 
                            max="30"
                            value="1"
                            style="
                                width: 80px;
                                padding: 6px 8px;
                                border: 2px solid #ddd;
                                border-radius: 4px;
                                text-align: center;
                                font-size: 14px;
                                margin-right: 8px;
                            "
                        />
                        <span style="font-size: 13px; color: #666;">일차</span>
                    </div>
                    
                    <div style="margin-top: 12px; text-align: center;">
                        <button 
                            onclick="addToDestinations_${itemId}()" 
                            style="
                                background: ${markerData.type === 'attraction' ? '#4285f4' : '#ff4444'};
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: bold;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                transition: all 0.3s ease;
                            "
                            onmouseover="this.style.transform='translateY(-1px)'"
                            onmouseout="this.style.transform='translateY(0px)'"
                        >
                            ➕ Add to Schedule
                        </button>
                    </div>
                </div>
                `;

                const infoWindow = new window.naver.maps.InfoWindow({
                    content: infoContent
                });

                // 🎯 각 마커별 고유한 전역 함수 생성
                window[`addToDestinations_${itemId}`] = () => {
                    addToDestinations(markerData, itemId);
                };

                window.naver.maps.Event.addListener(marker, 'click', () => {
                    infoWindow.open(map, marker);
                });

                newMarkers.push(marker);
            }
        });

        setMarkers(newMarkers);

        // 첫 번째 마커로 이동
        if (newMarkers.length > 0) {
            const firstMarker = mapMarkers[0];
            map.setCenter(new window.naver.maps.LatLng(firstMarker.latitude, firstMarker.longitude));
            map.setZoom(13);
        }
    };

    return (
        <div
            ref={mapElement}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '400px',
            }}
        >
            {!mapLoaded.current && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    지도를 로딩 중입니다...
                </div>
            )}
        </div>
    );
};

export default NaverMap;