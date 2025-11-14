import React, { useState } from 'react';
import "../styles/MydashPage.css";

// ⭐️ 목데이터 (Mock Data)
const MOCK_DASHBOARD_DATA = {
  user: {
    id: 1,
    name: '김개발',
    email: 'dev.kim@example.com',
    avatarUrl: 'https://via.placeholder.com/150/007bff/ffffff?text=User',
  },
  items: [
    { id: 'a1', title: 'React 상태 관리 완벽 가이드', category: '개발', isBookmarked: true },
    { id: 'b2', title: '2025년 프론트엔드 트렌드 보고서', category: '기술', isBookmarked: false },
    { id: 'c3', title: '성공적인 프로젝트 팀 빌딩 전략', category: '경영', isBookmarked: true },
    { id: 'd4', title: 'TypeScript 기초부터 실전까지', category: '개발', isBookmarked: false },
  ],
};

const Dashboard = () => {
  // 아이템 목록과 북마크 상태를 상태로 관리
  const [items, setItems] = useState(MOCK_DASHBOARD_DATA.items);
  const user = MOCK_DASHBOARD_DATA.user;

  /**
   * 북마크 상태를 토글하는 함수
   * @param {string} itemId - 토글할 아이템의 ID
   */
  const toggleBookmark = (itemId) => {
    setItems((prevItems) => 
      prevItems.map((item) => 
        item.id === itemId 
          ? { ...item, isBookmarked: !item.isBookmarked } 
          : item
      )
    );
  };

  const bookmarkedItems = items.filter(item => item.isBookmarked);

  return (
    <div className="dashboard-container">
      <h1>👋 사용자 대시보드</h1>
      
      {/* 1. 사용자 프로필 섹션 */}
      <section className="profile-section">
        <img src={user.avatarUrl} alt={user.name} className="profile-avatar" />
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </section>

      <hr />

      {/* 2. 북마크된 아이템 섹션 */}
      <section className="bookmarked-section">
        <h2>⭐️ 내 북마크 ({bookmarkedItems.length}개)</h2>
        {bookmarkedItems.length > 0 ? (
          <div className="item-list bookmarked-list">
            {bookmarkedItems.map((item) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        ) : (
          <p className="empty-message">아직 북마크한 항목이 없습니다.</p>
        )}
      </section>

      <hr />

      {/* 3. 전체 아이템 목록 섹션 */}
      <section className="all-items-section">
        <h2>전체 항목</h2>
        <div className="item-list">
          {items.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onToggleBookmark={toggleBookmark}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

// 개별 아이템 카드 컴포넌트
const ItemCard = ({ item, onToggleBookmark }) => {
  const bookmarkIcon = item.isBookmarked ? '⭐' : '☆'; // 북마크 아이콘 변경

  return (
    <div className="item-card">
      <div className="item-info">
        <span className="item-category">[{item.category}]</span>
        <h3 className="item-title">{item.title}</h3>
      </div>
      <button 
        className={`bookmark-btn ${item.isBookmarked ? 'active' : ''}`}
        onClick={() => onToggleBookmark(item.id)}
        aria-label={item.isBookmarked ? '북마크 취소' : '북마크 하기'}
      >
        {bookmarkIcon}
      </button>
    </div>
  );
};

export default Dashboard;