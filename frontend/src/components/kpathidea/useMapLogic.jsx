// src/components/kpathidea/useMapLogic.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { isNaverMapsLoaded, readLat, readLng } from './mapUtils'; 
// 💡 이미지 import는 그대로 유지
import DefaultMarker from '../../assets/start_marker.png';
// StartMarker, EndMarker는 임시로 DefaultMarker로 선언합니다.
const StartMarker = DefaultMarker;
const EndMarker = DefaultMarker;

/**
 * Naver Map 관련 모든 상태, 초기화, 마커/경로 조작 로직을 캡슐화하는 커스텀 훅입니다.
 */
const useMapLogic = (
    NAVER_MAPS_CLIENT_ID, 
    setMessage, 
    setRouteResult, 
    setIsSummaryVisible, 
    setRoutePolyline,
    setUserMarkers, 
    setSelectedStartId, 
    setSelectedEndId, 
    stateRef, // KPathIdeaPage의 모든 current state를 참조
    fetchRouteRef, // 💡 fetchRoute 함수 참조 (Ref)를 받습니다.
    openMemoModal, // 💡 마커 메모 모달을 띄우는 함수
    markerMemos     // 💡 [추가] KPathIdeaPage에서 전달받은 마커 메모 상태
) => {
    // 💡 훅 내부 상태 관리
    const [map, setMap] = useState(null);
    const [isApiLoaded, setIsApiLoaded] = useState(false);
    
    // 💡 마커/인스턴스 참조 관리
    const mapObjectsRef = useRef({}); 
    const prevUserMarkersIdsRef = useRef(''); // 폴링용 이전 아이디 문자열

    // --- 1. API 로드 및 지도 초기화 로직 (유지) ---
    useEffect(() => {
        // ... (API 로드 및 초기화 로직 유지)
        if (!NAVER_MAPS_CLIENT_ID) {
            setMessage("⚠️ 오류: REACT_APP_NAVER_MAPS_CLIENT_ID 환경 변수가 설정되지 않았습니다.");
            return;
        }
        if (window.naver && window.naver.maps && !isApiLoaded) {
            setIsApiLoaded(true);
            setMessage("Naver Maps API 이미 로드됨.");
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
            if (window.naver && window.naver.maps) {
                setIsApiLoaded(true); 
                setMessage("Naver Maps API 로드 성공.");
            } else {
                setMessage("⚠️ Naver Maps 스크립트 로드되었으나 window.naver가 준비되지 않았습니다.");
            }
        };
        script.onerror = () => { setMessage('⚠️ Naver Maps API 로드 실패.'); };
        document.head.appendChild(script);
    }, [isApiLoaded, NAVER_MAPS_CLIENT_ID, setMessage]);

    const initMap = useCallback(() => {
        if (!isApiLoaded || map) return;
        if (!window.naver || !window.naver.maps) return;

        const initialCenter = new window.naver.maps.LatLng(37.5665, 126.9780);
        const newMap = new window.naver.maps.Map('map', {
            center: initialCenter, zoom: 10, minZoom: 6, mapTypeControl: true, scaleControl: true,
        });
        setMap(newMap);
    }, [isApiLoaded, map, setMap]);

    useEffect(() => { initMap(); }, [initMap]);
    useEffect(() => { 
        if (map) { 
            setTimeout(() => { try { map.refresh(); } catch(e){} }, 100); 
        } 
    }, [map]);


    // --- 2. 지도 조작 함수들 (clearRoute, handleDeleteMarker, drawSegmentedPolyline 유지) ---

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
    }, [setRoutePolyline, setRouteResult, setIsSummaryVisible, stateRef]);

    const handleDeleteMarker = useCallback((markerId) => {
        if (mapObjectsRef.current[markerId]) {
            try { mapObjectsRef.current[markerId].setMap(null); } catch(e){}
            delete mapObjectsRef.current[markerId];
        }
        
        setUserMarkers(prev => prev.filter(m => m.id !== markerId));
        setSelectedStartId(prev => prev === markerId ? null : prev);
        setSelectedEndId(prev => prev === markerId ? null : prev);

        clearRoute();
        setMessage('🗑️ 마커가 삭제되었습니다. 출발지/도착지를 다시 설정하세요.');
    }, [clearRoute, setMessage, mapObjectsRef, setUserMarkers, setSelectedStartId, setSelectedEndId]);

    const drawSegmentedPolyline = useCallback((segmentedPathData, routeData) => {
        if (!map) return;
        clearRoute();
        // ... (경로 그리기 로직 유지)
        if (!Array.isArray(segmentedPathData) || segmentedPathData.length === 0) {
             setMessage('⚠️ 그릴 경로 데이터가 없습니다.');
             setIsSummaryVisible(false);
             return;
        }

        const colorMap = { 1: '#4c42f7', 2: '#f59e0b', 3: '#a8a29e' };
        const newPolylines = [];
        let bounds;
        try { bounds = new window.naver.maps.LatLngBounds(); } catch (e) { bounds = null; console.warn('LatLngBounds 생성 실패', e); }

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
                 }
             });

             if (naverPath.length < 2) return;
             const color = colorMap[segment.trafficType] || '#3b82f6';
             const polyline = new window.naver.maps.Polyline({ map: map, path: naverPath, strokeColor: color, strokeWeight: 7, strokeOpacity: 0.8, strokeStyle: 'solid' });

             window.naver.maps.Event.addListener(polyline, 'click', () => {
                 setIsSummaryVisible(prev => !prev);
                 setMessage(stateRef.current.isSummaryVisible ? '경로 요약 정보를 숨깁니다.' : `🚌 경로를 클릭했습니다! 총 ${routeData.totalTime ?? '?'}분 경로입니다. 상세 정보를 확인하세요.`);
             });
             newPolylines.push(polyline);
        });
        
        setRouteResult(routeData);
        setRoutePolyline(newPolylines); 
        setIsSummaryVisible(true);
        setMessage('✅ 경로가 생성되었습니다. (구간별 색상 구분 적용)');
        
         try {
             if (bounds && typeof bounds.isEmpty === 'function' && !bounds.isEmpty()) {
                 if (typeof map.fitBounds === 'function') {
                     try { map.fitBounds(bounds); } catch (e) { map.setCenter(bounds.getCenter()); }
                 }
             } else if (newPolylines.length > 0) {
                 const firstPath = newPolylines[0].getPath && newPolylines[0].getPath();
                 if (firstPath && firstPath.length > 0) { try { map.setCenter(firstPath[0]); } catch(e){} }
             }
         } catch (e) { console.warn('fitBounds 처리 중 예외:', e); }

    }, [map, clearRoute, setRouteResult, setRoutePolyline, setIsSummaryVisible, setMessage, stateRef]);


    // 2.4. 마커 생성 및 클릭 리스너 등록 로직 (createMarkerObject)
    const createMarkerObject = useCallback((markerData, isStart, isEnd) => {
        if (!map) return null;

        const { id, name } = markerData;
        const latRaw = readLat(markerData);
        const lngRaw = readLng(markerData);
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        
        // 💡 메모 데이터 및 표시 타이틀 가져오기
        const currentMemo = markerMemos[id] || { title: name, memo: '' };
        const displayTitle = currentMemo.title || name; 
        const displayMemo = currentMemo.memo;
        const hasMemo = displayMemo && displayMemo.trim().length > 0;
        
        // 💡 마커 이미지 경로 설정
        const markerImage = isStart 
             ? StartMarker
             : isEnd 
             ? EndMarker
             : DefaultMarker;

        // --- Custom HTML 마커 구조 정의 (핵심 수정) ---
        const markerColor = isStart ? '#4CAF50' : isEnd ? '#F44336' : '#3b82f6';

        const markerHtml = `
            <div class="kpath-custom-marker-wrapper" data-marker-id="${id}">
                
           ${hasMemo ? `
    <div class="kpath-marker-memo marker-${id}">
        ${displayMemo.replace(/\n/g, '<br>')} 
        </div>
    ` : ''}

                <div class="kpath-marker-label label-${id}" style="
                    /* 💡 라벨 색상 커스터마이징을 위해 인라인 스타일 일부만 유지 */
                    border-color: ${markerColor};
                ">
                    ${displayTitle}
                </div>

                <img 
                    src="${markerImage}" 
                    alt="${displayTitle}" 
                    class="kpath-marker-img img-${id}"
                />
                
                </div>
`;
        // --- Custom HTML 마커 구조 정의 끝 ---

        const position = new window.naver.maps.LatLng(lat, lng);
        const anchorPoint = new window.naver.maps.Point(15, 42); // 30x42 마커의 핀 끝에 맞춤

        let marker = mapObjectsRef.current[id]; 
        if (!marker) {
            try {
                // 💡 Custom HTML Marker 생성
                marker = new window.naver.maps.Marker({ 
                    position, map, title: displayTitle, 
                    icon: { 
                        content: markerHtml, // Custom HTML 적용
                        size: new window.naver.maps.Size(30, 42),
                        anchor: anchorPoint 
                    }, 
                    zIndex: isStart || isEnd ? 10 : 1 
                });
                mapObjectsRef.current[id] = marker;
            } catch (e) { console.warn('마커 생성 실패', e); return null; }
        } else {
            try { 
                marker.setPosition(position); 
                marker.setTitle(displayTitle); // title 업데이트
                // 💡 Custom HTML Icon 업데이트
                marker.setIcon({ 
                    content: markerHtml,
                    size: new window.naver.maps.Size(30, 42),
                    anchor: anchorPoint 
                });
                marker.setOptions({ zIndex: isStart || isEnd ? 10 : 1 });
                try { marker.setMap(map); } catch(e2){ /* 무시 */ }
            } catch (e) { console.warn(e); }
        }
        
        // ----------------------------------------------------------------------
        // 💡 이벤트 리스너: 더블 클릭 (메모 모달 열기)
        // ----------------------------------------------------------------------
        
        window.naver.maps.Event.addListener(marker, 'dblclick', () => {
             // 메모 모달 열기 함수 호출 시 현재 표시 이름과 마커 ID 전달
             openMemoModal({ id, name: displayTitle, lat, lng }); 
             setMessage(`📝 '${displayTitle}' 마커 정보 입력/수정 창이 열렸습니다.`);
        });

        // ----------------------------------------------------------------------
        // 💡 이벤트 리스너: 단일 클릭 (경로 선택 로직)
        // ----------------------------------------------------------------------
        window.naver.maps.Event.addListener(marker, 'click', () => {
            if (stateRef.current.isSelectingPath) {
                const clickedId = markerData.id;
                let startId = stateRef.current.selectedStartId;

                if (!startId) {
                    setSelectedStartId(clickedId);
                    setMessage(`1️⃣ 출발지: ${displayTitle} 설정 완료. 🎯 2. 도착지를 클릭하세요.`);
                } else if (startId === clickedId) {
                    setSelectedStartId(null);
                    setMessage(`출발지 선택이 해제되었습니다. 다시 1. 출발지를 클릭하세요.`);
                } else {
                    setSelectedEndId(clickedId);
                    setMessage(`2️⃣ 도착지: ${displayTitle} 설정 완료. 경로 생성을 시작합니다.`);
                    
                    const startMarkerData = stateRef.current.userMarkers.find(m => m.id === startId);
                    const endMarkerData = stateRef.current.userMarkers.find(m => m.id === clickedId);
                    
                    if (startMarkerData && endMarkerData && fetchRouteRef.current) {
                        fetchRouteRef.current(
                            readLat(startMarkerData), 
                            readLng(startMarkerData), 
                            readLat(endMarkerData), 
                            readLng(endMarkerData)
                        );
                    }
                }
                return;
            }
        });

        return marker;
    }, [map, handleDeleteMarker, fetchRouteRef, setSelectedStartId, setSelectedEndId, setMessage, stateRef, openMemoModal, markerMemos]); // 💡 markerMemos를 의존성 배열에 추가


    // --- 3. 마커 동기화 및 지도 이벤트 (유지) ---

    // syncMarkers 함수로 분리 (재사용)
    const syncMarkers = useCallback(() => {
        if (!map || !stateRef.current) return;
        const currentMarkers = stateRef.current.userMarkers || [];
        const currentIds = currentMarkers.map(m => m.id);

        // 지도에 없어야 할 마커 삭제
        Object.keys(mapObjectsRef.current).forEach(key => {
            const numericId = Number(key);
            if (!Number.isNaN(numericId)) {
                if (!currentIds.includes(numericId)) {
                    try { if (mapObjectsRef.current[key]) { mapObjectsRef.current[key].setMap(null); } } catch(e){}
                    delete mapObjectsRef.current[key];
                }
            }
        });

        // 지도에 그려야 할 마커 생성/업데이트
        currentMarkers.forEach(markerData => {
            const isStart = markerData.id === stateRef.current.selectedStartId;
            const isEnd = markerData.id === stateRef.current.selectedEndId;
            createMarkerObject(markerData, isStart, isEnd);
        });
    }, [map, createMarkerObject, stateRef]);

    // **변경**: stateRef.current.userMarkers 변경을 감지하기 위한 경량 폴링
   useEffect(() => {
        if (!map) return;
       syncMarkers();
   }, [map, syncMarkers, markerMemos, stateRef.current?.userMarkers]);

    return {
        map,
        setMap,
        isApiLoaded,
        clearRoute, 
        handleDeleteMarker, 
        drawSegmentedPolyline,
        createMarkerObject,
        mapObjectsRef 
    };
};

export default useMapLogic;