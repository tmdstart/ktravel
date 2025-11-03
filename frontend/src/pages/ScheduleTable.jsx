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
        <h1>🗓️ Schedule Management and Editor </h1>
      </header>

      {/* 3. 일정 이름 입력 및 사용자 ID */}
      <div className="kschedule-details">
        <label htmlFor="kschedule-name">Schedule Name</label>
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
          📅 Add New Schedule
        </button>
        <button
          className="kschedule-btn kschedule-btn-success"
          onClick={() => handleButtonClick('행 추가')}
        >
          + Add Row
        </button>
        <button
          className="kschedule-btn kschedule-btn-info"
          onClick={() => handleButtonClick('열 추가')}
        >
          ⬆ Add Columns
        </button>
        <button
          className="kschedule-btn kschedule-btn-download"
          onClick={() => handleButtonClick('CSV 다운로드')}
        >
          <span role="img" aria-label="download">⬇</span> CSV Download
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
