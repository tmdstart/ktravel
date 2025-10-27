import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
// ⚠️ CSS 파일 이름도 역할에 맞게 변경 가정
import '../styles/MusicalPage.css'; 

// API 엔드포인트
// ⚠️ API URL을 뮤지컬 엔드포인트로 변경
const API_URL = 'http://localhost:8000/api/musicals/'; 
const MAX_BUTTONS = 6; // 페이지네이션 버튼 최대 개수

// 날짜를 'YYYY-MM-DD' 형식의 문자열로 변환하는 유틸리티 함수 (유지)
const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};

// 뮤지컬 카드 컴포넌트 (FestivalCard -> MusicalCard)
const MusicalCard = ({ musical }) => {
    const dateRange = musical.start_date === musical.end_date
        ? formatDate(musical.start_date)
        : `${formatDate(musical.start_date)} - ${formatDate(musical.end_date)}`;

    return (
        // ⚠️ 클래스 이름 변경: festival-card-container -> musical-card-container
        <div className="musical-card-container">
            <div className="musical-card-image-box">
                <img 
                    // ⚠️ image 컬럼 사용
                    src={musical.image || '/default-musical-image.png'} 
                    alt={musical.title} 
                    className="musical-card-image" 
                />
            </div>
            <div className="musical-card-details">
                {/* ⚠️ 클래스 이름 변경: festival-card-title -> musical-card-title */}
                <h3 className="musical-card-title">{musical.title}</h3>
                {/* ⚠️ 클래스 이름 변경: festival-card-date -> musical-card-date */}
                <p className="musical-card-date">{dateRange}</p>
                {/* ⚠️ 클래스 이름 변경: festival-card-place -> musical-card-place */}
                <p className="musical-card-place">📍 {musical.place}</p>
                {/* ⚠️ 장르/제한 정보는 뮤지컬에 맞게 수정 */}
                <p className="musical-card-genre">Genre: Musical/Performance</p> 
                <p className="musical-card-restriction">Check details for age restrictions.</p>
                <a 
                    // ⚠️ link 컬럼 사용
                    href={musical.link || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="get-tickets-button"
                >
                    상세보기/예매 →
                </a>
            </div>
        </div>
    );
};

// 캘린더 이벤트 목록 아이템 컴포넌트 (CalendarEventItem 유지, 내용 변경)
const CalendarEventItem = ({ musical }) => {
    // ⚠️ 아이콘 색상 로직: 대학교 장소 대신 공연장 종류에 따라 다르게 지정 가능 (예: 극장 이름에 따라)
    const iconColor = musical.place && musical.place.includes('Theater') ? '#5cb85c' : '#f0ad4e'; 
    const dateRange = musical.start_date === musical.end_date
        ? formatDate(musical.start_date)
        : `${formatDate(musical.start_date)} ~ ${formatDate(musical.end_date)}`;

    return (
        <div className="calendar-event-item">
            <span className="event-icon" style={{ backgroundColor: iconColor }}></span>
            <span className="event-title">{musical.title}</span>
            <span className="event-date">{dateRange}</span>
        </div>
    );
};


// ⚠️ 컴포넌트 이름 변경: KpopFestivalPage -> MusicalPage
function MusicalPage({ isEmbedded }) {
    // ⚠️ 상태 변수 이름 변경: festivals -> musicals
    const [musicals, setMusicals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [calendarDate, setCalendarDate] = useState(new Date()); 
    const [searchTerm, setSearchTerm] = useState(''); 

    const containerStyle = isEmbedded ? { 
        padding: '20px', minHeight: '100%', maxWidth: 'none', margin: 0, backgroundColor: 'transparent'
    } : {};
    
    const [currentPage, setCurrentPage] = useState(1); 
    const itemsPerPage = 5; 
    
    // 1. DB에서 데이터 불러오기 
    useEffect(() => {
        // ⚠️ 함수 이름 변경: fetchFestivals -> fetchMusicals
        const fetchMusicals = async () => {
            try {
                // ⚠️ API_URL 사용
                const response = await axios.get(API_URL);
                // ⚠️ 상태 변수 이름 변경: setFestivals -> setMusicals
                setMusicals(response.data);
                setLoading(false);
            } catch (err) {
                console.error("뮤지컬 데이터 로딩 실패:", err);
                // ⚠️ 에러 메시지 변경
                setError("뮤지컬/공연 데이터를 불러오는 데 실패했습니다. 서버 상태를 확인하세요.");
                setLoading(false);
            }
        };
        fetchMusicals();
    }, []);
    
    // 검색어 변경 시 항상 첫 페이지로 리셋 (유지)
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // 🌟 캘린더 날짜 필터링 로직 (useMemo 유지)
    const filteredByCalendar = useMemo(() => {
        if (!calendarDate) return [];

        const selectedDate = new Date(calendarDate);
        selectedDate.setHours(0, 0, 0, 0);

        // ⚠️ 상태 변수 이름 변경: festivals -> musicals
        return musicals.filter(musical => {
            const start = new Date(musical.start_date);
            const end = new Date(musical.end_date);
            
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            return selectedDate >= start && selectedDate <= end;
        });
    }, [musicals, calendarDate]);


    // 2. 검색, 페이지네이션 로직 (useMemo로 최적화)
    // ⚠️ 변수명 변경: filteredFestivals -> filteredMusicals
    const { currentItems, totalPages, displayPageNumbers, filteredMusicals } = useMemo(() => {
        
        // 1. 검색어 필터링
        // ⚠️ 상태 변수 이름 변경: festivals -> musicals
        const filtered = musicals.filter(musical => 
            musical.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (musical.place && musical.place.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        
        // 현재 페이지의 시작 및 끝 인덱스 계산
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        
        // 2. 현재 페이지에 표시할 항목 슬라이싱
        const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
        
        // 현재 페이지가 최대 페이지를 초과하지 않도록 보정
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }

        // 3. 6개 버튼 제한 로직 
        let startPage = Math.max(1, currentPage - Math.floor(MAX_BUTTONS / 2));
        
        if (startPage + MAX_BUTTONS - 1 > totalPages) {
            startPage = Math.max(1, totalPages - MAX_BUTTONS + 1);
        }

        const endPage = Math.min(totalPages, startPage + MAX_BUTTONS - 1);
        
        const displayPageNumbers = [];
        for (let i = startPage; i <= endPage; i++) {
            displayPageNumbers.push(i);
        }

        // ⚠️ 변수명 변경: filteredFestivals -> filteredMusicals
        return { currentItems, totalPages, displayPageNumbers, filteredMusicals: filtered }; 
    }, [musicals, currentPage, itemsPerPage, searchTerm]);

    // 페이지 번호 클릭 핸들러 (유지)
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // 검색어 입력 핸들러 (유지)
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    // 3. 캘린더 날짜 표시 함수 (tileContent 유지)
    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = formatDate(date);
            
            // ⚠️ 상태 변수 이름 변경: festivals -> musicals
            const hasEvent = musicals.some(musical => {
                const start = new Date(musical.start_date);
                const end = new Date(musical.end_date);
                const current = new Date(dateStr);

                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                current.setHours(0, 0, 0, 0);

                return current >= start && current <= end;
            });

            if (hasEvent) {
                return <div className="event-dot"></div>;
            }
        }
        return null;
    };


    // 4. 로딩 및 에러 처리 (유지)
    if (loading) {
        // ⚠️ 클래스 이름 변경: kpop-festival-page -> musical-page
        return <div className="musical-page" style={containerStyle}>뮤지컬/공연 정보를 불러오는 중...</div>;
    }
    
    if (error) {
        // ⚠️ 클래스 이름 변경: kpop-festival-page -> musical-page
        return <div className="musical-page error" style={containerStyle}>오류: {error}</div>;
    }

    return (
        // ⚠️ 클래스 이름 변경: kpop-festival-page -> musical-page
        <div className="musical-page" style={containerStyle}>
            <header className="page-header">
                {/* ⚠️ 제목 변경 */}
                <h1>🎭 Korean Musical & Performance List</h1>
            </header>

            <div className="content-wrapper">
                
                {/* 좌측 영역 래퍼: 캘린더와 이벤트 목록을 수직으로 묶습니다. */}
                <div className="calendar-side-wrapper"> 
                    
                    {/* 캘린더 섹션 (상단) */}
                    <section className="calendar-section">
                        <div className="calendar-box">
                            <Calendar
                                onChange={setCalendarDate}
                                value={calendarDate}
                                tileContent={tileContent} 
                                locale="ko-KR"
                                formatDay={(locale, date) => date.toLocaleString("en", { day: "numeric" })}
                            />
                        </div>
                    </section>
                    
                    {/* 선택된 날짜의 뮤지컬 목록 섹션 (캘린더 밑에 수직 배치) */}
                    <section className="calendar-events-section">
                        <h2 className="calendar-events-title">
                            {/* ⚠️ 텍스트 변경: 축제 -> 뮤지컬 */}
                            {formatDate(calendarDate)} ({filteredByCalendar.length}건)
                        </h2>
                        
                        <div className="calendar-events-list">
                            {/* 🌟 수정: .slice() 및 '더 보기' 로직을 제거하고 모든 이벤트를 렌더링합니다. */}
                            {filteredByCalendar.length > 0 ? (
                                // ⚠️ 변수명 변경: festival -> musical
                                filteredByCalendar.map((musical) => (
                                    // ⚠️ 컴포넌트 이름 변경: FestivalCard -> MusicalCard
                                    <CalendarEventItem key={musical.musical_id} musical={musical} />
                                ))
                            ) : (
                                // ⚠️ 메시지 변경
                                <p className="no-events-message">선택된 날짜에 예정된 뮤지컬/공연이 없습니다.</p>
                            )}
                        </div>
                    </section>
                </div>
                
                {/* 뮤지컬 목록 섹션 (우측 영역) */}
                <section className="musical-list-section">
                    
                    {/* 제목과 검색 창을 묶는 컨테이너 - 나란히 배치 */}
                    <div className="musical-header-wrapper">
                        
                        {/* 제목 (검색 결과 개수 포함) */}
                        {/* ⚠️ 제목 변경 */}
                        <h2>Musical & Performance Information 🧐</h2>
                        
                        {/* 검색 창 */}
                        <div className="musical-search-bar">
                            <input
                                type="text"
                                placeholder="뮤지컬/공연 제목 또는 장소 검색      🔎"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                    
                    {/* 검색 결과 표시 및 페이지네이션 */}
                    {currentItems.length > 0 ? (
                        <>
                            {/* ⚠️ 클래스 이름 변경: festival-cards-grid -> musical-cards-grid */}
                            <div className="musical-cards-grid">
                                {currentItems.map((musical) => (
                                    // ⚠️ 컴포넌트 이름 변경: FestivalCard -> MusicalCard
                                    <MusicalCard key={musical.musical_id} musical={musical} />
                                ))}
                            </div>

                            {/* 페이지네이션 컨트롤 */}
                            {totalPages > 1 && (
                                <div className="pagination-controls">
                                    {displayPageNumbers.map(number => (
                                        <button
                                            key={number}
                                            onClick={() => handlePageChange(number)}
                                            className={currentPage === number ? 'active' : ''}
                                            aria-label={`${number}페이지로 이동`}
                                        >
                                            {number}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="no-data-message">
                            {/* ⚠️ 메시지 변경 */}
                            {searchTerm ? '검색 결과가 없습니다.' : '현재 등록된 뮤지컬/공연 정보가 없습니다.'}
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

// ⚠️ export 이름 유지
export default MusicalPage;