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
    const [selectedMarkers, setSelectedMarkers] = useState([]); // 클릭 순서대로 마커 ID 저장
    const polylinesRef = useRef([]); // 여러 구간 polyline 저장

    // ... 기존 API 로드, initMap, clearRoute, handleDeleteMarker, drawSegmentedPolyline 그대로 유지 ...

    // 마커 생성 (기존 로직 유지)
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
        
        // 메모 모달
        window.naver.maps.Event.addListener(marker, 'dblclick', () => {
            openMemoModal({ id, name: displayTitle, lat, lng }); 
        });

        // 클릭 시 순서대로 선택
        window.naver.maps.Event.addListener(marker, 'click', () => {
            if (stateRef.current.isSelectingPath) {
                setSelectedMarkers(prev => {
                    if (prev.includes(id)) return prev; // 중복 방지
                    return [...prev, id];
                });
            }
        });

        return marker;
    }, [map, openMemoModal, markerMemos, stateRef]);

    // 마커 동기화 (기존 로직 유지)
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

    // 🔹 새 기능: 선택한 마커 순서대로 경로 생성
    const generateRouteForSelectedMarkers = useCallback(() => {
        if (!map || selectedMarkers.length < 2 || !fetchRouteRef.current) return;

        // 기존 polyline 제거
        polylinesRef.current.forEach(line => line.setMap(null));
        polylinesRef.current = [];

        const routeResults = [];

        const fetchNextSegment = async (i) => {
            if (i >= selectedMarkers.length - 1) {
                setRouteResult(routeResults); 
                setRoutePolyline(polylinesRef.current);
                setIsSummaryVisible(true);
                return;
            }

            const startId = selectedMarkers[i];
            const endId = selectedMarkers[i + 1];

            const startMarkerData = stateRef.current.userMarkers.find(m => m.id === startId);
            const endMarkerData = stateRef.current.userMarkers.find(m => m.id === endId);

            if (!startMarkerData || !endMarkerData) {
                fetchNextSegment(i + 1);
                return;
            }

            // 대중교통 경로 요청
            fetchRouteRef.current(
                readLat(startMarkerData),
                readLng(startMarkerData),
                readLat(endMarkerData),
                readLng(endMarkerData)
            ).then(routeData => {
                if (!routeData?.segmentedPathData) {
                    fetchNextSegment(i + 1);
                    return;
                }

                // 구간별 polyline 생성
                routeData.segmentedPathData.forEach(segment => {
                    const coords = Array.isArray(segment.coordinates) ? segment.coordinates : [];
                    if (coords.length < 2) return;

                    const naverPath = coords.map(p => {
                        const lat = readLat(p);
                        const lng = readLng(p);
                        return new window.naver.maps.LatLng(lat, lng);
                    }).filter(Boolean);

                    if (naverPath.length < 2) return;

                    const colorMap = { 1: '#4c42f7', 2: '#f59e0b', 3: '#a8a29e' };
                    const color = colorMap[segment.trafficType] || '#3b82f6';

                    const polyline = new window.naver.maps.Polyline({
                        map,
                        path: naverPath,
                        strokeColor: color,
                        strokeWeight: 7,
                        strokeOpacity: 0.8
                    });

                    polylinesRef.current.push(polyline);
                });

                routeResults.push(routeData);

                fetchNextSegment(i + 1); // 다음 구간 요청
            });
        };

        fetchNextSegment(0);
    }, [map, selectedMarkers, stateRef, fetchRouteRef, setRoutePolyline, setRouteResult, setIsSummaryVisible]);

    return {
    map,
    isApiLoaded,
    clearRoute, 
    handleDeleteMarker, 
    // drawSegmentedPolyline, // 필요 없으면 제거
    mapObjectsRef,
    selectedMarkers,
    setSelectedMarkers,
    generateRouteForSelectedMarkers
    };
};

export default useMapLogic;
