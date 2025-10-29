import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, Loader, BusFront, Clock, Wallet, Route, PersonStanding, Train, Repeat2 } from 'lucide-react';
import '../styles/KPathIdeaPage.css';

// API 및 환경 변수 설정
const NAVER_MAPS_CLIENT_ID = process.env.REACT_APP_NAVER_MAPS_CLIENT_ID;
const LOCATION_API_URL = "http://127.0.0.1:8000/search/location";
const ROUTE_API_URL = "http://127.0.0.1:8000/api/search/route";

const isNaverMapsLoaded = () => typeof window !== 'undefined' && typeof window.naver !== 'undefined' && typeof window.naver.maps !== 'undefined';

let mapObjects = {};

// --- 유틸리티: 다양한 좌표 키를 안전하게 읽는 헬퍼 ---
const readLat = (p) => {
  if (!p) return undefined;
  return p.lat ?? p.latitude ?? p.y ?? p.latitude_y ?? undefined;
};
const readLng = (p) => {
  if (!p) return undefined;
  return p.lng ?? p.longitude ?? p.x ?? p.longitude_x ?? undefined;
};

// --- 상세 경로 렌더링을 위한 SubPathItem 컴포넌트 ---
const SubPathItem = ({ path, index, subPathArray }) => {
    const [isPassStopsVisible, setIsPassStopsVisible] = useState(false);

    const iconMap = {
        1: <Train className="icon subway" />,
        2: <BusFront className="icon bus" />,
        3: <PersonStanding className="icon walk" />,
        'transfer': <Repeat2 className="icon transfer" />,
    };

    const trafficTypeKey = path?.trafficType;
    let icon = iconMap[trafficTypeKey];
    let description;
    let colorClass = "";
    let detailContent = null;
    let showToggleButton = false;
    let passStopCount = 0;

    const isPrevSubway = index > 0 && subPathArray[index - 1]?.trafficType === 1;
    const isNextSubway = index < subPathArray.length - 1 && subPathArray[index + 1]?.trafficType === 1;
    const timeText = path.sectionTime ? `${path.sectionTime}분 소요` : "";

    if (trafficTypeKey === 1) {
        colorClass = "segment subway";
        const lineName = path.lane?.[0]?.name ?? '';
        const stationCount = path.stationCount ? `${path.stationCount}개 역` : "";
        description = (
            <span className="desc subway">
                지하철 ({lineName}) {path.startName} → {path.endName} ({timeText}{stationCount ? `, ${stationCount}` : ''})
            </span>
        );

        if (path.passStopList?.stations?.length > 2) {
            const passStops = path.passStopList.stations.slice(1, -1).map(stop => stop.stationName);
            passStopCount = passStops.length;
            showToggleButton = true;
            detailContent = (
                <div className="pass-stops">
                    경유 역: {passStops.join(" → ")}
                </div>
            );
        }

    } else if (trafficTypeKey === 2) {
        colorClass = "segment bus";
        const busNo = path.lane?.[0]?.busNo ?? '';
        description = (
            <span className="desc bus">
                버스 ({busNo}) {path.startName} → {path.endName} ({timeText})
            </span>
        );

    } else if (trafficTypeKey === 3) {
        if (path.sectionTime <= 3 && isPrevSubway && isNextSubway) {
            icon = iconMap['transfer'];
            colorClass = "segment transfer";
            description = (
                <span className="desc transfer">
                    환승 (지하철 → 지하철) 역 내 이동 ({timeText})
                </span>
            );

        } else {
            colorClass = "segment walk";
            const distanceKm = path.distance ? (path.distance / 1000).toFixed(2) : '0.00';
            description = (
                <span className="desc walk">
                    도보 {timeText} ({distanceKm}km)
                </span>
            );
        }
    } else {
        // 알 수 없는 타입 처리 (안전)
        colorClass = "segment walk";
        description = <span className="desc walk">구간 정보 없음</span>;
    }

    return (
        <div className={`subpath-item ${colorClass}`}>
            <div className="subpath-header">
                <div className="subpath-icon">{icon}</div>
                <div className="subpath-info">
                    {description}
                    {showToggleButton && (
                        <button
                            className="toggle-stops-btn"
                            onClick={() => setIsPassStopsVisible(prev => !prev)}
                        >
                            {passStopCount}개 경유역 {isPassStopsVisible ? "숨기기 ▲" : "보기 ▼"}
                        </button>
                    )}
                </div>
            </div>

            {isPassStopsVisible && detailContent}
        </div>
    );
};



