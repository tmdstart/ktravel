// ktravel/frontend/src/pages/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import '../styles/UserDashboard.css';
import {
  getBookmarks,
  deleteBookmark,
  getCurrentUser,
  PlaceType,
} from '../services/bookmarkService';
import KMediaDescription from '../components/KMedia/KMediaDescription';
import { fetchKContentDetail } from '../components/KMedia/KMediaCardData';
import { getLlmEnhancedRecommendations } from '../services/recommendLlmService';

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
  const [selectedItem, setSelectedItem] = useState(null); // ✅ K-콘텐츠 상세 모달용
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [bookmarkError, setBookmarkError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [llmRecommendations, setLlmRecommendations] = useState([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [recsError, setRecsError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [uiItems, setUiItems] = useState([]);

  // --- 목 데이터(추천/취향/리마인더) ---
  const recommendedContent = [
    {
      id: 1,
      image: '/api/placeholder/400/300',
      title: 'loading...',
      category: 'loading...',
      location: 'loading...',
      reason: 'loading...',
      tags: ['loading...', 'loading...', 'loading...'],
    },
    {
      id: 2,
      image: '/api/placeholder/400/300',
      title: 'loading...',
      category: 'loading...',
      location: 'loading...',
      reason: 'loading...',
      tags: ['loading...', 'loading...', 'loading...'],
    },
    {
      id: 3,
      image: '/api/placeholder/400/300',
      title: 'loading...',
      category: 'loading...',
      location: 'loading...',
      reason: 'loading...',
      tags: ['loading...', 'loading...', 'loading...'],
    },
    {
      id: 4,
      image: '/api/placeholder/400/300',
      title: 'loading...',
      category: 'loading...',
      location: 'loading...',
      reason: 'loading...',
      tags: ['loading...', 'loading...', 'loading...'],
    },
  ];

  const tasteAnalysis = {
    categories: [
      { name: 'Landmark', value: 45, color: '#3853FF' },
      { name: 'restaurant', value: 30, color: '#FF6B6B' },
      { name: 'K-content', value: 15, color: '#4ECDC4' },
      { name: 'Festival', value: 10, color: '#FFD93D' },
    ],
    topTags: ['Cafe', 'Night View', 'Drama Filming Location', 'Hanok', 'Photo Spot'],
    topLocations: ['Seoul Seongsu-dong', 'Seoul Seochon', 'Busan Haeundae'],
    analysis:
      "I often save cafes with a serene atmosphere and night view spots. My travel themes are centered around Seoul's Seongsu and Seochon neighborhoods.",
  };

  const recentRecommendations = [
    {
      id: 1,
      image: '/api/placeholder/200/150',
      title: 'loading...',
      tags: ['loading...', 'loading...'],
      reason: 'loading...',
    },
    {
      id: 2,
      image: '/api/placeholder/200/150',
      title: 'loading...',
      tags: ['loading...', 'loading...'],
      reason: 'loading...',
    },
    {
      id: 3,
      image: '/api/placeholder/200/150',
      title: 'loading...',
      tags: ['loading...', 'loading...'],
      reason: 'loading...',
    },
    {
      id: 4,
      image: '/api/placeholder/200/150',
      title: 'loading...',
      tags: ['loading...', 'loading...'],
      reason: 'loading...',
    },
    {
      id: 5,
      image: '/api/placeholder/200/150',
      title: 'loading...',
      tags: ['loading...', 'loading...'],
      reason: 'loading...',
    },
    {
      id: 6,
      image: '/api/placeholder/200/150',
      title: 'loading...',
      tags: ['loading...', 'loading...'],
      reason: 'loading...',
    },
  ];

  const tasteReminders = [
    {
      id: 1,
      icon: '☕',
      message: "That charming Seochon cafe you saved a month ago—don't you want to visit it again?",
      link: '/search?area=서촌&category=카페',
    },
    {
      id: 2,
      icon: '🌸',
      message: 'Cherry blossom season is about to begin. I have many bookmarks for cherry blossom spots.',
      link: '/bookmarks?tag=벚꽃',
    },
    {
      id: 3,
      icon: '🎬',
      message: "How about visiting the filming locations of that K-drama you've been interested in this weekend?",
      link: '/kcontent?type=drama',
    },
  ];

  // ✅ 슬라이더와 추천 카드용 아이템 결정
  const sliderItems =
    llmRecommendations.length > 0 ? llmRecommendations : recommendedContent;

  const recentItems =
    llmRecommendations.length > 0
      ? llmRecommendations.slice(0, 12)
      : recentRecommendations;

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
      setBookmarks([]);
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  // ✅ LLM 기반 추천 조회
  const fetchLlmRecommendations = async (user) => {
    try {
      setIsLoadingRecs(true);
      setRecsError(null);

      const targetUser = user || currentUser || (await fetchCurrentUser());

      if (!targetUser || !targetUser.id) {
        console.warn('⚠️ 사용자 정보 없음 - 목 데이터 사용');
        setLlmRecommendations([]);
        setIsLoadingRecs(false);
        return;
      }

      console.log('📡 LLM 추천 조회 시작: user_id =', targetUser.id);

      const data = await getLlmEnhancedRecommendations({
        userId: targetUser.id,
        placeType: 3, // K-콘텐츠만
        topKPerBookmark: 5,
        useLlm: false, // 빠른 추천
      });

      console.log('✅ LLM 추천 응답:', data);

      // 추천이 없으면 빈 배열로
      if (!data.recommendations || data.recommendations.length === 0) {
        console.warn('⚠️ 추천 결과가 없습니다. 목 데이터를 사용합니다.');
        setLlmRecommendations([]);
        setIsLoadingRecs(false);
        return;
      }

      // data.recommendations 배열을 대시보드에서 쓰기 좋게 매핑
      const mapped = data.recommendations.map((item, idx) => ({
        id: item.reference_id ?? idx,
        image: item.image_url || item.thumbnail || item.extra?.thumbnail || item.extra?.image_url || '/api/placeholder/400/300',
        title: item.name,
        category: getCategoryFromPlaceType(item.place_type),
        location: item.address || '',
        reason: item.llm_reason || '이 장소를 추천드립니다.',
        tags:
          item.extra?.keyword_en
            ?.split(',')
            .map((t) => t.trim())
            .filter(Boolean) || [],
      }));

      console.log('✅ 매핑된 추천:', mapped);
      setLlmRecommendations(mapped);
    } catch (error) {
      console.error('❌ LLM 추천 조회 실패:', error);
      setRecsError(error.message);
      
      // 에러 발생 시 빈 배열로 (목 데이터 사용)
      setLlmRecommendations([]);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      console.log('🚀 Dashboard 초기화');
      const user = await fetchCurrentUser();
      
      // 병렬로 실행
      await Promise.all([
        fetchBookmarks(),
        fetchLlmRecommendations(user),
      ]);
    };
    
    init();
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

    // ✅ K-콘텐츠 북마크 클릭 시 상세 모달 열기
  const handleBookmarkClick = async (bookmark) => {
    console.log('📱 북마크 카드 클릭:', bookmark);

    // K-콘텐츠가 아닌 경우는 아직 상세 모달을 열지 않음
    if (bookmark.placeType !== PlaceType.KCONTENT) {
      console.log('ℹ️ 아직 K-콘텐츠 북마크만 상세 보기 지원:', bookmark.placeType);
      return;
    }

    const referenceId = bookmark.referenceId || bookmark.id;

    if (!referenceId) {
      console.error('❌ reference_id 없음:', bookmark);
      return;
    }

    try {
      // ✅ K-콘텐츠 상세 정보 조회
      const data = await fetchKContentDetail(referenceId);

      console.log('✅ K-콘텐츠 상세 API 응답:', data);

      // ✅ KMediaDescription에서 기대하는 형태로 변환
      const detailItem = {
        id: data.content_id,
        title: data.location_name_en || data.location_name,
        title_en: data.location_name_en,
        title_ko: data.location_name,
        description: data.drama_desc,
        location: data.address_en || data.address,
        thumbnail: data.thumbnail,
        image_url_list: data.image_url_list || [data.thumbnail],
        drama_name_en: data.drama_name_en,
        category_en: data.category_en,
        keyword_en: data.keyword_en,
        trip_tip_en: data.trip_tip_en,
        latitude: data.latitude,
        longitude: data.longitude,
      };

      console.log('✅ 변환된 detailItem:', detailItem);
      setSelectedItem(detailItem);
    } catch (error) {
      console.error('❌ 상세 정보 조회 실패:', error);
      alert('상세 정보를 불러올 수 없습니다: ' + error.message);
    }
  };


  // 슬라이더 이동
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + sliderItems.length) % sliderItems.length
    );
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
          Analyze your K-Culture travel preferences and provide personalized recommendations
        </p>
      </div>

      {/* 상단: 추천 슬라이더 + 취향 분석 */}
      <div className="dashboard-top-section">
        <RecommendedSlider
          items={sliderItems}
          currentSlide={currentSlide}
          onPrev={prevSlide}
          onNext={nextSlide}
        />
        <TasteAnalysisCard tasteAnalysis={tasteAnalysis} />
      </div>

      {/* ✅ 좋아하는 콘텐츠 추천 (LLM 추천 사용) */}
      <RecommendationBookmark items={recentItems} />

      {/* 최근 살펴본 콘텐츠 기반 추천 */}
      <RecentRecommendationGrid items={recentItems} />

      {/* 북마크 + 리마인더 */}
      <div className="dashboard-bookmark-section">
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