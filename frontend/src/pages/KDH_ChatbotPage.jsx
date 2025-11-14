import React, { useState, useEffect, useRef } from 'react';
import '../styles/KDH_ChatbotPage.css';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';

function KDH_ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // 🎭 Demon Hunters 전설의 장소들
    const legendaryLocations = [
        {
            id: 1,
            name: "남산타워",
            nameEn: "Namsan Tower",
            emoji: "🌙",
            image: "https://img.news-wa.com/img/upload/2025/03/07/NWC_20250307114252.jpg.webp",
            tooltip: "Our ultimate watchtower! 'Light in Darkness' MV final battle location",
            searchQuery: "Introduce N Seoul Tower at Night"
        },
        {
            id: 2,
            name: "북촌 한옥마을",
            nameEn: "Bukchon",
            emoji: "🔥",
            image: "https://english.visitseoul.net/comm/getImage?srvcId=MEDIA&parentSn=42685&fileTy=MEDIA&fileNo=2&thumbTy=L",
            tooltip: "Where Shadow and Lumi street performed before debut!",
            searchQuery: "Tell me about Bukchon"
        },
        {
            id: 3,
            name: "한강",
            nameEn: "Han River",
            emoji: "💫",
            image: "https://love.seoul.go.kr/tmda/Pds/Board/seoul_news_write/Editor/article_202212_07_01.jpg",
            tooltip: "'Moonlight Hunter' performance filming location!",
            searchQuery: "Introduce Hangang River Bus"
        },
        {
            id: 4,
            name: "강남",
            nameEn: "Gangnam",
            emoji: "⚔️",
            image: "https://visitgangnam.net/wp-content/uploads/2024/06/GLIGHT3-scaled-uai-1920x1080.jpg",
            tooltip: "'Neon Demons' choreography video location!",
            searchQuery: "Tell me about COEX"
        },
        {
            id: 5,
            name: "경복궁",
            nameEn: "Gyeongbokgung",
            emoji: "👑",
            image: "https://english.visitseoul.net/comm/getImage?srvcId=MEDIA&parentSn=65749&fileTy=MEDIA&fileNo=4&thumbTy=L%20|%20https://english.visitseoul.net/comm/getImage?srvcId=MEDIA&parentSn=65750&fileTy=MEDIA&fileNo=5&thumbTy=L%20|%20https://english.visitseoul.net/comm/getImage?srvcId=MEDIA&parentSn=65751&fileTy=MEDIA&fileNo=4&thumbTy=L%20|%20https://english.visitseoul.net/comm/getImage?srvcId=MEDIA&parentSn=67732&fileTy=MEDIA&fileNo=3&thumbTy=L%20|%20https://english.visitseoul.net/comm/getImage?srvcId=MEDIA&parentSn=67733&fileTy=MEDIA&fileNo=1&thumbTy=L",
            tooltip: "Ancient palace where light warriors protected the kingdom!",
            searchQuery: "Introduce Gyeongbokgung Palace"
        },
        {
            id: 6,
            name: "명동",
            nameEn: "Myeongdong",
            emoji: "✨",
            image: "https://kride.blog/wp-content/uploads/2025/09/1750615211_youloveit_com_kpop_demon_hunters_saja-boys.jpg?w=870",
            tooltip: "'Crystal Light' MV shopping district!",
            searchQuery: "Tell me about Myeongdong"
        }
    ];

    // 장소 카드 클릭 핸들러
    const handleLocationClick = (location) => {
        handleSendMessage(location.searchQuery);
    };

    useEffect(() => {
        // 초기에는 메시지 없음 (Welcome 화면 표시)
        setMessages([]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 🌊 Streaming 메시지 전송
    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // 1. 사용자 메시지 추가
        const userMessage = {
            id: Date.now(),
            text: text,
            isUser: true,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        // 2. 빈 AI 메시지 생성 (Streaming용)
        const aiMessageId = Date.now() + 1;
        const initialAiMessage = {
            id: aiMessageId,
            text: '',
            isUser: false,
            isStreaming: true,
            status: '🔍 검색 중...',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, initialAiMessage]);

        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                throw new Error('로그인이 필요합니다');
            }

            // 3. 🌊 Streaming 요청!
            const response = await fetch('http://localhost:8000/api/chat/send/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionId}`
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
                }
                throw new Error('Failed to send message');
            }

            // 4. 🌊 Stream 읽기
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            switch (data.type) {
                                case 'searching':
                                case 'random':
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === aiMessageId 
                                            ? { ...msg, status: data.message }
                                            : msg
                                    ));
                                    break;

                                case 'found':
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === aiMessageId 
                                            ? { 
                                                ...msg, 
                                                status: `✅ ${data.title} 찾음!`,
                                                results: [data.result]
                                              }
                                            : msg
                                    ));
                                    break;

                                case 'generating':
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === aiMessageId 
                                            ? { ...msg, status: data.message }
                                            : msg
                                    ));
                                    break;

                                case 'chunk':
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === aiMessageId 
                                            ? { 
                                                ...msg, 
                                                text: msg.text + data.content,
                                                status: null
                                              }
                                            : msg
                                    ));
                                    break;

                                case 'done':
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === aiMessageId 
                                            ? { 
                                                ...msg,
                                                text: data.full_response,
                                                isStreaming: false,
                                                extractedDestinations: data.extracted_destinations || [],
                                                results: data.results || (data.result ? [data.result] : []),
                                                festivals: data.festivals || [],
                                                attractions: data.attractions || [],
                                                hasFestivals: data.has_festivals,
                                                hasAttractions: data.has_attractions
                                              }
                                            : msg
                                    ));
                                    setLoading(false);

                                    if (data.map_markers && data.map_markers.length > 0) {
                                        if (window.addMapMarkers) {
                                            window.addMapMarkers(data.map_markers);
                                        } else {
                                            if (data.has_festivals && window.addFestivalMarkers) {
                                                const festivalMarkers = data.map_markers.filter(m => m.type === 'festival');
                                                window.addFestivalMarkers(festivalMarkers);
                                            }
                                            if (data.has_attractions && window.addAttractionMarkers) {
                                                const attractionMarkers = data.map_markers.filter(m => m.type === 'attraction');
                                                window.addAttractionMarkers(attractionMarkers);
                                            }
                                        }
                                    }
                                    break;

                                case 'error':
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === aiMessageId 
                                            ? { 
                                                ...msg,
                                                text: data.message,
                                                isStreaming: false,
                                                isError: true,
                                                status: null
                                              }
                                            : msg
                                    ));
                                    setLoading(false);
                                    break;
                            }
                        } catch (e) {
                            console.error('JSON parse error:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            
            setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                    ? { 
                        ...msg,
                        text: error.message === '로그인이 필요합니다' || error.message === '로그인이 만료되었습니다. 다시 로그인해주세요.' 
                            ? error.message 
                            : 'Sorry, something went wrong. Please try again.',
                        isStreaming: false,
                        isError: true,
                        status: null
                      }
                    : msg
            ));
            setLoading(false);

            if (error.message.includes('로그인')) {
                localStorage.removeItem('session_id');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }
    };

    return (
        <div className="kdh-chatbot-container">
            <main className="kdh-main-chat-area">
                <header className="kdh-chat-header">
                    <span className="kdh-header-back-icon">←</span>
                    <span className="kdh-chat-title">K-POP DEMON HUNTERS</span>
                    <span className="kdh-subtitle">Trip Planning Assistant</span>
                </header>

                <section className="kdh-message-area">
                    {/* 🎭 Welcome Screen (메시지 없을 때만 표시) */}
                    
                        <div className="demon-hunters-welcome">
                            <div className="welcome-header">
                                <h2 className="welcome-title">
                                    <span className="title-emoji">🌙</span>
                                    Explore Seoul with Demon Hunters!
                                    <span className="title-emoji">⚔️</span>
                                </h2>
                                <p className="welcome-subtitle">
                                    Click on any legendary location to discover Lumi's story! 💫
                                </p>
                            </div>

                            <div className="locations-grid">
                                {legendaryLocations.map((location) => (
                                    <div
                                        key={location.id}
                                        className="location-card"
                                        onClick={() => handleLocationClick(location)}
                                        title={location.tooltip}
                                    >
                                        {/* 이미지 배경 */}
                                        <div 
                                            className="location-image"
                                            style={{ 
                                                backgroundImage: `url(${location.image})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        />
                                        
                                        {/* 오버레이 */}
                                        <div className="location-overlay" />

                                        {/* 컨텐츠 */}
                                        <div className="location-content">
                                            <div className="location-emoji">{location.emoji}</div>
                                            <div className="location-name">{location.name}</div>
                                            <div className="location-name-en">{location.nameEn}</div>
                                        </div>

                                        {/* 호버 효과 */}
                                        <div className="location-hover">
                                            <p className="hover-text">{location.tooltip}</p>
                                            <span className="hover-cta">Click to explore! 🔍</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="welcome-footer">
                                <p>Or type your own location below! 🎤</p>
                            </div>
                        </div>
                

                    {/* 기존 메시지 표시 */}
                    {messages.map((message) => (
                        <ChatMessage 
                            key={message.id} 
                            message={message}
                        />
                    ))}
                    
                    {loading && (
                        <div className="kdh-chatbot-message">
                            <span className="typing-indicator">AI is typing...</span>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </section>

                <footer className="chat-footer">
                    <div className="suggested-routes">
                        <div className="tags">
                            <span 
                                className="tag tag-kpop"
                                onClick={() => handleSendMessage('I want to visit K-pop related places')}
                            >
                                #k-pop
                            </span>
                            <span 
                                className="tag tag-hotplace"
                                onClick={() => handleSendMessage('Show me hot places in Seoul')}
                            >
                                #hot place
                            </span>
                            <span 
                                className="tag tag-activity"
                                onClick={() => handleSendMessage('What activities can I do in Korea?')}
                            >
                                #activity
                            </span>
                            <span 
                                className="tag tag-ocean"
                                onClick={() => handleSendMessage('Recommend ocean destinations')}
                            >
                                #ocean
                            </span>
                        </div>
                    </div>
                    
                    <ChatInput 
                        onSend={handleSendMessage} 
                        disabled={loading}
                    />
                </footer>
            </main>
        </div>
    );
}

export default KDH_ChatbotPage;

