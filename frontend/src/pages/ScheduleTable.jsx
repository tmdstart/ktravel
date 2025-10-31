import React, { useState } from 'react';
import '../styles/ScheduleTable.css'; // CSS 파일도 kschedule용으로 변경

const ScheduleTable = () => {
  const [scheduleName, setScheduleName] = useState('새 일정');

  const days = ['Location', 'Estimated Cost', 'Place of use', 'Memo', 'Notice'];
  const times = ['9:00', '10:00', '11:00'];

  const handleButtonClick = (action) => {
    console.log(`${action} 버튼 클릭됨`);
  };

  return (
    <div className="kschedule-container">
      {/* 1. 헤더 */}
      <header className="kschedule-header">
        <h1>🗓️ 일정 관리 및 편집기</h1>
      </header>

      {/* 2. 알림/상태 바 */}
      <div className="kschedule-status-bar">
        <span role="img" aria-label="checkmark">✅</span> Firebase 연결 및 인증 완료.
      </div>

      {/* 3. 일정 이름 입력 및 사용자 ID */}
      <div className="kschedule-details">
        <label htmlFor="kschedule-name">일정 이름:</label>
        <input
          id="kschedule-name"
          type="text"
          value={scheduleName}
          onChange={(e) => setScheduleName(e.target.value)}
        />
      </div>

      {/* 4. 액션 버튼 그룹 */}
      <div className="kschedule-action-buttons">
        <button
          className="kschedule-btn kschedule-btn-primary"
          onClick={() => handleButtonClick('새 일정')}
        >
          📅 새 일정 추가
        </button>
        <button
          className="kschedule-btn kschedule-btn-success"
          onClick={() => handleButtonClick('행 추가')}
        >
          + 행 추가
        </button>
        <button
          className="kschedule-btn kschedule-btn-info"
          onClick={() => handleButtonClick('열 추가')}
        >
          ⬆️ 열 추가
        </button>
        <button
          className="kschedule-btn kschedule-btn-download"
          onClick={() => handleButtonClick('CSV 다운로드')}
        >
          <span role="img" aria-label="download">⬇️</span> CSV 다운로드
        </button>
      </div>

      {/* 5. 일정 테이블 */}
      <div className="kschedule-table-wrapper">
        <table className="kschedule-table">
          <thead>
            <tr>
              <th>Time</th>
              {days.map((day, index) => (
                <th key={index}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time, timeIndex) => (
              <tr key={timeIndex}>
                <td className="kschedule-time-cell">{time}</td>
                {days.map((_, dayIndex) => (
                  <td key={dayIndex} className="kschedule-schedule-cell">
                    {/* 일정 내용 */}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="kschedule-table-dots">
        <span>...</span>
      </div>
    </div>
  );
};

export default ScheduleTable;
