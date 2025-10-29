import React from 'react';
import { Calendar, MapPin } from 'lucide-react';

// Mock Schedule Data (위치 정보 포함)
const mockSchedules = [
  { id: 1, name: "경복궁 방문", date: "2025-10-30", location: "Gyeongbokgung Palace", lat: 37.5833, lng: 126.9769 },
  { id: 2, name: "남산타워 저녁", date: "2025-10-30", location: "N Seoul Tower", lat: 37.5512, lng: 126.9880 },
  { id: 3, name: "부산 해운대", date: "2025-10-31", location: "Haeundae Beach", lat: 35.1587, lng: 129.1601 },
];

/**
 * 사용자 일정 테이블을 표시하고 선택 시 콜백을 실행하는 컴포넌트입니다.
 * @param {object} props
 * @param {function} props.onSelectSchedule - 일정이 선택되었을 때 실행되는 콜백 함수
 * @param {number | null} props.selectedId - 현재 선택된 일정의 ID
 */
function ScheduleTable({ onSelectSchedule, selectedId }) {
  return (
    <div className="kpath-schedule-container">
      <h2 className="kpath-schedule-title">
        <Calendar className="w-5 h-5 mr-2" />
        사용자 여행 일정
      </h2>
      <div className="kpath-schedule-list-container">
        {mockSchedules.map((schedule) => (
          <div
            key={schedule.id}
            className={`kpath-schedule-item ${selectedId === schedule.id ? 'selected' : ''}`}
            onClick={() => onSelectSchedule(schedule)}
          >
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="font-semibold">{schedule.name}</span>
            </div>
            <div className="text-sm text-gray-500">
              {schedule.date} | {schedule.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScheduleTable;
