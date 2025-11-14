// ktravel/frontend/src/pages/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import '../styles/UserDashboard.css';
import {
  getBookmarks,
  deleteBookmark,
  getCurrentUser,
  PlaceType,
} from '../services/bookmarkService';

// 대시보드용 컴포넌트들
import RecommendedSlider from '../components/dashboard/RecommendedSlider';
import TasteAnalysisCard from '../components/dashboard/TasteAnalysisCard';
import RecentRecommendationGrid from '../components/dashboard/RecentRecommendationGrid';
import RecommendationBookmark from '../components/dashboard/Recommendationbookmark';
import BookmarkGrid from '../components/dashboard/BookmarkGrid';
import ReminderWidget from '../components/dashboard/ReminderWidget';

const UserDashboard = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bookmarkFilter, setBookmarkFilter] = useState('전체');
  const [sortOption, setSortOption] = useState('최신순');
  const [bookmarks, setBookmarks] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [bookmarkError, setBookmarkError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // --- 목 데이터(추천/취향/리마인더) ---
  const recommendedContent = [
    {
      id: 1,
      image: '/api/placeholder/400/300',
      title: '경복궁 야간개장',
      category: '명소',
      location: '서울 종로구',
      reason: '고궁의 밤, 한국 전통미를 만끽할 수 있는 특별한 경험',
      tags: ['야경', '전통', '포토스팟'],
    },
    {
      id: 2,
      image: '/api/placeholder/400/300',
      title: '이태원 클라쓰 촬영지',
      category: 'K콘텐츠',
      location: '서울 이태원',
      reason: '드라마 속 그 장면을 직접 체험해보세요',
      tags: ['드라마', '핫플', '맛집'],
    },
    {
      id: 3,
      image: '/api/placeholder/400/300',
      title: '광장시장 먹거리',
      category: '음식',
      location: '서울 종로구',
      reason: '넷플릭스에 소개된 한국 전통 시장의 맛',
      tags: ['먹방', '전통시장', '로컬'],
    },
    {
      id: 4,
      image: '/api/placeholder/400/300',
      title: '부산 국제영화제',
      category: '페스티벌',
      location: '부산 해운대',
      reason: '아시아 최대 영화제에서 K-영화의 현재를 만나다',
      tags: ['영화', '문화', '축제'],
    },
  ];

  const tasteAnalysis = {
    categories: [
      { name: '명소', value: 45, color: '#3853FF' },
      { name: '음식', value: 30, color: '#FF6B6B' },
      { name: 'K콘텐츠', value: 15, color: '#4ECDC4' },
      { name: '페스티벌', value: 10, color: '#FFD93D' },
    ],
    topTags: ['카페', '야경', '드라마촬영지', '한옥', '포토스팟'],
    topLocations: ['서울 성수동', '서울 서촌', '부산 해운대'],
    analysis:
      '잔잔한 감성 카페와 야경 명소를 자주 저장하고 있어요. 서울 성수·서촌을 중심으로 여행 테마가 형성되어 있네요.',
  };

  const recentRecommendations = [
    {
      id: 1,
      image: '/api/placeholder/200/150',
      title: '성수동 대림창고',
      tags: ['카페', '전시'],
      reason: '최근 검색한 "인더스트리얼 카페"와 유사',
    },
    {
      id: 2,
      image: '/api/placeholder/200/150',
      title: '더현대 서울',
      tags: ['쇼핑', '맛집'],
      reason: '어제 조회한 "여의도 핫플"과 연관',
    },
    {
      id: 3,
      image: '/api/placeholder/200/150',
      title: '북촌 한옥마을',
      tags: ['전통', '포토'],
      reason: '대화에서 언급한 "한옥 체험" 관련',
    },
    {
      id: 4,
      image: '/api/placeholder/200/150',
      title: '석지로 노가리 골목',
      tags: ['음식', '로컬'],
      reason: '"레트로 감성" 검색 기반 추천',
    },
    {
      id: 5,
      image: '/api/placeholder/200/150',
      title: '망원시장',
      tags: ['시장', '먹거리'],
      reason: '최근 본 "전통시장" 콘텐츠 관련',
    },
    {
      id: 6,
      image: '/api/placeholder/200/150',
      title: '한강공원 피크닉',
      tags: ['자연', '휴식'],
      reason: '봄 시즌 인기 장소',
    },
  ];

  const tasteReminders = [
    {
      id: 1,
      icon: '☕',
      message: '한 달 전 저장하신 서촌 감성 카페, 다시 가보고 싶지 않나요?',
      link: '/search?area=서촌&category=카페',
    },
    {
      id: 2,
      icon: '🌸',
      message: '벚꽃 시즌이 곧 시작됩니다. 벚꽃 명소 북마크가 많아요.',
      link: '/bookmarks?tag=벚꽃',
    },
    {
      id: 3,
      icon: '🎬',
      message: '최근 관심있던 K-드라마 촬영지, 이번 주말 어떠세요?',
      link: '/kcontent?type=drama',
    },
  ];

  // PlaceType → 한글 카테고리
  const getCategoryFromPlaceType = (placeType) => {
    switch (placeType) {
      case PlaceType.RESTAURANT:
        return '음식';
      case PlaceType.FESTIVAL:
        return '페스티벌';
      case PlaceType.ATTRACTION:
        return '명소';
      case PlaceType.KCONTENT:
        return 'K콘텐츠';
      default:
        return '명소';
    }
  };

  // 로그인한 사용자 정보 조회
  const fetchCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        console.log('✅ 현재 사용자:', user);
        return user;
      }

      console.warn('⚠️ 로그인된 사용자 없음, Mock 유저 사용');
      const mockUser = { id: 3, name: 'Test User' };
      setCurrentUser(mockUser);
      return mockUser;
    } catch (error) {
      console.error('❌ 사용자 정보 조회 실패:', error);
      const mockUser = { id: 3, name: 'Test User' };
      setCurrentUser(mockUser);
      return mockUser;
    }
  };

  // 북마크 조회
  const fetchBookmarks = async () => {
    setIsLoadingBookmarks(true);
    setBookmarkError(null);

    try {
      const user = currentUser || (await fetchCurrentUser());

      if (!user || !user.id) {
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }

      console.log('📡 북마크 조회 시작: user_id =', user.id);

      const bookmarkData = await getBookmarks(user.id);

      const formattedBookmarks = bookmarkData.map((item) => ({
        id: item.bookmark_id,
        bookmarkId: item.bookmark_id,
        title: item.name,
        image: item.image_url || '/api/placeholder/200/150',
        category: getCategoryFromPlaceType(item.place_type),
        placeType: item.place_type,
        tags: item.notes ? [item.notes] : [],
        actors: null,
        saved: true,
        savedDate: item.created_at,
        referenceId: item.reference_id,
        latitude: item.latitude,
        longitude: item.longitude,
      }));

      console.log('✅ 북마크 변환 완료:', formattedBookmarks);
      setBookmarks(formattedBookmarks);
    } catch (error) {
      console.error('❌ 북마크 조회 에러:', error);
      setBookmarkError(error.message);

      // 임시 Mock 데이터
      console.log('⚠️ Mock 데이터 사용');
      setBookmarks([
        {
          id: 1,
          image: '/api/placeholder/200/150',
          title: '남산타워',
          category: '명소',
          tags: ['야경', '데이트'],
          actors: null,
          saved: true,
          savedDate: '2024-01-15',
        },
        {
          id: 2,
          image: '/api/placeholder/200/150',
          title: '사랑의 불시착 촬영지',
          category: 'K콘텐츠',
          tags: ['드라마', '현빈'],
          actors: ['현빈', '손예진'],
          saved: true,
          savedDate: '2024-01-10',
        },
        {
          id: 3,
          image: '/api/placeholder/200/150',
          title: '명동 칼국수',
          category: '음식',
          tags: ['맛집', '로컬'],
          actors: null,
          saved: true,
          savedDate: '2024-01-08',
        },
      ]);
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 북마크 토글(삭제)
  const toggleBookmark = async (id) => {
    const bookmark = bookmarks.find((item) => item.id === id);
    if (!bookmark) return;

    const user = currentUser || (await fetchCurrentUser());
    if (!user || !user.id) {
      alert('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      return;
    }

    try {
      console.log(
        `🗑️ 북마크 삭제 시작: bookmark_id=${bookmark.bookmarkId || id}, user_id=${user.id}`,
      );

      // Optimistic UI
      setBookmarks((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, saved: false } : item,
        ),
      );

      await deleteBookmark(bookmark.bookmarkId || id, user.id);

      // 성공 후 실제 리스트에서 제거
      setTimeout(() => {
        setBookmarks((prev) => prev.filter((item) => item.id !== id));
      }, 300);

      console.log('✅ 북마크 삭제 성공');
    } catch (error) {
      console.error('❌ 북마크 삭제 실패:', error);
      alert('북마크 삭제에 실패했습니다: ' + error.message);

      // 롤백
      setBookmarks((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, saved: true } : item,
        ),
      );
    }
  };

  // 슬라이더 이동
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % recommendedContent.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + recommendedContent.length) % recommendedContent.length);
  };

  // 필터 + 정렬 적용
  const filteredBookmarks = bookmarks.filter((item) => {
    if (bookmarkFilter === '전체') return true;
    return item.category === bookmarkFilter;
  });

  const sortedBookmarks = [...filteredBookmarks].sort((a, b) => {
    switch (sortOption) {
      case '최신순':
        return new Date(b.savedDate) - new Date(a.savedDate);
      case '오래된순':
        return new Date(a.savedDate) - new Date(b.savedDate);
      case '이름순':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">My Dashboard</h1>
        <p className="dashboard-subtitle">
          당신의 K-Culture 여행 취향을 분석하고 맞춤 추천을 제공합니다
        </p>
      </div>

      {/* 상단: 추천 슬라이더 + 취향 분석 */}
      <div className="top-section">
        <RecommendedSlider
          items={recommendedContent}
          currentSlide={currentSlide}
          onPrev={prevSlide}
          onNext={nextSlide}
        />
        <TasteAnalysisCard tasteAnalysis={tasteAnalysis} />
      </div>
      {/* 북마크 기반 콘텐츠 추천 */}
      <RecommendationBookmark items={recentRecommendations} />
      
      {/* 최근 살펴본 콘텐츠 기반 추천 */}
      <RecentRecommendationGrid items={recentRecommendations} />

      {/* 북마크 + 리마인더 */}
      <div className="bookmark-section">
        <BookmarkGrid
          sortedBookmarks={sortedBookmarks}
          isLoadingBookmarks={isLoadingBookmarks}
          bookmarkError={bookmarkError}
          bookmarkFilter={bookmarkFilter}
          sortOption={sortOption}
          onChangeFilter={setBookmarkFilter}
          onChangeSort={setSortOption}
          onRetry={fetchBookmarks}
          onToggleBookmark={toggleBookmark}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />

        <ReminderWidget reminders={tasteReminders} />
      </div>
    </div>
  );
};

export default UserDashboard;