function KPathIdeaPage({ scheduleLocation }) {
    const [map, setMap] = useState(null);
    const [routePolyline, setRoutePolyline] = useState(null);
    const [userMarkers, setUserMarkers] = useState([]);
    const [selectedStartId, setSelectedStartId] = useState(null);
    const [selectedEndId, setSelectedEndId] = useState(null);
    const [routeResult, setRouteResult] = useState(null);
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [isSelectingPath, setIsSelectingPath] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState('🔍 지도를 클릭하거나 검색하여 장소를 추가하세요.');
    const [isLoading, setIsLoading] = useState(false);
    const [isApiLoaded, setIsApiLoaded] = useState(isNaverMapsLoaded());

    const stateRef = useRef({});
    useEffect(() => {
        stateRef.current = { userMarkers, selectedStartId, selectedEndId, isSummaryVisible, isSelectingPath, routePolyline };
    }, [userMarkers, selectedStartId, selectedEndId, isSummaryVisible, isSelectingPath, routePolyline]);

    // --- 1. Naver Maps API 로드 및 초기화 ---
    useEffect(() => {
        if (!NAVER_MAPS_CLIENT_ID) {
            setMessage("⚠️ 오류: REACT_APP_NAVER_MAPS_CLIENT_ID 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.");
            return;
        }

        if (isApiLoaded) return;

        const scriptId = 'naver-maps-script';
        if (document.getElementById(scriptId)) return;

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}&submodules=panorama&language=en`;
        script.async = true;
        script.onload = () => {
            setIsApiLoaded(true);
            setMessage("Naver Maps API 로드 성공. 이제 지도에 표시될 준비가 되었습니다.");
        };
        script.onerror = () => {
            setMessage('⚠️ Naver Maps API 로드 실패 (401 오류 가능). Client ID와 네이버 개발자 센터에 등록된 URL을 확인해주세요.');
        };
        document.head.appendChild(script);
    }, [isApiLoaded]);

    const initMap = useCallback(() => {
        if (!isApiLoaded || map) return;
        if (!window.naver || !window.naver.maps) return;

        const initialCenter = new window.naver.maps.LatLng(37.5665, 126.9780);
        const newMap = new window.naver.maps.Map('map', {
            center: initialCenter, zoom: 10, minZoom: 6, mapTypeControl: true, scaleControl: true,
        });
        setMap(newMap);
    }, [isApiLoaded, map]);

    useEffect(() => { initMap(); }, [initMap]);
    useEffect(() => { if (map) { setTimeout(() => { try { map.refresh(); } catch(e){} }, 100); } }, [map]);


    // --- 2. 경로 및 마커 관리 로직 (함수 정의) ---

    const clearRoute = useCallback(() => {
        const currentPolylines = stateRef.current.routePolyline;
        if (currentPolylines) {
            if (Array.isArray(currentPolylines)) {
                currentPolylines.forEach(line => {
                    try { if (line && typeof line.setMap === 'function') line.setMap(null); } catch (e) {}
                });
            } else {
                try { if (currentPolylines && typeof currentPolylines.setMap === 'function') currentPolylines.setMap(null); } catch(e){}
            }
        }
        setRoutePolyline(null);
        setRouteResult(null);
        setIsSummaryVisible(false);
    }, []);

    const handleDeleteMarker = useCallback((markerId) => {
        if (mapObjects[markerId]) {
            try { mapObjects[markerId].setMap(null); } catch(e){}
            delete mapObjects[markerId];
        }

        setUserMarkers(prev => prev.filter(m => m.id !== markerId));

        if (selectedStartId === markerId) setSelectedStartId(null);
        if (selectedEndId === markerId) setSelectedEndId(null);

        clearRoute();
        setMessage('🗑️ 마커가 삭제되었습니다. 출발지/도착지를 다시 설정하세요.');
    }, [selectedStartId, selectedEndId, clearRoute]);


    const drawSegmentedPolyline = useCallback((segmentedPathData, routeData) => {
        if (!map) return;

        clearRoute();

        if (!Array.isArray(segmentedPathData) || segmentedPathData.length === 0) {
            setMessage('⚠️ 그릴 경로 데이터가 없습니다.');
            setIsSummaryVisible(false);
            return;
        }

        const colorMap = {
            1: '#4c42f7', // 지하철: 파란색
            2: '#f59e0b', // 버스: 주황색
            3: '#a8a29e', // 도보/환승: 회색
        };

        const newPolylines = [];
        // Naver LatLngBounds 객체 사용
        let bounds;
        try {
            bounds = new window.naver.maps.LatLngBounds();
        } catch (e) {
            bounds = null;
            console.warn('LatLngBounds 생성 실패', e);
        }

        segmentedPathData.forEach(segment => {
            const coords = Array.isArray(segment.coordinates) ? segment.coordinates : [];
            if (coords.length < 2) return;

            const naverPath = [];
            coords.forEach(p => {
                const lat = readLat(p);
                const lng = readLng(p);
                if (typeof lat === 'number' && typeof lng === 'number') {
                    const latLng = new window.naver.maps.LatLng(lat, lng);
                    naverPath.push(latLng);
                    try { if (bounds && typeof bounds.extend === 'function') bounds.extend(latLng); } catch(e){}
                } else {
                    // 좌표 키가 문자열인 경우 (ex: "37.5") 시도 변환
                    const latNum = Number(lat);
                    const lngNum = Number(lng);
                    if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
                        const latLng = new window.naver.maps.LatLng(latNum, lngNum);
                        naverPath.push(latLng);
                        try { if (bounds && typeof bounds.extend === 'function') bounds.extend(latLng); } catch(e){}
                    }
                }
            });

            if (naverPath.length < 2) return;

            const color = colorMap[segment.trafficType] || '#3b82f6';

            const polyline = new window.naver.maps.Polyline({
                map: map,
                path: naverPath,
                strokeColor: color,
                strokeWeight: 7,
                strokeOpacity: 0.8,
                strokeStyle: 'solid'
            });

            // 클릭 리스너 추가 (클릭하면 요약 토글)
            window.naver.maps.Event.addListener(polyline, 'click', () => {
                setIsSummaryVisible(prev => !prev);
                setMessage(
                    stateRef.current.isSummaryVisible
                    ? '경로 요약 정보를 숨깁니다.'
                    : `🚌 경로를 클릭했습니다! 총 ${routeData.totalTime ?? '?'}분 경로입니다. 상세 정보를 확인하세요.`
                );
            });

            newPolylines.push(polyline);
        });

        // 상태 먼저 준비
        setRouteResult(routeData);
        setRoutePolyline(newPolylines);

        // fitBounds 안전하게 시도
        try {
            if (bounds && typeof bounds.isEmpty === 'function') {
                if (!bounds.isEmpty()) {
                    // Naver의 fitBounds는 두 번째 인자가 옵션이 아닐 수 있으므로 단순 호출
                    if (typeof map.fitBounds === 'function') {
                        try {
                            map.fitBounds(bounds);
                        } catch (e) {
                            // 일부 환경에서 fitBounds에 옵션을 전달하던 코드가 에러를 유발하면 대체
                            map.setCenter(bounds.getCenter());
                        }
                    }
                }
            } else {
                // bounds.isEmpty가 없거나 bounds 생성 실패 시, 화면 중앙을 첫 좌표로
                if (newPolylines.length > 0) {
                    const firstPath = newPolylines[0].getPath && newPolylines[0].getPath();
                    if (firstPath && firstPath.length > 0) {
                        try { map.setCenter(firstPath[0]); } catch(e){}
                    }
                }
            }
        } catch (e) {
            console.warn('fitBounds 처리 중 예외:', e);
            if (newPolylines.length > 0) {
                const firstPath = newPolylines[0].getPath && newPolylines[0].getPath();
                if (firstPath && firstPath.length > 0) {
                    try { map.setCenter(firstPath[0]); } catch(e){}
                }
            }
        }

        setIsSummaryVisible(true);
        setMessage('✅ 경로가 생성되었습니다. (구간별 색상 구분 적용)');
    }, [map, clearRoute]);


    const fetchRoute = useCallback(async (startLat, startLng, endLat, endLng) => {
        setIsLoading(true);
        setMessage('🚌 대중교통 경로 검색 중...');
        setRouteResult(null);

        const requestBody = { startLat, startLng, endLat, endLng };

        try {
            const response = await fetch(ROUTE_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                // 오류 응답 파싱을 시도하되 실패해도 예외 처리
                let errorText = `HTTP 오류! 상태 코드: ${response.status}`;
                try {
                    const errJson = await response.json();
                    errorText = errJson.detail || JSON.stringify(errJson);
                } catch (e) {}
                throw new Error(errorText);
            }

            const data = await response.json();

            console.log("백엔드 응답 전체:", data);
            console.log("상세 경로 (subPath) 길이:", Array.isArray(data.subPath) ? data.subPath.length : 0);

            if (!data.subPath || data.subPath.length === 0) {
                setMessage('⚠️ 백엔드에서 상세 경로 정보가 누락되었습니다. (subPath가 비어있거나 없음)');
                // 빈 subPath여도 segmentedPath가 올바르면 그립니다.
            }

            const routeData = {
                totalTime: data.totalTime ?? data.total_time ?? null,
                fare: data.fare ?? data.payment ?? null,
                subPath: data.subPath ?? data.sub_path ?? [],
            };

            // segmentedPath 필드를 drawSegmentedPolyline에 전달 (없으면 빈 배열)
            drawSegmentedPolyline(data.segmentedPath ?? data.segmented_path ?? [], routeData);

        } catch (error) {
            console.error('경로 검색 중 오류 발생:', error);
            setMessage(`❌ 경로 검색 실패: ${error.message}. 백엔드 서버 상태 및 API 키를 확인하세요.`);
            clearRoute();
        } finally {
            setIsLoading(false);
            setIsSelectingPath(false);
        }
    }, [drawSegmentedPolyline, clearRoute]);


    const createMarkerObject = useCallback((markerData, isStart, isEnd) => {
        if (!map) return null;

        const { id, name } = markerData;
        const lat = readLat(markerData);
        const lng = readLng(markerData);
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;

        const color = isStart ? '#4CAF50' : isEnd ? '#F44336' : '#3b82f6';
        const label = isStart ? '출발지' : isEnd ? '도착지' : '장소';

        const markerHtml = `
            <div class="kpath-marker-html" style="padding:6px 12px; background:${color}; color:white; border-radius:8px; font-weight:600; box-shadow:0 4px 6px rgba(0,0,0,0.2); border:2px solid white; white-space:nowrap;">
                ${label}: ${String(name).substring(0, 15)}...
            </div>
        `;

        const position = new window.naver.maps.LatLng(lat, lng);

        let marker = mapObjects[id];
        if (marker) {
            try {
                marker.setPosition(position);
                marker.setOptions({
                    icon: { content: markerHtml, anchor: new window.naver.maps.Point(String(name).length * 4 + 10, 30) },
                    zIndex: isStart || isEnd ? 10 : 1
                });
            } catch (e) { console.warn(e); }
        } else {
            try {
                marker = new window.naver.maps.Marker({
                    position: position,
                    map: map,
                    title: name,
                    icon: { content: markerHtml, anchor: new window.naver.maps.Point(String(name).length * 4 + 10, 30) },
                    zIndex: isStart || isEnd ? 10 : 1
                });
                mapObjects[id] = marker;
            } catch (e) { console.warn('마커 생성 실패', e); return null; }
        }

        const infoWindowContent = `
            <div style="padding:10px; min-width:150px; text-align:center; font-size:14px;">
                <p><strong>${label}: ${name}</strong></p>
                <button id="delete-marker-${id}" style="margin-top:8px; padding:5px 10px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">
                    마커 삭제
                </button>
                <div style="margin-top:8px;">
                    <button id="set-start-${id}" style="padding:3px 8px; margin-right:5px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">출발지</button>
                    <button id="set-end-${id}" style="padding:3px 8px; background:#F44336; color:white; border:none; border-radius:4px; cursor:pointer;">도착지</button>
                </div>
            </div>
        `;

        let infoWindow = mapObjects[`info-${id}`];
        if (!infoWindow) {
            try {
                infoWindow = new window.naver.maps.InfoWindow({
                    content: infoWindowContent,
                    anchorSkew: true,
                    maxWidth: 300
                });
                mapObjects[`info-${id}`] = infoWindow;
            } catch (e) { console.warn('InfoWindow 생성 실패', e); }
        } else {
            try { infoWindow.setContent(infoWindowContent); } catch(e){}
        }

        window.naver.maps.Event.addListener(marker, 'click', () => {
            if (stateRef.current.isSelectingPath) {
                const clickedId = markerData.id;
                let startId = stateRef.current.selectedStartId;

                Object.values(mapObjects).forEach(obj => {
                    try { if (obj instanceof window.naver.maps.InfoWindow) obj.close(); } catch(e){}
                });

                if (!startId) {
                    setSelectedStartId(clickedId);
                    setSelectedEndId(null);
                    setMessage(`1️⃣ 출발지: ${markerData.name} 설정 완료. 🎯 2. 도착지를 클릭하세요.`);
                } else if (startId === clickedId) {
                    setSelectedStartId(null);
                    setMessage(`출발지 선택이 해제되었습니다. 다시 1. 출발지를 클릭하세요.`);
                } else {
                    setSelectedEndId(clickedId);
                    setMessage(`2️⃣ 도착지: ${markerData.name} 설정 완료. 경로 생성을 시작합니다.`);

                    const startMarkerData = stateRef.current.userMarkers.find(m => m.id === startId);
                    const endMarkerData = stateRef.current.userMarkers.find(m => m.id === clickedId);

                    if (startMarkerData && endMarkerData) {
                        fetchRoute(readLat(startMarkerData), readLng(startMarkerData), readLat(endMarkerData), readLng(endMarkerData));
                    }
                }
                return;
            }

            Object.values(mapObjects).forEach(obj => {
                try { if (obj instanceof window.naver.maps.InfoWindow) obj.close(); } catch(e){}
            });

            try { infoWindow.open(map, marker); } catch(e){}

            window.naver.maps.Event.once(infoWindow, 'domready', () => {
                const deleteBtn = document.getElementById(`delete-marker-${id}`);
                const setStartBtn = document.getElementById(`set-start-${id}`);
                const setEndBtn = document.getElementById(`set-end-${id}`);

                if (deleteBtn) deleteBtn.onclick = () => { handleDeleteMarker(id); infoWindow.close(); };
                if (setStartBtn) setStartBtn.onclick = () => {
                    setSelectedStartId(id);
                    setSelectedEndId(prev => prev === id ? null : prev);
                    infoWindow.close();
                    setMessage(`출발지가 '${name}'(으)로 설정되었습니다. 경로 생성 버튼을 누르세요.`);
                };
                if (setEndBtn) setEndBtn.onclick = () => {
                    setSelectedEndId(id);
                    setSelectedStartId(prev => prev === id ? null : prev);
                    infoWindow.close();
                    setMessage(`도착지가 '${name}'(으)로 설정되었습니다. 경로 생성 버튼을 누르세요.`);
                };
            });
        });

        return marker;
    }, [map, handleDeleteMarker, fetchRoute]);


    useEffect(() => {
        if (!map) return;

        const currentIds = userMarkers.map(m => m.id);
        Object.keys(mapObjects).forEach(id => {
            // mapObjects의 key는 숫자 id 혹은 info-<id>
            if (!isNaN(id) && !currentIds.includes(Number(id))) {
                try { if (mapObjects[id]) { mapObjects[id].setMap(null); } } catch(e){}
                delete mapObjects[id];
                if (mapObjects[`info-${id}`]) {
                    try { mapObjects[`info-${id}`].close(); } catch(e){}
                    delete mapObjects[`info-${id}`];
                }
            }
        });

        userMarkers.forEach(markerData => {
            const isStart = markerData.id === selectedStartId;
            const isEnd = markerData.id === selectedEndId;
            createMarkerObject(markerData, isStart, isEnd);
        });

    }, [map, userMarkers, selectedStartId, selectedEndId, createMarkerObject]);


    // 지도 클릭으로 마커 추가
    useEffect(() => {
        if (!map) return;

        const listener = window.naver.maps.Event.addListener(map, 'click', (e) => {
            if (stateRef.current.isSelectingPath) return;

            const lat = e?.coord?.y ?? null;
            const lng = e?.coord?.x ?? null;
            if (lat == null || lng == null) return;

            const newId = Date.now();

            setUserMarkers(prev => [...prev, {
                id: newId, lat, lng, name: `클릭 지점 ${prev.length + 1}`
            }]);
            setMessage(`📍 새로운 마커가 추가되었습니다. 클릭하여 출발지/도착지를 설정하세요.`);
        });

        return () => {
            try { window.naver.maps.Event.removeListener(listener); } catch (e) {}
        };
    }, [map]);


    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim() || !map || isLoading) return;

        setIsLoading(true);
        setMessage(`'${searchQuery}' (으)로 위치 검색 중...`);
        clearRoute();

        try {
            const response = await fetch(`${LOCATION_API_URL}?query=${encodeURIComponent(searchQuery)}`, {
                method: 'GET', headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) { throw new Error(`HTTP 오류! 상태 코드: ${response.status}`); }
            const data = await response.json();

            const lat = data.latitude ?? data.lat ?? data.y;
            const lng = data.longitude ?? data.lng ?? data.x;
            if (typeof lat === 'number' && typeof lng === 'number') {
                const newId = Date.now();
                const newMarker = { id: newId, lat, lng, name: data.query || searchQuery };

                setUserMarkers(prev => [...prev, newMarker]);
                setMessage(`'${newMarker.name}' 마커가 추가되었습니다. 마커를 클릭하여 출발지/도착지를 설정하세요.`);

                try {
                    map.setCenter(new window.naver.maps.LatLng(newMarker.lat, newMarker.lng));
                    map.setZoom(14, true);
                } catch (e) { console.warn('지도 중심 변경 실패', e); }

            } else {
                setMessage(`'${searchQuery}'에 대한 유효한 좌표를 찾지 못했습니다.`);
            }
        } catch (error) {
            console.error('검색 중 오류 발생:', error);
            setMessage(`통신 오류: ${error.message}. FastAPI 서버가 실행 중인지 확인하세요.`);
        } finally { setIsLoading(false); }
    };


    const handleGenerateRoute = async () => {
        clearRoute();

        if (userMarkers.length < 2) {
            setMessage('⚠️ 경로 생성을 시작하려면 지도에 최소 두 개 이상의 마커가 있어야 합니다.');
            return;
        }

        setSelectedStartId(null);
        setSelectedEndId(null);
        setIsSelectingPath(true);
        setMessage('✨ 경로 생성 모드 시작! 1️⃣ 출발지 마커를 클릭하세요.');
    };


    return (
        <div className="kpath-container-map-only">

            {/* 검색 UI */}
            <form onSubmit={handleSearch} className="kpath-search-form">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="장소나 주소를 검색하여 지도에 마커로 추가하세요."
                    className="kpath-search-input"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="kpath-search-button"
                    disabled={isLoading || !isApiLoaded}
                >
                    {isLoading ? (<Loader className="w-5 h-5" style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />) : (<Search className="w-5 h-5" style={{ marginRight: '0.5rem' }} />)}
                    장소 검색 및 마커 추가
                </button>
            </form>

            {/* 경로 컨트롤 박스 */}
            <div className="kpath-route-control-box">
                <div className="kpath-control-item">
                    <span className="kpath-bold-text" style={{ color: selectedStartId ? '#16a34a' : '#9ca3af' }}>출발지:</span>
                    <span style={{ marginLeft: '0.5rem' }}>{selectedStartId ? userMarkers.find(m => m.id === selectedStartId)?.name : '미지정'}</span>
                </div>
                <div className="kpath-control-item">
                    <span className="kpath-bold-text" style={{ color: selectedEndId ? '#dc2626' : '#9ca3af' }}>도착지:</span>
                    <span style={{ marginLeft: '0.5rem' }}>{selectedEndId ? userMarkers.find(m => m.id === selectedEndId)?.name : '미지정'}</span>
                </div>
                <button
                    onClick={handleGenerateRoute}
                    className={`kpath-generate-button ${isSelectingPath ? 'kpath-generate-button-selecting' : ''}`}
                    disabled={isLoading || userMarkers.length < 2 || isSelectingPath}
                >
                    {isSelectingPath ? (
                        <>
                            <Loader className="w-5 h-5" style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                            마커 선택 중...
                        </>
                    ) : (
                        <>
                            <Route className="w-5 h-5" style={{ marginRight: '0.5rem' }} />
                            경로 생성 시작
                        </>
                    )}
                </button>
            </div>

            {/* 상태 메시지 */}
            <div className={`kpath-message-box ${isLoading ? 'loading' : 'success'}`}>
                <p className="kpath-message-text">
                    <MapPin className="w-5 h-5" style={{ marginRight: '0.5rem' }} /> <strong>{message}</strong>
                </p>
            </div>

            {/* 상세 대중교통 경로 정보 표시 */}
            {isSummaryVisible && routeResult && (
                <div className="kpath-route-summary-box">
                    <h3 className="kpath-summary-title">
                        <BusFront className="w-6 h-6" style={{ marginRight: '0.5rem' }} /> 대중교통 추천 경로
                    </h3>

                    <div className="kpath-summary-info">
                        <p className="kpath-summary-item">
                            <Clock className="w-6 h-6" style={{ marginBottom: '0.25rem' }} />
                            <span className="kpath-summary-label">총 소요 시간</span>
                            <span className="kpath-summary-value">{routeResult.totalTime ?? '-'}분</span>
                        </p>
                        <p className="kpath-summary-item">
                            <Wallet className="w-6 h-6" style={{ marginBottom: '0.25rem' }} />
                            <span className="kpath-summary-label">예상 요금</span>
                            <span className="kpath-summary-value">{routeResult.fare ?? '-'}원</span>
                        </p>
                    </div>

                    <div className="kpath-detail-list">
                        {routeResult.subPath && Array.isArray(routeResult.subPath) && routeResult.subPath.map((path, index) => (
                            <SubPathItem
                                key={index}
                                path={path}
                                index={index}
                                subPathArray={routeResult.subPath}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 지도 컨테이너 */}
            <div className="kpath-map-outer-container">
                <div id="map" className="w-full h-full" style={{ display: isApiLoaded ? 'block' : 'none', minHeight: '500px' }} />
            </div>
        </div>
    );
}

export default KPathIdeaPage;
