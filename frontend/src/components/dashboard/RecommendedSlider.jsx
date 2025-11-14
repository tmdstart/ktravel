// ktravel/frontend/src/components/dashboard/RecommendedSlider.jsx
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
} from 'lucide-react';

const RecommendedSlider = ({ items, currentSlide, onPrev, onNext }) => {
  return (
    <div className="slider-container">
      <div className="slider-header">
        <h2 className="section-title">
          <Sparkles size={20} color="#3853FF" />
          추천 콘텐츠
        </h2>
        <div className="slider-controls">
          <button className="slider-btn" onClick={onPrev}>
            <ChevronLeft size={18} />
          </button>
          <button className="slider-btn" onClick={onNext}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="slides-wrapper">
        <div
          className="slides"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {items.map((item) => (
            <div key={item.id} className="slide-card">
              <div className="slide-image">
                <img src={item.image} alt={item.title} />
              </div>
              <div className="slide-content">
                <span className="category-badge">{item.category}</span>
                <h3 className="slide-title">{item.title}</h3>
                <div className="slide-location">
                  <MapPin size={14} />
                  {item.location}
                </div>
                <div className="slide-reason">💡 {item.reason}</div>
                <div className="slide-tags">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendedSlider;
