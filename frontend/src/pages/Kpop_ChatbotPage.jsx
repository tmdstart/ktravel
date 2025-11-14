import React, { useState, useEffect, useRef } from 'react';
import '../styles/Kpop_ChatbotPage.css';
import {
    ArrowBack,
    WbSunny,
    Search,
} from '@mui/icons-material';

function Kpop_ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messageEndRef = useRef(null);
    const [streamingMessage, setStreamingMessage] = useState('');

    // 🎬 인기 K-Drama 6개 (고정)
    const popularDramas = [
        {
            id: 1,
            drama_name: "사랑의 불시착",
            drama_name_en: "Crash Landing on You",
            location_name: "북촌 한옥마을",
            emoji: "🪂",
            thumbnail: "https://images.unsplash.com/photo-1583675823417-b2b7d1e8e5e8?w=400",
            description: "The iconic scene where Yoon Se-ri and Captain Ri met"
        },
        {
            id: 2,
            drama_name: "이태원 클라쓰",
            drama_name_en: "Itaewon Class",
            location_name: "이태원 거리",
            emoji: "🍺",
            thumbnail: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
            description: "Park Sae-ro-yi's DanBam restaurant street"
        },
        {
            id: 3,
            drama_name: "도깨비",
            drama_name_en: "Goblin",
            location_name: "덕수궁 돌담길",
            emoji: "🍁",
            thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
            description: "The legendary buckwheat field scene location"
        },
        {
            id: 4,
            drama_name: "태양의 후예",
            drama_name_en: "Descendants of the Sun",
            location_name: "송중기 촬영지",
            emoji: "⚕️",
            thumbnail: "https://images.unsplash.com/photo-1504253492562-48c2123f0e45?w=400",
            description: "Captain Yoo Si-jin and Dr. Kang's romantic spots"
        },
        {
            id: 5,
            drama_name: "킹덤",
            drama_name_en: "Kingdom",
            location_name: "경복궁",
            emoji: "👑",
            thumbnail: "https://images.unsplash.com/photo-1545640287-08b8c4c24f63?w=400",
            description: "Historic palace where zombie apocalypse began"
        },
        {
            id: 6,
            drama_name: "별에서 온 그대",
            drama_name_en: "My Love from the Star",
            location_name: "N서울타워",
            emoji: "⭐",
            thumbnail: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400",
            description: "Do Min-joon and Cheon Song-yi's romantic viewpoint"
        }
    ];

    // 자동 스크롤
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingMessage]);

    // Welcome 카드 클릭 핸들러
    const handleWelcomeCardClick = (drama) => {
        const query = `Tell me about ${drama.drama_name} filming location`;
        handleSendMessage(query);
    };

    // 메시지 전송 (스트리밍)
    const handleSendMessage = async (customMessage = null) => {
        const messageToSend = customMessage || inputMessage.trim();
        if (!messageToSend || isLoading) return;

        setInputMessage('');
        setIsLoading(true);

        // 사용자 메시지 추가
        const userMessage = {
            type: 'user',
            content: messageToSend,
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            const token = localStorage.getItem('session_id');
            
            if (!token) {
                throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
            }
            
            const response = await fetch('http://localhost:8000/api/chat/kcontents/send/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: messageToSend })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
                }
                throw new Error(`HTTP ${response.status}: 스트리밍 요청 실패`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));

                            if (jsonData.type === 'chunk') {
                                accumulatedText += jsonData.content;
                                setStreamingMessage(accumulatedText);
                            } else if (jsonData.type === 'done') {
                                console.log('🎬 K-Content 완료 데이터:', jsonData);
                                console.log('🗺️ 지도 마커:', jsonData.map_markers);
                                console.log('🎭 K-Content 결과:', jsonData.kcontents);
                                
                                const botMessage = {
                                    type: 'bot',
                                    content: jsonData.full_response,
                                    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                                    kcontents: jsonData.kcontents || [],
                                    has_kcontents: jsonData.has_kcontents || false,
                                    results: jsonData.results || jsonData.kcontents || [],
                                    map_markers: jsonData.map_markers || []
                                };
                                setMessages(prev => [...prev, botMessage]);
                                setStreamingMessage('');

                                // 🗺️ 지도 마커 처리
                                if (jsonData.map_markers && jsonData.map_markers.length > 0) {
                                    console.log('🗺️ 지도 마커 처리 시작:', jsonData.map_markers.length + '개');
                                    
                                    if (window.addMapMarkers) {
                                        console.log('✅ window.addMapMarkers 호출');
                                        window.addMapMarkers(jsonData.map_markers);
                                    } else if (window.addKContentMarkers) {
                                        console.log('✅ window.addKContentMarkers 호출');
                                        window.addKContentMarkers(jsonData.map_markers);
                                    } else {
                                        console.log('❌ 지도 함수가 등록되지 않음');
                                    }
                                } else {
                                    console.log('❌ 지도 마커 데이터 없음');
                                }

                            } else if (jsonData.type === 'error') {
                                throw new Error(jsonData.message);
                            }
                        } catch (e) {
                            console.error('JSON 파싱 오류:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            const errorMessage = {
                type: 'bot',
                content: error.message.includes('인증') ? 
                    'Please log in to continue using K-Drama location search! 🔐' : 
                    'Sorry, something went wrong. Please try again! 😅',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMessage]);
            setStreamingMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    // Enter 키 처리
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 태그 클릭 핸들러
    const handleTagClick = (tag) => {
        let query = '';
        switch(tag) {
            case 'kdrama':
                query = 'Recommend popular K-Drama filming locations';
                break;
            case 'romantic':
                query = 'Show me romantic drama filming spots';
                break;
            case 'historical':
                query = 'Where were historical dramas filmed?';
                break;
            case 'trending':
                query = 'What are the trending K-Drama locations right now?';
                break;
            default:
                query = tag;
        }
        handleSendMessage(query);
    };

    return (
        <div className="kpop-main-chat-area">
            {/* 상단 헤더 */}
            <div className="kpop-chat-header">
                <ArrowBack className="kpop-header-back-icon" />
                <span className="kpop-chat-title">K-Drama Spotlight</span>
                <span className="kpop-subtitle">Filming Location Guide</span>
                <div className="kpop-weather-info">
                    <WbSunny className="kpop-weather-icon" />
                    <span>Seoul weather</span>
                    <span className="kpop-temp">20.5℃</span>
                    <span className="kpop-date-range">2025-09-03 ~ 2025-09-07</span>
                    <span className="kpop-more-weather">See more weather</span>
                </div>
            </div>

            {/* 메시지 영역 */}
            <div className="kpop-message-area">
                {/* Welcome 화면 - 항상 표시 */}
                <div className="kdrama-welcome">
                    <div className="welcome-header">
                        <h1 className="welcome-title">
                            <span className="title-emoji">🎬</span>
                            Popular K-Drama Filming Locations
                            <span className="title-emoji">📺</span>
                        </h1>
                        <p className="welcome-subtitle">
                            Explore iconic scenes from your favorite dramas!
                        </p>
                    </div>

                    <div className="dramas-grid">
                        {popularDramas.map((drama) => (
                            <div
                                key={drama.id}
                                className="drama-card"
                                onClick={() => handleWelcomeCardClick(drama)}
                            >
                                <div
                                    className="drama-image"
                                    style={{
                                        backgroundImage: `url(${drama.thumbnail})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                ></div>
                                <div className="drama-overlay"></div>
                                
                                <div className="drama-content">
                                    <span className="drama-emoji">{drama.emoji}</span>
                                    <span className="drama-name">{drama.drama_name}</span>
                                    <span className="drama-name-en">{drama.drama_name_en}</span>
                                </div>

                                <div className="drama-hover">
                                    <p className="hover-text">{drama.description}</p>
                                    <span className="hover-cta">Explore Location 🎬</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 채팅 메시지들 */}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={msg.type === 'user' ? 'kpop-user-message' : 'kpop-chatbot-message'}
                    >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        <span className="kpop-timestamp">{msg.timestamp}</span>
                    </div>
                ))}
                
                {streamingMessage && (
                    <div className="kpop-chatbot-message">
                        <div style={{ whiteSpace: 'pre-wrap' }}>{streamingMessage}</div>
                        <span className="kpop-timestamp typing">Typing...</span>
                    </div>
                )}
                
                <div ref={messageEndRef} />
            </div>

            {/* 하단 제안 및 입력 영역 */}
            <div className="kpop-chat-footer">
                <div className="kpop-suggested-routes">
                    <span className="kpop-suggest-title">POPULAR TAGS</span>
                    <div className="kpop-tags">
                        <span className="kpop-tag kpop-tag-kpop" onClick={() => handleTagClick('kdrama')}>
                            #k-drama
                        </span>
                        <span className="kpop-tag kpop-tag-hotplace" onClick={() => handleTagClick('romantic')}>
                            #romantic
                        </span>
                        <span className="kpop-tag kpop-tag-activity" onClick={() => handleTagClick('historical')}>
                            #historical
                        </span>
                        <span className="kpop-tag kpop-tag-ocean" onClick={() => handleTagClick('trending')}>
                            #trending
                        </span>
                    </div>
                </div>
                <div className="kpop-input-bar">
                    <input
                        type="text"
                        placeholder="Ask about your favorite K-Drama filming location..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                    />
                    <Search 
                        className="kpop-search-icon" 
                        onClick={() => handleSendMessage()}
                        style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    />
                </div>
            </div>
        </div>
    );
}

export default Kpop_ChatbotPage;