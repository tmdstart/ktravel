// src/pages/ConcertPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/ConcertPage.css'; // 새로운 CSS 파일
import MapModal from '../components/location_modal/MapModal'; // 📌 1. MapModal import 추가

const MAX_BUTTONS = 6;

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) month = '0' + day;

    return [year, month, day].join('-');
};

// 📌 핸들러 props를 추가했습니다.
const ConcertCard = ({ concert, handleViewMap, handleAddSchedule }) => {
    const dateRange =
        concert.start_date === concert.end_date
            ? formatDate(concert.start_date)
            : `${formatDate(concert.start_date)} - ${formatDate(concert.end_date)}`;

    // 📌 Map & Add 버튼 클릭 시 장소 추가와 지도 보기를 동시에 처리하는 핸들러
    const handleMapAndAddClick = (concert) => {
        // 현재는 handleViewMap만 호출하여 모달을 띄웁니다.
        // 모달 내부에 장소 추가 버튼이 있으므로 모달에서 handleAddSchedule을 호출합니다.
        handleViewMap(concert); 
    };

    return (
        <div className="concert-card-container">
            <div className="concert-card-image-box">
                <img
                    src={concert.image || '/default-kpop-image.png'}
                    alt={concert.title}
                    className="concert-card-image"
                />
            </div>
            <div className="concert-card-details">
                <h3 className="concert-card-title">{concert.title}</h3>
                <p className="concert-card-date">{dateRange}</p>
                {concert.place && <p className="concert-card-place">{concert.place}</p>}
                <p className="concert-card-genre">Concert</p>

                {/* 📌 버튼 액션 영역 */}
                <div className="concert-card-actions">
                    
                    {/* 1. 📌 [Map & Add 버튼]이 먼저 오도록 배치 (핸들러 수정) */}
                    {concert.place && (
                        <button
                            className="concert-view-map-button"
                            onClick={() => handleMapAndAddClick(concert)} // 수정된 핸들러 사용
                        >
                            Map & Add
                        </button>
                    )}
                    
                    {/* 2. 📌 [Get Tickets 버튼]이 다음에 오도록 배치 */}
                    <a
                        href={concert.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="concert-get-tickets-button"
                    >
                        Get Tickets →
                    </a>
                </div>
                {/* --------------------------- */}
            </div>
        </div>
    );
};

const CalendarEventItem = ({ concert }) => {
    const iconColor = concert.place?.includes('대학교') ? '#5cb85c' : '#f0ad4e';
    const dateRange =
        concert.start_date === concert.end_date
            ? formatDate(concert.start_date)
            : `${formatDate(concert.start_date)} ~ ${formatDate(concert.end_date)}`;

    return (
        <div className="concert-calendar-event-item">
            <span className="concert-event-icon" style={{ backgroundColor: iconColor }}></span>
            <span className="concert-event-title">{concert.title}</span>
            <span className="concert-event-date">{dateRange}</span>
        </div>
    );
};

const ConcertPage = ({ isEmbedded }) => {
    const [concerts, setConcerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    
    // 📌 지도 모달을 위한 상태 추가
    const [selectedConcert, setSelectedConcert] = useState(null); 

    const containerStyle = isEmbedded
        ? {
            padding: '20px',
            minHeight: '100%',
            maxWidth: 'none',
            margin: 0,
            backgroundColor: 'transparent',
        }
        : {};
    useEffect(() => {
        document.body.classList.add('concert-page-body');

        return () => {
            document.body.classList.remove('concert-page-body');
        };
    }, []);


    useEffect(() => {
        const fetchConcerts = async () => {
            try {
                const response = await api.get('/api/concerts');
                setConcerts(response.data);
                setLoading(false);
            } catch (err) {
                console.error('데이터 로딩 실패:', err);
                setError('콘서트 데이터를 불러오는 데 실패했습니다.');
                setLoading(false);
            }
        };
        fetchConcerts();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);
    
    // 📌 지도 보기 핸들러 (모달 상태 설정)
    const handleViewMap = (concert) => {
        setSelectedConcert(concert); // 선택된 콘서트 정보를 저장하여 모달을 띄웁니다.
    };

    // 📌 장소 추가 핸들러 (모달에서 호출될 로직)
    const handleAddSchedule = (concert) => {
        // 여기에 실제 일정(장소) 추가 로직을 구현합니다.
        console.log(`[${concert.title}] 콘서트 장소를 일정에 추가합니다.`);
        alert(`[${concert.title}] 콘서트 장소가 일정에 추가되었습니다!`);
    };

    const filteredByCalendar = useMemo(() => {
        if (!calendarDate) return [];

        const selectedDate = new Date(calendarDate);
        selectedDate.setHours(0, 0, 0, 0);

        return concerts.filter((concert) => {
            const start = new Date(concert.start_date);
            const end = new Date(concert.end_date);

            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            return selectedDate >= start && selectedDate <= end;
        });
    }, [concerts, calendarDate]);

    const { currentItems, totalPages, displayPageNumbers } = useMemo(() => {
        const filtered = concerts.filter((concert) =>
            concert.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalPages = Math.ceil(filtered.length / itemsPerPage);

        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;

        const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }

        let startPage = Math.max(1, currentPage - Math.floor(MAX_BUTTONS / 2));
        if (startPage + MAX_BUTTONS - 1 > totalPages) {
            startPage = Math.max(1, totalPages - MAX_BUTTONS + 1);
        }

        const endPage = Math.min(totalPages, startPage + MAX_BUTTONS - 1);
        const displayPageNumbers = [];
        for (let i = startPage; i <= endPage; i++) displayPageNumbers.push(i);

        return { currentItems, totalPages, displayPageNumbers };
    }, [concerts, currentPage, itemsPerPage, searchTerm]);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const tileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = formatDate(date);

            const hasEvent = concerts.some((concert) => {
                const start = new Date(concert.start_date);
                const end = new Date(concert.end_date);
                const current = new Date(dateStr);

                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                current.setHours(0, 0, 0, 0);

                return current >= start && current <= end;
            });

            if (hasEvent) {
                return <div className="concert-event-dot"></div>;
            }
        }
        return null;
    };

    if (loading) return <div style={containerStyle}>Loding...</div>;
    if (error) return <div style={containerStyle}>error: {error}</div>;

    return (
        <div className="concert-page" style={containerStyle}>
            
            {/* 📌 2. MapModal 조건부 렌더링 및 props 전달 */}
            {selectedConcert && (
                <MapModal 
                    concert={selectedConcert} 
                    onClose={() => setSelectedConcert(null)} // 모달 닫기
                    onAddSchedule={handleAddSchedule} // 장소 추가 핸들러 전달
                />
            )}
            {/* ----------------------------------------------------------------- */}

            <header className="concert-page-header">
                <h1>K-POP Concert List & Ticketing Home!</h1>
            </header>

            <div className="concert-content-wrapper">
                <div className="concert-calendar-side-wrapper">
                    <section className="concert-calendar-section">
                        <div className="concert-calendar-box">
                            <Calendar
                                onChange={setCalendarDate}
                                value={calendarDate}
                                tileContent={tileContent}
                                locale="ko-KR"
                                formatDay={(locale, date) =>
                                    date.toLocaleString('en', { day: 'numeric' })
                                }
                            />
                        </div>
                    </section>

                    <section className="concert-calendar-events-section">
                        <h2 className="concert-calendar-events-title">
                            {formatDate(calendarDate)} ({filteredByCalendar.length} case)
                        </h2>

                        <div className="concert-calendar-events-list">
                            {filteredByCalendar.length > 0 ? (
                                filteredByCalendar.map((concert) => (
                                    <CalendarEventItem key={concert.id} concert={concert} />
                                ))
                            ) : (
                                <p className="concert-no-events-message">
                                    There are no concerts scheduled for the selected date.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                <section className="concert-list-section">
                    <div className="concert-header-wrapper">
                        <h2>Concert Information 
                            <svg width="4%" height="5%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18V6.35537C9 5.87383 9 5.63306 9.0876 5.43778C9.16482 5.26565 9.28917 5.11887 9.44627 5.0144C9.62449 4.89588 9.86198 4.8563 10.337 4.77714L19.137 3.31047C19.7779 3.20364 20.0984 3.15023 20.3482 3.243C20.5674 3.32441 20.7511 3.48005 20.8674 3.68286C21 3.91398 21 4.23889 21 4.8887V16M9 18C9 19.6568 7.65685 21 6 21C4.34315 21 3 19.6568 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18ZM21 16C21 17.6568 19.6569 19 18 19C16.3431 19 15 17.6568 15 16C15 14.3431 16.3431 13 18 13C19.6569 13 21 14.3431 21 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg> 
                        </h2>

                        <div className="concert-search-bar">
                            <input
                                type="text"
                                placeholder="Search by title 🔍"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                    </div>
                

                    {currentItems.length > 0 ? (
                        <>
                            <div className="concert-cards-grid">
                                {currentItems.map((concert) => (
                                    <ConcertCard 
                                        key={concert.id} 
                                        concert={concert} 
                                        handleViewMap={handleViewMap} // 📌 핸들러 전달
                                    />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="concert-pagination-controls">
                                    {displayPageNumbers.map((number) => (
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
                        <p className="concert-no-data-message">
                            {searchTerm
                                ? '검색 결과가 없습니다.'
                                : '현재 등록된 콘서트 정보가 없습니다.'}
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ConcertPage;