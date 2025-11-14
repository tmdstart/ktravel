// ktravel/frontend/src/components/dashboard/TasteAnalysisCard.jsx
import React from 'react';
import { TrendingUp } from 'lucide-react';

const TasteAnalysisCard = ({ tasteAnalysis }) => {
  const total = tasteAnalysis.categories.reduce(
    (sum, cat) => sum + cat.value,
    0,
  );
  let cumulativePercentage = 0;

  return (
    <div className="taste-card">
      <h3 className="taste-header">
        <TrendingUp size={18} color="#3853FF" />
        취향 분석
      </h3>

      <div className="chart-container">
        <svg className="donut-chart" viewBox="0 0 140 140">
          <g transform="translate(70, 70)">
            {tasteAnalysis.categories.map((category, index) => {
              const percentage = (category.value / total) * 100;
              const startAngle = (cumulativePercentage * 360) / 100;
              const endAngle =
                ((cumulativePercentage + percentage) * 360) / 100;
              cumulativePercentage += percentage;

              const startAngleRad = (startAngle * Math.PI) / 180;
              const endAngleRad = (endAngle * Math.PI) / 180;

              const x1 = Math.cos(startAngleRad) * 45;
              const y1 = Math.sin(startAngleRad) * 45;
              const x2 = Math.cos(endAngleRad) * 45;
              const y2 = Math.sin(endAngleRad) * 45;

              const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} L 0 0 Z`}
                  fill={category.color}
                  opacity="0.9"
                />
              );
            })}
            <circle cx="0" cy="0" r="25" fill="white" />
          </g>
        </svg>
      </div>

      <div className="chart-legend">
        {tasteAnalysis.categories.map((cat, idx) => (
          <div key={idx} className="legend-item">
            <div
              className="legend-dot"
              style={{ background: cat.color }}
            ></div>
            <span>
              {cat.name} {cat.value}%
            </span>
          </div>
        ))}
      </div>

      <div className="taste-section">
        <div className="taste-label">주요 분위기 태그 TOP 5</div>
        <div className="taste-tags">
          {tasteAnalysis.topTags.map((tag, idx) => (
            <span key={idx} className="taste-tag">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="taste-section">
        <div className="taste-label">자주 방문한 지역</div>
        <div className="taste-tags">
          {tasteAnalysis.topLocations.map((loc, idx) => (
            <span key={idx} className="taste-tag">
              📍 {loc}
            </span>
          ))}
        </div>
      </div>

      <div className="taste-analysis">{tasteAnalysis.analysis}</div>
    </div>
  );
};

export default TasteAnalysisCard;
