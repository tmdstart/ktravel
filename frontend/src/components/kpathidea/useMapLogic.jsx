import { useState, useEffect, useCallback, useRef } from 'react';
import { readLat, readLng } from './mapUtils'; 
import { createCustomMarkerHTML } from './markerConfig';

const useMapLogic = (
    NAVER_MAPS_CLIENT_ID, 
    setMessage, 
    setRouteResult, 
    setIsSummaryVisible, 
    setRoutePolyline,
    setUserMarkers, 
    setSelectedStartId, 
    setSelectedEndId, 
    stateRef,
    fetchRouteRef,
    openMemoModal,
    markerMemos
) => {
    const [map, setMap] = useState(null);
    const [isApiLoaded, setIsApiLoaded] = useState(false);
    
    const mapObjectsRef = useRef({}); 

    // API 로드
    useEffect(() => {
        if (!NAVER_MAPS_CLIENT_ID) {
            setMessage("⚠️ NAVER_MAPS_CLIENT_ID가 없습니다.");
            return;
        }
        if (window.naver && window.naver.maps && !isApiLoaded) {
            setIsApiLoaded(true);
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
                setMessage("Naver Maps API Load success.");
            }
        };
        script.onerror = () => { setMessage('⚠️ Naver Maps API 로드 실패.'); };
        document.head.appendChild(script);
    }, [isApiLoaded, NAVER_MAPS_CLIENT_ID, setMessage]);

    // 지도 초기화
    const initMap = useCallback(() => {
        if (!isApiLoaded || map) return;
        if (!window.naver || !window.naver.maps) return;

        const initialCenter = new window.naver.maps.LatLng(37.5665, 126.9780);
        const newMap = new window.naver.maps.Map('map', {
            center: initialCenter, 
            zoom: 10, 
            minZoom: 6, 
            mapTypeControl: true, 
            scaleControl: true,
        });
        setMap(newMap);
    }, [isApiLoaded, map]);

    useEffect(() => { initMap(); }, [initMap]);

    // 경로 지우기
    const clearRoute = useCallback(() => {
        const currentPolylines = stateRef.current.routePolyline;
        if (currentPolylines) {
            if (Array.isArray(currentPolylines)) {
                currentPolylines.forEach(line => {
                    try { if (line && line.setMap) line.setMap(null); } catch (e) {}
                });
            } else {
                try { if (currentPolylines && currentPolylines.setMap) currentPolylines.setMap(null); } catch(e){}
            }
        }
        setRoutePolyline(null); 
        setRouteResult(null); 
        setIsSummaryVisible(false);
    }, [setRoutePolyline, setRouteResult, setIsSummaryVisible, stateRef]);

    // 마커 삭제
    const handleDeleteMarker = useCallback((markerId) => {
        if (mapObjectsRef.current[markerId]) {
            try { mapObjectsRef.current[markerId].setMap(null); } catch(e){}
            delete mapObjectsRef.current[markerId];
        }
        
        setUserMarkers(prev => prev.filter(m => m.id !== markerId));
        setSelectedStartId(prev => prev === markerId ? null : prev);
        setSelectedEndId(prev => prev === markerId ? null : prev);
        clearRoute();
    }, [clearRoute, setUserMarkers, setSelectedStartId, setSelectedEndId]);

    // 경로 그리기
    const drawSegmentedPolyline = useCallback((segmentedPathData, routeData) => {
        if (!map) return;
        clearRoute();

        if (!Array.isArray(segmentedPathData) || segmentedPathData.length === 0) {
            setIsSummaryVisible(false);
            return;
        }

        const colorMap = { 1: '#4c42f7', 2: '#f59e0b', 3: '#a8a29e' };
        const newPolylines = [];

        segmentedPathData.forEach(segment => {
            const coords = Array.isArray(segment.coordinates) ? segment.coordinates : [];
            if (coords.length < 2) return;

            const naverPath = coords.map(p => {
                const lat = readLat(p);
                const lng = readLng(p);
                return new window.naver.maps.LatLng(lat, lng);
            }).filter(Boolean);

            if (naverPath.length < 2) return;
            
            const color = colorMap[segment.trafficType] || '#3b82f6';
            const polyline = new window.naver.maps.Polyline({ 
                map, 
                path: naverPath, 
                strokeColor: color, 
                strokeWeight: 7, 
                strokeOpacity: 0.8
            });

            newPolylines.push(polyline);
        });
        
        setRouteResult(routeData);
        setRoutePolyline(newPolylines); 
        setIsSummaryVisible(true);
    }, [map, clearRoute, setRouteResult, setRoutePolyline, setIsSummaryVisible]);

    // 마커 생성
    const createMarkerObject = useCallback((markerData, isStart, isEnd) => {
        if (!map) return null;

        const { id, name, place_type = 0 } = markerData;
        const lat = Number(readLat(markerData));
        const lng = Number(readLng(markerData));
        
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        
        const currentMemo = markerMemos[id] || { title: name, memo: '' };
        const displayTitle = currentMemo.title || name; 
        const displayMemo = currentMemo.memo;
        const hasMemo = displayMemo && displayMemo.trim().length > 0;

        const markerHtml = createCustomMarkerHTML({
            placeType: place_type,
            name: displayTitle,
            markerId: id,
            isStart,
            isEnd,
            hasMemo,
            memoContent: displayMemo
        });

        const position = new window.naver.maps.LatLng(lat, lng);

        let marker = mapObjectsRef.current[id]; 
        if (!marker) {
            marker = new window.naver.maps.Marker({ 
                position, 
                map, 
                icon: { 
                    content: markerHtml,
                    anchor: new window.naver.maps.Point(20, 40)
                }, 
                zIndex: isStart || isEnd ? 10 : 1 
            });
            mapObjectsRef.current[id] = marker;
        } else {
            marker.setPosition(position); 
            marker.setIcon({ 
                content: markerHtml,
                anchor: new window.naver.maps.Point(20, 40)
            });
        }
        
        // 이벤트 리스너
        window.naver.maps.Event.addListener(marker, 'dblclick', () => {
            openMemoModal({ id, name: displayTitle, lat, lng }); 
        });

        window.naver.maps.Event.addListener(marker, 'click', () => {
            if (stateRef.current.isSelectingPath) {
                const clickedId = markerData.id;
                const startId = stateRef.current.selectedStartId;

                if (!startId) {
                    setSelectedStartId(clickedId);
                } else if (startId === clickedId) {
                    setSelectedStartId(null);
                } else {
                    setSelectedEndId(clickedId);
                    
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
            }
        });

        return marker;
    }, [map, fetchRouteRef, setSelectedStartId, setSelectedEndId, stateRef, openMemoModal, markerMemos]);

    // 마커 동기화
    const syncMarkers = useCallback(() => {
        if (!map || !stateRef.current) return;
        const currentMarkers = stateRef.current.userMarkers || [];
        const currentIds = currentMarkers.map(m => m.id);

        Object.keys(mapObjectsRef.current).forEach(key => {
            const numericId = Number(key);
            if (!Number.isNaN(numericId) && !currentIds.includes(numericId)) {
                try { mapObjectsRef.current[key].setMap(null); } catch(e){}
                delete mapObjectsRef.current[key];
            }
        });

        currentMarkers.forEach(markerData => {
            const isStart = markerData.id === stateRef.current.selectedStartId;
            const isEnd = markerData.id === stateRef.current.selectedEndId;
            createMarkerObject(markerData, isStart, isEnd);
        });
    }, [map, createMarkerObject, stateRef]);

    useEffect(() => {
        if (!map) return;
        syncMarkers();
    }, [map, syncMarkers, markerMemos, stateRef.current?.userMarkers]);
    
    return {
        map,
        isApiLoaded,
        clearRoute, 
        handleDeleteMarker, 
        drawSegmentedPolyline,
        mapObjectsRef 
    };
};

export default useMapLogic;