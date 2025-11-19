// frontend/src/pages/UserDashboard.jsx

import React, { useState, useEffect } from 'react';
import { getLlmEnhancedRecommendations } from '../services/recommendLlmService';
import { ChevronLeft, ChevronRight, Heart, MapPin, Tag, TrendingUp, 
         Calendar, Sparkles, Clock, Filter, SortAsc, Loader2 } from 'lucide-react';
import KMediaDescription from '../components/KMedia/KMediaDescription';
import './UserDashboard.css';

const UserDashboard = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bookmarkFilter, setBookmarkFilter] = useState('전체');
  const [sortOption, setSortOption] = useState('최신순');
  const [bookmarks, setBookmarks] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [bookmarkError, setBookmarkError] = useState(null);
  
  // ✅ 추천 콘텐츠 상태
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  
  // ✅ 상세 팝업 상태
  const [selectedItem, setSelectedItem] = useState(null);

  const userId = 3;

  // ✅ Mock 데이터 (실제 데이터로 채움)
  const recommendedContent = [
    {
      id: 1,
      image: '/api/placeholder/400/300',
      title: 'loading...',
      category: 'loading...',
      location: 'loading...',
      reason: 'loading...',
      tags: ['loading...', 'loading...', 'loading...']
    },
    {
      id: 2,
      image: '/api/placeholder/400/300',
      title: 'loading...',
      category: 'loading...',
      location: 'loading...',
      reason: 'loading...',
      tags: ['loading...', 'loading...', 'loading...']
    }
  ];

  const tasteAnalysis = {
    categories: [
      { name: '명소', value: 45, color: '#3853FF' },
      { name: '음식', value: 30, color: '#FF6B6B' },
      { name: 'K콘텐츠', value: 15, color: '#4ECDC4' },
      { name: '페스티벌', value: 10, color: '#FFD93D' }
    ],
    topTags: ['카페', '야경', '드라마촬영지', '한옥', '포토스팟'],
    topLocations: ['서울 성수동', '서울 서촌', '부산 해운대'],
    analysis: '잔잔한 감성 카페와 야경 명소를 자주 저장하고 있어요.'
  };

  // ✅ 추천 콘텐츠 조회
  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoadingRecommendations(true);
      try {
        const data = await getLlmEnhancedRecommendations({
          userId: userId,
          placeType: 3,
          topKPerBookmark: 5,
          useLlm: false
        });
        
        console.log('✅ 추천 데이터:', data);
        setRecommendations(data.recommendations || []);
      } catch (error) {
        console.error('❌ 추천 조회 실패:', error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    if (userId) {
      fetchRecommendations();
    }
  }, [userId]);

  // ✅ 추천 카드 클릭
  const handleRecommendationClick = async (item) => {
    console.log('📱 추천 카드 클릭:', item);
    
    if (!item.reference_id) {
      console.error('❌ reference_id 없음');
      return;
    }
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/kcontents/${item.reference_id}`
      );
      
      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }

      const data = await response.json();
      
      setSelectedItem(data);
    } catch (error) {
      console.error('❌ 상세 정보 조회 실패:', error);
      alert('상세 정보를 불러올 수 없습니다.');
    }
  };

  const handlePopupClose = () => {
    setSelectedItem(null);
  };

  const handleAddLocation = (item, dayTitle) => {
    console.log('✅ 일정 추가:', item.title, dayTitle);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % recommendedContent.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + recommendedContent.length) % recommendedContent.length);
  };

  return (
    <div className="dashboard-container">
      {/* 헤더 */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Dashboard</h1>
        <p className="dashboard-subtitle">
          Analyze your K-Culture travel preferences and provide personalized recommendations
        </p>
      </div>

      {/* ✅ 추천 섹션 */}
      <div className="recent-section">
        <h2 className="section-title">
          <Sparkles size={20} color="#3853FF" />
          당신을 위한 추천 콘텐츠
        </h2>
        
        {isLoadingRecommendations ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '12px', color: '#666' }}>추천 콘텐츠 로딩 중...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>추천할 콘텐츠가 없습니다.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              북마크를 추가하면 맞춤 추천을 받을 수 있어요!
            </p>
          </div>
        ) : (
          <div className="recent-grid">
            {recommendations.slice(0, 6).map((item) => (
              <div 
                key={item.reference_id} 
                className="recent-card"
                onClick={() => handleRecommendationClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="recent-image">
                  <img 
                    src={item.image_url || '/api/placeholder/200/150'} 
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = '/api/placeholder/200/150';
                    }}
                  />
                </div>
                <div className="recent-content">
                  <div className="recent-title">{item.name}</div>
                  
                  {item.category && (
                    <div className="recent-tags">
                      <span className="tag">#{item.category}</span>
                    </div>
                  )}
                  
                  {item.llm_reason && (
                    <div className="recent-reason">
                      💡 {item.llm_reason}
                    </div>
                  )}
                  
                  {item.llm_match_score && (
                    <div className="match-score">
                      ⭐ 매칭: {(item.llm_match_score * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ 상세 팝업 */}
      {selectedItem && (
        <KMediaDescription
          item={selectedItem}
          onClose={handlePopupClose}
          onAddLocation={handleAddLocation}
        />
      )}
    </div>
  );
};

export default UserDashboard;