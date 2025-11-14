import React from "react";
import "./KMediaCard.css";
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';

export default function KMediaCard({ item, onLikeToggle, onCardClick }) {
  const handleLikeClick = (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 막기
    onLikeToggle(item.id);
  };

  return (
    <div className="kmedia-card" onClick={() => onCardClick(item.id)}>
      <img
        src={item.thumbnail || "/placeholder.png"}
        alt={item.title}
        className="kmedia-image"
      /> 
      <h3 className="kmedia-title_en">{item.title_en}</h3>
      <h3 className="kmedia-location">{item.location}</h3>
      <p className="kmedia-title_ko">{item.title_ko}</p>

      <button
        className={`kmedia-like-btn ${item.liked ? "liked" : ""}`}
        onClick={handleLikeClick}
      >
        {item.liked ? <AiFillHeart style={{ color: 'red' }} /> : <AiOutlineHeart />}
      </button>
    </div>
  );
}
