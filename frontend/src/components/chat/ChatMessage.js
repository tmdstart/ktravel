// components/chat/ChatMessage.js
import React from 'react';
import './Chat.css';

function ChatMessage({ message }) {
    return (
        <div className={`chat-message ${message.isUser ? 'user' : 'bot'} ${message.isError ? 'error' : ''} ${message.isStreaming ? 'streaming' : ''}`}>
            {/* 텍스트 메시지 */}
            <div className="message-text">
                {message.text}
                
                {/* 🌊 Streaming 중일 때 타이핑 커서 표시 */}
                {message.isStreaming && message.text && (
                    <span className="typing-cursor"></span>
                )}
            </div>

            {/* 🔍 검색/생성 상태 표시 */}
            {message.status && (
                <div className="message-status">
                    {message.status}
                </div>
            )}

            {/* 타임스탬프 */}
            <div className="message-timestamp">
                {message.timestamp?.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}
            </div>

            {/* 🎯 이미지는 말풍선 완전히 밖으로! */}
            {message.results && message.results.length > 0 && (
                <div className="message-images-below">
                    {message.results.map((result, idx) => (
                        <div key={idx} className="image-wrapper-below">
                            {/* 🎭 축제 이미지 */}
                            {result.type === 'festival' && result.image_url && (
                                <img 
                                    src={result.image_url}
                                    alt={result.title}
                                    className="content-image-below"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            
                            {/* 📍 관광명소 이미지 */}
                            {result.type === 'attraction' && result.image_urls && (
                                <img 
                                    src={Array.isArray(result.image_urls) ? result.image_urls[0] : result.image_urls}
                                    alt={result.title}
                                    className="content-image-below"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            
                            {/* 🍽️ 레스토랑 이미지 */}
                            {result.type === 'restaurant' && result.image_url && (
                                <img 
                                    src={result.image_url}
                                    alt={result.restaurant_name || result.title}
                                    className="content-image-below"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}

                            {/* 🎬 K-Content(드라마) 이미지 - 새로 추가! */}
                            {result.type === 'kcontent' && result.thumbnail && (
                                <img 
                                    src={result.thumbnail}
                                    alt={`${result.drama_name} - ${result.location_name}`}
                                    className="content-image-below"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            
                            {/* 이미지 하단 정보 */}
                            <div className="image-caption-below">
                                {/* 🎭 축제 제목 */}
                                {result.type === 'festival' && (
                                    <span className="caption-title-below">{result.title}</span>
                                )}
                                
                                {/* 📍 관광명소 제목 */}
                                {result.type === 'attraction' && (
                                    <span className="caption-title-below">{result.title}</span>
                                )}
                                
                                {/* 🍽️ 레스토랑 제목 */}
                                {result.type === 'restaurant' && (
                                    <span className="caption-title-below">
                                        🍽️ {result.restaurant_name || result.title}
                                    </span>
                                )}

                                {/* 🎬 K-Content 제목 - 새로 추가! */}
                                {result.type === 'kcontent' && (
                                    <span className="caption-title-below">
                                        🎬 {result.drama_name} - {result.location_name}
                                    </span>
                                )}
                                
                                {/* 🎭 축제 날짜 */}
                                {result.type === 'festival' && result.start_date && result.end_date && (
                                    <span className="caption-date-below">
                                        📅 {result.start_date} ~ {result.end_date}
                                    </span>
                                )}
                                
                                {/* 📍 관광명소 주소 */}
                                {result.type === 'attraction' && result.address && (
                                    <span className="caption-address-below">
                                        📍 {result.address}
                                    </span>
                                )}
                                
                                {/* 🍽️ 레스토랑 위치 */}
                                {result.type === 'restaurant' && result.place && (
                                    <span className="caption-address-below">
                                        📍 {result.place}
                                    </span>
                                )}
                                
                                {/* 🍽️ 레스토랑 지하철역 */}
                                {result.type === 'restaurant' && result.subway && (
                                    <span className="caption-address-below">
                                        🚇 {result.subway}
                                    </span>
                                )}

                                {/* 🎬 K-Content 주소 - 새로 추가! */}
                                {result.type === 'kcontent' && result.address && (
                                    <span className="caption-address-below">
                                        📍 {result.address}
                                    </span>
                                )}

                                {/* 🎬 K-Content 카테고리 - 새로 추가! */}
                                {result.type === 'kcontent' && result.category && (
                                    <span className="caption-address-below">
                                        🏷️ {result.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 🎯 기존 개별 타입 표시 (하위 호환성) */}
            
            {/* 축제만 표시 */}
            {!message.results && message.festivals && message.festivals.length > 0 && (
                <div className="message-images-below">
                    {message.festivals.map((festival, idx) => (
                        <div key={idx} className="image-wrapper-below">
                            {festival.image_url && (
                                <>
                                    <img 
                                        src={festival.image_url}
                                        alt={festival.title}
                                        className="content-image-below"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    <div className="image-caption-below">
                                        <span className="caption-title-below">{festival.title}</span>
                                        {festival.start_date && festival.end_date && (
                                            <span className="caption-date-below">
                                                📅 {festival.start_date} ~ {festival.end_date}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* K-Content만 표시 (개별 호환성) */}
            {!message.results && message.kcontents && message.kcontents.length > 0 && (
                <div className="message-images-below">
                    {message.kcontents.map((kcontent, idx) => (
                        <div key={idx} className="image-wrapper-below">
                            {kcontent.thumbnail && (
                                <>
                                    <img 
                                        src={kcontent.thumbnail}
                                        alt={`${kcontent.drama_name} - ${kcontent.location_name}`}
                                        className="content-image-below"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    <div className="image-caption-below">
                                        <span className="caption-title-below">
                                            🎬 {kcontent.drama_name} - {kcontent.location_name}
                                        </span>
                                        {kcontent.address && (
                                            <span className="caption-address-below">
                                                📍 {kcontent.address}
                                            </span>
                                        )}
                                        {kcontent.category && (
                                            <span className="caption-address-below">
                                                🏷️ {kcontent.category}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ChatMessage;