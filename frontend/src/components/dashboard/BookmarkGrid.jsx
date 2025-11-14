// ktravel/frontend/src/components/dashboard/BookmarkGrid.jsx
import React from 'react';
import { Heart, Filter, SortAsc, Loader2 } from 'lucide-react';

const BookmarkGrid = ({
  sortedBookmarks,
  isLoadingBookmarks,
  bookmarkError,
  bookmarkFilter,
  sortOption,
  onChangeFilter,
  onChangeSort,
  onRetry,
  onToggleBookmark,
  hoveredCard,
  setHoveredCard,
}) => {
  return (
    <div className="bookmark-main">
      <div className="bookmark-header">
        <h2 className="section-title">
          <Heart size={20} color="#FF6B6B" />
          내 북마크
        </h2>
        <div className="bookmark-controls">
          <div className="filter-group">
            <span className="control-label">
              <Filter size={14} />
              필터
            </span>
            <select
              className="control-select"
              value={bookmarkFilter}
              onChange={(e) => onChangeFilter(e.target.value)}
            >
              <option value="전체">전체</option>
              <option value="명소">명소</option>
              <option value="음식">음식</option>
              <option value="K콘텐츠">K콘텐츠</option>
              <option value="페스티벌">페스티벌</option>
            </select>
          </div>
          <div className="sort-group">
            <span className="control-label">
              <SortAsc size={14} />
              정렬
            </span>
            <select
              className="control-select"
              value={sortOption}
              onChange={(e) => onChangeSort(e.target.value)}
            >
              <option value="최신순">최신순</option>
              <option value="오래된순">오래된순</option>
              <option value="이름순">이름순</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bookmark-grid">
        {isLoadingBookmarks ? (
          <div className="bookmark-loading">
            <Loader2 size={32} className="animate-spin" />
            <span style={{ marginLeft: '12px' }}>
              북마크를 불러오는 중...
            </span>
          </div>
        ) : bookmarkError && sortedBookmarks.length === 0 ? (
          <div className="bookmark-error">
            <div className="bookmark-error-title">
              ⚠️ 북마크 API 연결 실패
            </div>
            <div className="bookmark-error-desc">{bookmarkError}</div>
            <button className="retry-button" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        ) : sortedBookmarks.length === 0 ? (
          <div className="bookmark-empty">
            <div className="bookmark-empty-icon">❤️</div>
            <div className="bookmark-empty-title">
              {bookmarkFilter !== '전체'
                ? `"${bookmarkFilter}" 카테고리에 북마크가 없습니다`
                : '아직 북마크가 없습니다'}
            </div>
            <div className="bookmark-empty-desc">
              마음에 드는 콘텐츠를 저장해보세요
            </div>
          </div>
        ) : (
          sortedBookmarks.map((item) => (
            <div
              key={item.id}
              className="bookmark-card"
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="bookmark-image">
                <img src={item.image} alt={item.title} />
                <div
                  className="bookmark-heart"
                  onClick={() => onToggleBookmark(item.id)}
                >
                  <Heart
                    size={16}
                    fill={item.saved ? '#FF6B6B' : 'none'}
                    color="#FF6B6B"
                  />
                </div>
                {hoveredCard === item.id && item.actors && (
                  <div className="bookmark-hover">
                    출연: {item.actors.join(', ')}
                  </div>
                )}
              </div>
              <div className="bookmark-content">
                <div className="bookmark-title">{item.title}</div>
                <span className="bookmark-category">{item.category}</span>
                <div className="recent-tags">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookmarkGrid;
