// src/pages/KPathIdeaPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, Loader, BusFront, Clock, Wallet, Route, Trash2 } from 'lucide-react';
import '../styles/KPathIdeaPage.css';
import SubPathItem from '../components/kpathidea/SubPathItem';
import { readLat, readLng } from '../components/kpathidea/mapUtils';
import useMapLogic from '../components/kpathidea/useMapLogic';
import MemoModal from '../components/kpathidea/MemoModal'; 

// API 및 환경 변수 설정
const NAVER_MAPS_CLIENT_ID = process.env.REACT_APP_NAVER_MAPS_CLIENT_ID;
const LOCATION_API_URL = "http://127.0.0.1:8000/api/search/location";
const ROUTE_API_URL = "http://127.0.0.1:8000/api/odsay/route";
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

function KPathIdeaPage({ scheduleLocation }) {

    // --- 1. 상태 관리 (useState) ---
    const [routePolyline, setRoutePolyline] = useState(null);
    const [userMarkers, setUserMarkers] = useState([]);
    const [selectedStartId, setSelectedStartId] = useState(null);
    const [selectedEndId, setSelectedEndId] = useState(null);
    const [routeResult, setRouteResult] = useState(null);
    const [isSummaryVisible, setIsSummaryVisible] = useState(false);
    const [isSelectingPath, setIsSelectingPath] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('🔍 장소 검색(자동완성 지원) 또는 입력 후 검색 버튼을 사용하세요.');
    const [isDeleteMode, setIsDeleteMode] = useState(false); // 삭제 모드

    // 💡 추가된 상태: 마커 메모 및 모달 관리
    const [markerMemos, setMarkerMemos] = useState({}); 
    const [modalContent, setModalContent] = useState(null); 

    // 💡 Hooks Top Level: useRef 정의
    const stateRef = useRef({});
    const fetchRouteRef = useRef(null); // fetchRoute 참조
    const deleteListenersRef = useRef({}); // { markerId: listenerObj } - 삭제 리스너 관리

    // --- 2. 마커 메모 모달 제어 함수 정의 ---
    const openMemoModal = useCallback((markerData) => {
        // 현재 저장된 메모 정보를 불러옴 (없으면 기본값)
        const currentMemo = markerMemos[markerData.id] || { 
            title: markerData.name, 
            memo: '',
            // 검색어로 추가된 경우 name이 마커의 기본 타이틀이 됨
        }; 
        
        setModalContent({
            markerId: markerData.id,
            initialTitle: currentMemo.title,
            initialMemo: currentMemo.memo,
            onSave: (newTitle, newMemo) => {
                // 1. 메모 상태 업데이트
                setMarkerMemos(prev => ({
                    ...prev,
                    [markerData.id]: { title: newTitle, memo: newMemo },
                }));
                
                // 2. 마커 이름(name)을 업데이트하여 지도에 표시되는 라벨을 즉시 변경
                // useMapLogic의 syncMarkers가 이 변경을 감지하고 마커를 다시 그림
                setUserMarkers(prev => prev.map(m => 
                    m.id === markerData.id ? { ...m, name: newTitle } : m
                ));
                
                setModalContent(null); // 모달 닫기
                setMessage(`📝 마커 '${newTitle}' 정보가 저장되었습니다.`);
            },
            onClose: () => setModalContent(null)
        });
    }, [markerMemos, setMarkerMemos, setUserMarkers]);


    // --- 3. 훅 호출 및 기능 가져오기 (useMapLogic 호출) ---
    const {
        map,
        isApiLoaded,
        clearRoute,
        drawSegmentedPolyline,
        mapObjectsRef, 
        handleDeleteMarker,
    } = useMapLogic(
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
        openMemoModal, // 💡 2. 정의된 함수를 훅에 전달
        markerMemos   // 💡 마커 메모 상태도 훅에 전달 (마커 라벨 표시를 위해)
    );

    // --- 4. 통합 Ref 업데이트 (useEffect) ---
    useEffect(() => {
        stateRef.current = {
            userMarkers,
            selectedStartId,
            selectedEndId,
            routeResult,
            routePolyline,
            isSummaryVisible,
            isSelectingPath,
            isLoading,
            isDeleteMode,
            markerMemos, // 💡 markerMemos도 ref에 포함
        };
    }, [userMarkers, selectedStartId, selectedEndId, routeResult,
        routePolyline, isSummaryVisible, isSelectingPath, isLoading, isDeleteMode, markerMemos]);

    // --- 5. 경로 검색 함수 정의 (생략된 로직은 원본 유지) ---
    const fetchRoute = useCallback(async (startLat, startLng, endLat, endLng) => {
        setIsLoading(true);
        setMessage('🚌 대중교통 경로 검색 중...');
        setRouteResult(null);

        const requestBody = { startLat, startLng, endLat, endLng };

        try {
            const response = await fetch(ROUTE_API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let errorText = `HTTP 오류! 상태 코드: ${response.status}`;
                throw new Error(errorText);
            }
            const data = await response.json();

            const routeData = {
                totalTime: data.totalTime ?? null, fare: data.fare ?? null, subPath: data.subPath ?? [],
            };

            // 훅 함수 호출 (네이버 지도에 그려짐)
            drawSegmentedPolyline(data.segmentedPath ?? [], routeData);

        } catch (error) {
            console.error('경로 검색 중 오류 발생:', error);
            setMessage(`❌ 경로 검색 실패: ${error.message}.`);
            clearRoute();
        } finally {
            setIsLoading(false);
            setIsSelectingPath(false);
        }
    }, [drawSegmentedPolyline, clearRoute]);

    // --- 6. fetchRoute 참조 연결 (useMapLogic에서 호출될 함수 연결) ---
    useEffect(() => {
        fetchRouteRef.current = fetchRoute;
    }, [fetchRoute]);

    // --- 7. 위치 검색 함수 (마커 추가 로직 - 원본 유지) ---
   const handleSearch = async (e) => {
    e?.preventDefault?.();
    
    // 💡 수정 1: DOM에서 직접 입력 필드의 값을 읽어옵니다. 
    // searchQuery 상태가 Google Autocomplete에 의해 업데이트되지 않을 가능성을 처리합니다.
    const inputElement = document.getElementById('autocomplete-input');
    const currentQuery = inputElement ? inputElement.value.trim() : searchQuery.trim();

    // 🚨 디버깅 로그: 요청 전에 실제로 사용할 쿼리 값을 확인합니다.
    console.log("🔥 최종 전송 쿼리:", currentQuery);

    if (!currentQuery || !map || isLoading) return;

    // 💡 검색 필드 값을 현재 검색어로 업데이트 (사용자가 일반 검색 버튼을 눌렀을 때를 위해)
    setSearchQuery(currentQuery); 
    
    setIsLoading(true);
    setMessage(`'${currentQuery}' 위치 검색 중...`);
    clearRoute();

    try {
        const encodedQuery = encodeURIComponent(currentQuery); // currentQuery 사용
        const requestUrl = `${LOCATION_API_URL}?query=${encodedQuery}`;
        console.log("📍 LOCATION API 요청 URL:", requestUrl);

        // 🚨 수정 2: GET 요청이므로, 불필요한 Content-Type 헤더를 완전히 제거합니다.
        const response = await fetch(requestUrl, { 
            method: 'GET', 
            // headers: { 'Content-Type': 'application/json' } <-- 제거됨
        });
        
        if (!response.ok) { 
            throw new Error(`HTTP 오류! 상태 코드: ${response.status}`); 
        }
        const data = await response.json();

        const lat = data.latitude ?? data.y;
        const lng = data.longitude ?? data.x;
        
        if (typeof lat === 'number' && typeof lng === 'number') {
            const newId = Date.now();
            // data.query가 있으면 사용하고, 없으면 currentQuery를 사용합니다.
            const newMarker = { id: newId, lat, lng, name: data.query || currentQuery }; 

            setUserMarkers(prev => [...prev, newMarker]);
            setMessage(`'${newMarker.name}' 마커가 추가되었습니다.`);
            try {
                if (map) {
                    map.setCenter(new window.naver.maps.LatLng(newMarker.lat, newMarker.lng));
                    map.setZoom(14, true);
                }
            } catch (e) { console.warn('지도 중심 실패', e); }
        } else {
            setMessage(`'${currentQuery}'에 대한 유효한 좌표를 찾지 못했습니다.`);
        }
    } catch (error) {
        console.error('검색 중 오류 발생:', error);
        setMessage(`통신 오류: ${error.message}.`);
    } finally {
        setIsLoading(false);
    }
};
    // --- 8. 자동완성 로직 (원본 유지) ---
    useEffect(() => {
        const initAutocomplete = () => {
             // ... (Google Autocomplete 초기화 로직 유지)
             try {
                if (!window.google || !window.google.maps || !window.google.maps.places) {
                    console.warn('Google Places가 준비되지 않았습니다.');
                    return;
                }
                const input = document.getElementById('autocomplete-input');
                if (!input) return;

                const autocomplete = new window.google.maps.places.Autocomplete(input, {
                    fields: ['name', 'geometry', 'formatted_address'],
                    types: ['geocode', 'establishment'],
                    componentRestrictions: { country: 'kr' }
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place || !place.geometry || !place.geometry.location) {
                        setMessage('❌ 선택된 장소의 위치 정보를 가져올 수 없습니다.');
                        return;
                    }

                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    const newId = Date.now();
                    const name = place.name || place.formatted_address || '검색 결과';

                    const newMarker = { id: newId, lat, lng, name };

                    setUserMarkers(prev => [...prev, newMarker]);
                    setMessage(`'${name}' 자동완성으로 마커 추가됨.`);
                    try {
                        if (map) {
                            map.setCenter(new window.naver.maps.LatLng(lat, lng));
                            map.setZoom(14, true);
                        }
                    } catch (e) { console.warn('네이버 지도 중심 이동 실패', e); }
                });
            } catch (e) {
                console.warn('Autocomplete 초기화 중 예외', e);
            }
        };

        if (window.google && window.google.maps && window.google.maps.places) {
            initAutocomplete();
            return;
        }

        const scriptId = 'google-places-script';
        if (document.getElementById(scriptId)) {
            const t = setTimeout(initAutocomplete, 600);
            return () => clearTimeout(t);
        }

        if (!GOOGLE_API_KEY) {
            console.warn('REACT_APP_GOOGLE_API_KEY가 설정되지 않았습니다. 자동완성 기능 비활성화됩니다.');
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&language=ko`;
        script.async = true;
        script.defer = true;
        script.onload = () => { initAutocomplete(); };
        script.onerror = () => { console.warn('Google Places 스크립트 로드 실패'); };
        document.head.appendChild(script);

    }, [map]);

    // --- 9. 삭제 모드 (원본 유지) ---
    useEffect(() => {
        if (!map || !mapObjectsRef || !mapObjectsRef.current) return;

        const markerKeys = Object.keys(mapObjectsRef.current).filter(k => {
            const n = Number(k);
            return !Number.isNaN(n);
        });

        if (isDeleteMode) {
            markerKeys.forEach(key => {
                if (deleteListenersRef.current[key]) return;
                const markerObj = mapObjectsRef.current[key];
                try {
                    const listener = window.naver.maps.Event.addListener(markerObj, 'click', () => {
                        try {
                            handleDeleteMarker(Number(key));
                            setMessage('🗑 마커가 삭제되었습니다.');
                        } catch (e) {
                            console.warn('삭제 핸들러 실행 중 오류', e);
                        }
                    });
                    deleteListenersRef.current[key] = listener;
                } catch (e) {
                    console.warn('삭제 리스너 등록 실패', e);
                }
            });
            setMessage('🗑 삭제 모드 활성화 — 삭제하려면 마커를 클릭하세요.');
        } else {
            Object.keys(deleteListenersRef.current).forEach(key => {
                try {
                    const listener = deleteListenersRef.current[key];
                    if (listener && window.naver && window.naver.maps && window.naver.maps.Event) {
                        window.naver.maps.Event.removeListener(listener);
                    }
                } catch (e) { /* 무시 */ }
            });
            deleteListenersRef.current = {};
            setMessage(prev => prev || '삭제 모드가 해제되었습니다.');
        }

        return () => {
            if (!deleteListenersRef.current) return;
            Object.keys(deleteListenersRef.current).forEach(key => {
                try {
                    const listener = deleteListenersRef.current[key];
                    if (listener && window.naver && window.naver.maps && window.naver.maps.Event) {
                        window.naver.maps.Event.removeListener(listener);
                    }
                } catch (e) { /* 무시 */ }
            });
            deleteListenersRef.current = {};
        };
    }, [isDeleteMode, map, mapObjectsRef, handleDeleteMarker]);

    // --- 10. 경로 생성 시작 핸들러 (원본 유지) ---
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

    // --- 11. UI 렌더링 (JSX) ---
    return (
        <div className="kpath-container-map-only">
            
            {/* 검색 UI */}
            <form onSubmit={handleSearch} className="kpath-search-form" style={{ alignItems: 'center' }}>
                {/* ... 검색 입력 및 버튼 JSX 유지 ... */}
                <input
                    id="autocomplete-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="장소나 주소를 검색하여 지도에 마커로 추가하세요."
                    className="kpath-search-input"
                    disabled={isLoading}
                    autoComplete="off"
                />
                <button type="submit" className="kpath-search-button" disabled={isLoading || !isApiLoaded} >
                    {isLoading ? (<Loader className="w-5 h-5" style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />) : (<Search className="w-5 h-5" style={{ marginRight: '0.5rem' }} />)}
                    장소 검색 및 마커 추가
                </button>

                {/* 삭제 모드 토글 버튼 */}
                <button
                    type="button"
                    onClick={() => setIsDeleteMode(prev => !prev)}
                    className="kpath-delete-toggle"
                    style={{
                        marginLeft: '0.5rem',
                        background: isDeleteMode ? '#ef4444' : '#6b7280',
                        color: 'white',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Trash2 className="w-5 h-5" style={{ marginRight: '0.5rem' }} />
                    {isDeleteMode ? '삭제 모드 (ON)' : '삭제 모드 (OFF)'}
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
                    {isSelectingPath ? (<><Loader className="w-5 h-5" style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} /> 마커 선택 중...</>) : (<><Route className="w-5 h-5" style={{ marginRight: '0.5rem' }} /> 경로 생성 시작</>)}
                </button>
            </div>
             {/* 지도 컨테이너 */}
            <div className="kpath-map-outer-container">
                <div id="map" className="w-full h-full" style={{ display: isApiLoaded ? 'block' : 'none', minHeight: '500px' }} />
            </div>  

            {/* 상태 메시지 및 경로 요약 */}
            <div className={`kpath-message-box ${isLoading ? 'loading' : 'success'}`}>
                <p className="kpath-message-text">
                    <MapPin className="w-5 h-5" style={{ marginRight: '0.5rem' }} /> <strong>{message}</strong>
                </p>
            </div>

            {isSummaryVisible && routeResult && (
                <div className="kpath-route-summary-box">
                    <h3 className="kpath-summary-title"><BusFront className="w-6 h-6" style={{ marginRight: '0.5rem' }} /> Recommended public transportation route</h3>
                    <div className="kpath-summary-info">
                        <p>⏱ Total Time: <b className="text-indigo-600">{routeResult.totalTime ?? '-'}min</b></p>
                        <p>💰 Fare: <b className="text-indigo-600">{routeResult.fare ?? '-'}KRW</b></p>

                    </div>
                    <div className="kpath-detail-list">
                        {routeResult.subPath && Array.isArray(routeResult.subPath) && routeResult.subPath.map((path, index) => (
                            <SubPathItem key={index} path={path} index={index} subPathArray={routeResult.subPath} />
                        ))}
                    </div>
                </div>
            )}

            {/* 💡 마커 메모 모달 렌더링 */}
            {modalContent && <MemoModal {...modalContent} />}

        </div>
    );
}

// ⚠️ 참고: MemoModal 컴포넌트는 별도로 정의되어 있어야 합니다.
// (타이틀/메모 입력창과 저장/취소 버튼이 있는 컴포넌트)
// 이 파일은 src/pages/KPathIdeaPage.jsx이며, MemoModal은 src/components/kpathidea/MemoModal.jsx에 있을 것으로 가정합니다.


export default KPathIdeaPage;