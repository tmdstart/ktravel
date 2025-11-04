import React, { useState, useEffect } from 'react';
import KPathIdeaPage from './KPathIdeaPage.jsx'; 
import ScheduleTable from './ScheduleTable.jsx'; 
import '../styles/KPathIntegrationPage.css';

/**
 * 지도와 일정 테이블을 통합하고 중앙 상태를 관리하는 메인 페이지 컴포넌트
 */
function KPathIntegrationPage() {
  // 일정 테이블에서 선택된 항목의 위치와 정보를 저장하는 상태
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 페이지 마운트 시 body에 클래스 추가 -> 배경색 적용
  useEffect(() => {
    document.body.classList.add('kpath-page-body'); // CSS에서 배경색 정의 필요
    return () => {
      document.body.classList.remove('kpath-page-body');
    };
  }, []);

  // 일정 테이블에서 항목 클릭 시 호출되는 콜백
  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule({
      id: schedule.id,
      name: schedule.name,
      lat: schedule.lat,
      lng: schedule.lng,
    });
  };

  return (
    <div className="kpath-container-main">
      
      {/* 1. 왼쪽 일정 관리 패널 */}
      <div className="kpath-schedule-panel">
        <header className="kpath-header-wrapper">
          <h1 className="kpath-header-title">
            K-Path Travel Idea&nbsp;
            <svg width="5%" height="20%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 14.2864C3.14864 15.1031 2 16.2412 2 17.5C2 19.9853 6.47715 22 12 22C17.5228 22 22 19.9853 22 17.5C22 16.2412 20.8514 15.1031 19 14.2864M18 8C18 12.0637 13.5 14 12 17C10.5 14 6 12.0637 6 8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8ZM13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </h1>
          <p className="kpath-header-subtitle">Create Your Own Korea Travel Itinerary</p>
        </header>

        {/* ScheduleTable 컴포넌트 */}
        <ScheduleTable 
          onSelectSchedule={handleScheduleSelect} 
          selectedId={selectedSchedule ? selectedSchedule.id : null}
        />
      </div>

      {/* 2. 오른쪽 지도/검색 패널 */}
      <div className="kpath-map-panel">
        <KPathIdeaPage 
          scheduleLocation={selectedSchedule}
        />
      </div>
    </div>
  );
}

export default KPathIntegrationPage;
