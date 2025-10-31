// src/pages/ConcertPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../styles/ConcertPage.css'; // 새로운 CSS 파일

const MAX_BUTTONS = 6;

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

const ConcertCard = ({ concert }) => {
  const dateRange =
    concert.start_date === concert.end_date
      ? formatDate(concert.start_date)
      : `${formatDate(concert.start_date)} - ${formatDate(concert.end_date)}`;

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
        <a
          href={concert.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="concert-get-tickets-button"
        >
          Get Tickets →
        </a>
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

  if (loading) return <div style={containerStyle}>로딩 중...</div>;
  if (error) return <div style={containerStyle}>오류: {error}</div>;

  return (
    <div className="concert-page" style={containerStyle}>
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
              {formatDate(calendarDate)} ({filteredByCalendar.length}건)
            </h2>

            <div className="concert-calendar-events-list">
              {filteredByCalendar.length > 0 ? (
                filteredByCalendar.map((concert) => (
                  <CalendarEventItem key={concert.id} concert={concert} />
                ))
              ) : (
                <p className="concert-no-events-message">
                  선택된 날짜에 예정된 콘서트가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="concert-list-section">
          <div className="concert-header-wrapper">
            <h2>Concert Information 🎵</h2>

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
                  <ConcertCard key={concert.id} concert={concert} />
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
