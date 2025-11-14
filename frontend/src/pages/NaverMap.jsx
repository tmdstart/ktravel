// src/components/NaverMap.jsx - K-Contents 지원 추가
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
                console.log('🗺️ 네이버 지도 초기화 완료');
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

    // 🎯 통합 마커 추가 함수 (축제 + 관광명소 + 레스토랑 + K-Contents)
    useEffect(() => {
        if (map) {
            console.log('🔧 전역 마커 함수들 등록 중...');
            
            window.addMapMarkers = (mapMarkers) => {
                console.log('📞 addMapMarkers 호출됨');
                addMarkers(mapMarkers);
            };
            
            // 기존 호환성 유지
            window.addFestivalMarkers = (mapMarkers) => {
                console.log('📞 addFestivalMarkers 호출됨');
                addMarkers(mapMarkers);
            };
            
            // 🍽️ 레스토랑 전용 마커 추가 함수
            window.addRestaurantMarkers = (mapMarkers) => {
                console.log('📞 addRestaurantMarkers 호출됨');
                addMarkers(mapMarkers);
            };

            // 🎬 K-Contents 전용 마커 추가 함수  
            window.addKContentMarkers = (mapMarkers) => {
                console.log('📞 addKContentMarkers 호출됨');
                addMarkers(mapMarkers);
            };
            
            console.log('✅ 전역 마커 함수들 등록 완료');
        }
    }, [map]);

    // 🎯 일정에 추가 (축제 + 관광명소 + 레스토랑 + K-Contents 모두 지원)
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
            let placeType, referenceId;
            
            if (markerData.type === 'attraction') {
                placeType = 1;  // 관광명소
                referenceId = markerData.attr_id;
            } else if (markerData.type === 'festival') {
                placeType = 2;  // 축제
                referenceId = markerData.festival_id;
            } else if (markerData.type === 'restaurant') {
                placeType = 0;  // 🍽️ 레스토랑
                referenceId = markerData.restaurant_id || markerData.id;
            } else if (markerData.type === 'kcontent') {
                placeType = 3;  // 🎬 K-Contents (새로 추가)
                referenceId = markerData.content_id || markerData.id;
            } else {
                placeType = 1;  // 기본값
                referenceId = markerData.id;
            }

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
        console.log('🗺️ addMarkers 호출됨:', { 
            map: !!map, 
            mapMarkers: mapMarkers,
            markersCount: mapMarkers?.length || 0 
        });
        
        if (!map || !mapMarkers || mapMarkers.length === 0) {
            console.log('❌ addMarkers 조기 종료:', { 
                hasMap: !!map, 
                hasMapMarkers: !!mapMarkers, 
                markersLength: mapMarkers?.length 
            });
            return;
        }

        // 기존 마커들 제거
        console.log('🧹 기존 마커 제거:', markers.length + '개');
        markers.forEach(marker => marker.setMap(null));
        
        const newMarkers = [];

        mapMarkers.forEach((markerData, index) => {
            console.log(`🔍 마커 ${index + 1} 처리:`, {
                title: markerData.title,
                type: markerData.type,
                latitude: markerData.latitude,
                longitude: markerData.longitude,
                hasValidCoords: !!(markerData.latitude && markerData.longitude)
            });
            
            if (markerData.latitude && markerData.longitude) {
                
                // 🎯 마커 아이콘 타입별 구분 (K-Contents 추가)
                let markerIcon;
                
                if (markerData.type === 'attraction') {
                    markerIcon = {
                        content: '<div style="background: #4285f4; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">📍</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    };
                } else if (markerData.type === 'festival') {
                    markerIcon = {
                        content: '<div style="background: #ea4335; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🎭</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    };
                } else if (markerData.type === 'restaurant') {
                    // 🍽️ 레스토랑 마커 아이콘 (오렌지색)
                    markerIcon = {
                        content: '<div style="background: #ff6b35; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🍽️</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    };
                } else if (markerData.type === 'kcontent') {
                    // 🎬 K-Contents 마커 아이콘 (핑크색)
                    markerIcon = {
                        content: '<div style="background: #e91e63; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🎬</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    };
                } else {
                    // 기본 마커
                    markerIcon = {
                        content: '<div style="background: #34a853; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">📌</div>',
                        anchor: new window.naver.maps.Point(20, 20)
                    };
                }

                try {
                    const marker = new window.naver.maps.Marker({
                        position: new window.naver.maps.LatLng(markerData.latitude, markerData.longitude),
                        map: map,
                        title: markerData.title,
                        icon: markerIcon
                    });

                    console.log(`✅ 마커 ${index + 1} 생성 성공:`, markerData.title);

                    // 🎯 정보창 내용 - 타입별로 다르게 표시 (K-Contents 추가)
                    let itemId;
                    if (markerData.type === 'attraction') {
                        itemId = markerData.attr_id;
                    } else if (markerData.type === 'festival') {
                        itemId = markerData.festival_id;
                    } else if (markerData.type === 'restaurant') {
                        itemId = markerData.restaurant_id || markerData.id;
                    } else if (markerData.type === 'kcontent') {
                        itemId = markerData.content_id || markerData.id;
                    } else {
                        itemId = markerData.id;
                    }
                    
                    let infoContent = `
                        <div style="padding: 15px; max-width: 300px; font-family: Arial, sans-serif;">
                            <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: bold;">
                    `;

                    // 🎯 타입별 헤더 아이콘
                    if (markerData.type === 'attraction') {
                        infoContent += `📍 ${markerData.title}`;
                    } else if (markerData.type === 'festival') {
                        infoContent += `🎭 ${markerData.title}`;
                    } else if (markerData.type === 'restaurant') {
                        infoContent += `🍽️ ${markerData.title}`;
                    } else if (markerData.type === 'kcontent') {
                        infoContent += `🎬 ${markerData.title}`;
                    } else {
                        infoContent += `📌 ${markerData.title}`;
                    }

                    infoContent += `</h4>`;

                    // 🎬 K-Contents 정보
                    if (markerData.type === 'kcontent') {
                        if (markerData.drama_name) {
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 12px; color: #666; background: #fce4ec; padding: 4px 8px; border-radius: 4px;">
                                    🎭 Drama: ${markerData.drama_name}
                                </p>
                            `;
                        }
                        if (markerData.location_name) {
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 12px; color: #666; background: #fff3e0; padding: 4px 8px; border-radius: 4px;">
                                    📍 Location: ${markerData.location_name}
                                </p>
                            `;
                        }
                        if (markerData.address) {
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 11px; color: #555; line-height: 1.4;">
                                    🗺️ ${markerData.address.substring(0, 50)}${markerData.address.length > 50 ? '...' : ''}
                                </p>
                            `;
                        }
                        if (markerData.trip_tip && markerData.trip_tip.length > 0) {
                            const shortTip = markerData.trip_tip.substring(0, 60);
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 11px; color: #555; line-height: 1.4;">
                                    💡 ${shortTip}${markerData.trip_tip.length > 60 ? '...' : ''}
                                </p>
                            `;
                        }
                    }

                    // 🍽️ 레스토랑 정보 (기존)
                    else if (markerData.type === 'restaurant') {
                        if (markerData.place_en) {
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 12px; color: #666; background: #fff3cd; padding: 4px 8px; border-radius: 4px;">
                                    📍 ${markerData.place_en.substring(0, 45)}${markerData.place_en.length > 45 ? '...' : ''}
                                </p>
                            `;
                        }
                        if (markerData.description && markerData.description.length > 0) {
                            const shortDesc = markerData.description.substring(0, 60);
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 11px; color: #555; line-height: 1.4;">
                                    ${shortDesc}${markerData.description.length > 60 ? '...' : ''}
                                </p>
                            `;
                        }
                        if (markerData.subway) {
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 11px; color: #007bff; background: #e6f3ff; padding: 3px 6px; border-radius: 3px;">
                                    🚇 ${markerData.subway}
                                </p>
                            `;
                        }
                    }

                    // 축제 정보 (기존)
                    else if (markerData.type === 'festival') {
                        if (markerData.start_date && markerData.end_date) {
                            infoContent += `
                                <p style="margin: 5px 0; font-size: 13px; color: #666; background: #fff3cd; padding: 4px 8px; border-radius: 4px;">
                                    📅 ${markerData.start_date} ~ ${markerData.end_date}
                                </p>
                            `;
                        }
                    }
                    
                    // 관광명소 정보 (기존)
                    else if (markerData.type === 'attraction') {
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
                                    background: ${markerData.type === 'attraction' ? '#4285f4' : 
                                                markerData.type === 'festival' ? '#ff4444' : 
                                                markerData.type === 'restaurant' ? '#ff6b35' :
                                                markerData.type === 'kcontent' ? '#e91e63' : '#34a853'};
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
                    
                } catch (error) {
                    console.error(`❌ 마커 ${index + 1} 생성 실패:`, error);
                }
            } else {
                console.log(`❌ 마커 ${index + 1} 스킵: 좌표 없음`);
            }
        });

        setMarkers(newMarkers);
        
        console.log(`🎯 마커 설정 완료: ${newMarkers.length}개 추가됨`);

        // 첫 번째 마커로 이동
        if (newMarkers.length > 0) {
            const firstMarker = mapMarkers[0];
            console.log('📍 지도 중심 이동:', firstMarker.latitude, firstMarker.longitude);
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