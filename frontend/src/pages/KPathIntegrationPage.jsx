import React, { useState } from 'react';
import KPathIdeaPage from './KPathIdeaPage.jsx'; 
import ScheduleTable from './ScheduleTable.jsx'; 
import '../styles/KPathIntegrationPage.css';

/**
 * 지도와 일정 테이블을 통합하고 중앙 상태를 관리하는 메인 페이지 컴포넌트입니다.
 */
function KPathIntegrationPage() {
  // 일정 테이블에서 선택된 항목의 위치와 정보를 저장하는 상태
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 일정 테이블에서 항목을 클릭했을 때 호출되는 콜백 함수
  const handleScheduleSelect = (schedule) => {
    // 맵 컴포넌트에 전달할 위치 정보만 추출하여 상태 업데이트
    setSelectedSchedule({
      id: schedule.id,
      name: schedule.name,
      lat: schedule.lat,
      lng: schedule.lng,
    });
  };

  return (
    // CSS의 .kpath-container-main을 적용하여 전체 높이와 flex 설정을 담당합니다.
    <div className="kpath-container-main">
      
      {/* 1. 왼쪽 일정 관리 패널 (kpath-schedule-panel 적용) */}
      <div className="kpath-schedule-panel">
        <header className="w-full mb-6">
          <h1 className="kpath-header-title">K-Path 여행 플래너</h1>
          <p className="kpath-header-subtitle">나만의 한국 여행 일정 만들기</p>
        </header>

        {/* ScheduleTable 컴포넌트 포함 */}
        <ScheduleTable 
          onSelectSchedule={handleScheduleSelect} 
          selectedId={selectedSchedule ? selectedSchedule.id : null}
        />
      </div>

      {/* 2. 오른쪽 지도/검색 패널 (kpath-map-panel 적용) */}
      <div className="kpath-map-panel">
        
        {/* 지도 컴포넌트는 패널 내부에서 나머지 공간을 채우도록 flex-grow를 가집니다. */}
        <KPathIdeaPage 
          scheduleLocation={selectedSchedule}
        />
      </div>
    </div>
  );
}

export default KPathIntegrationPage;
