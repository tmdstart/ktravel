// ktravel/frontend/src/components/dashboard/RecentRecommendationGrid.jsx
import React from 'react';
import { Clock } from 'lucide-react';

const RecentRecommendationGrid = ({ items }) => {
  return (
    <div className="recent-section">
      <h2 className="section-title">
        <Clock size={20} color="#3853FF" />
        최근 살펴본 콘텐츠 기반으로 추천드려요
      </h2>
      <div className="recent-grid">
        {items.map((item) => (
          <div key={item.id} className="recent-card">
            <div className="recent-image">
              <img src={item.image} alt={item.title} />
            </div>
            <div className="recent-content">
              <div className="recent-title">{item.title}</div>
              <div className="recent-tags">
                {item.tags.map((tag, idx) => (
                  <span key={idx} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="recent-reason">💭 {item.reason}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentRecommendationGrid;
