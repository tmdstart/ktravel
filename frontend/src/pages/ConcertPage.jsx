// src/pages/ConcertPage.jsx
import React, { useEffect, useState } from "react";

const ConcertPage = () => {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 콘서트 데이터 fetch
  const fetchConcerts = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/concerts/");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConcerts(data);
    } catch (err) {
      console.error("콘서트 조회 오류:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerts();
  }, []);

  if (loading) return <p>콘서트 데이터를 불러오는 중...</p>;
  if (error) return <p>오류 발생: {error}</p>;

  return (
    <div>
      <h1>콘서트 목록</h1>
      {concerts.length === 0 ? (
        <p>등록된 콘서트가 없습니다.</p>
      ) : (
        <ul>
          {concerts.map((concert) => (
            <li key={concert.concert_id}>
              <h3>{concert.title}</h3>
              <p>
                기간: {concert.start_date}{" "}
                {concert.end_date ? `~ ${concert.end_date}` : ""}
              </p>
              {concert.place && <p>장소: {concert.place}</p>}
              {concert.link && (
                <p>
                  <a href={concert.link} target="_blank" rel="noopener noreferrer">
                    예매 / 정보 페이지
                  </a>
                </p>
              )}
              {concert.image && (
                <img
                  src={concert.image}
                  alt={concert.title}
                  style={{ maxWidth: "300px" }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConcertPage;
