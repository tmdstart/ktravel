// KFood_ChatbotPage.jsx - 레스토랑 전용 페이지 (6개 카드)
import React, { useState, useEffect, useRef } from 'react';
import '../styles/KFood_ChatbotPage.css';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';

function KFood_ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // 🍽️ 서울 대표 레스토랑 6개
    const famousRestaurants = [
        {
            id: 1,
            name: "명동교자",
            nameEn: "Myeongdong Kyoja",
            emoji: "🥟",
            image: "https://cdn.pixabay.com/photo/2017/09/16/19/21/dumplings-2754804_1280.jpg",
            tooltip: "Famous handmade dumplings and kalguksu (knife-cut noodles) since 1966",
            searchQuery: "Tell me about Myeongdong Kyoja restaurant"
        },
        {
            id: 2,
            name: "진주집",
            nameEn: "Jinju Jip",
            emoji: "🍜",
            image: "https://cdn.pixabay.com/photo/2020/04/20/16/18/noodles-5070062_1280.jpg",
            tooltip: "Best kongguksu (cold bean noodle soup) in Yeouido business district",
            searchQuery: "Jinju Jip Yeouido Branch kongguksu"
        },
        {
            id: 3,
            name: "광장시장",
            nameEn: "Gwangjang Market",
            emoji: "🥪",
            image: "https://cdn.pixabay.com/photo/2020/03/28/09/03/market-4976733_1280.jpg",
            tooltip: "Historic traditional market with authentic Korean street food",
            searchQuery: "Gwangjang Market traditional food"
        },
        {
            id: 4,
            name: "이태원 맛집",
            nameEn: "Itaewon Cuisine",
            emoji: "🌍",
            image: "https://cdn.pixabay.com/photo/2016/11/18/14/05/architecture-1834469_1280.jpg",
            tooltip: "International cuisine hub - Turkish, Mexican, Italian & more!",
            searchQuery: "Itaewon international restaurants"
        },
        {
            id: 5,
            name: "홍대 음식",
            nameEn: "Hongdae Food Scene",
            emoji: "🍕",
            image: "https://cdn.pixabay.com/photo/2017/08/25/15/10/hongdae-2680967_1280.jpg",
            tooltip: "Trendy fusion restaurants, creative cafes, and late-night eats",
            searchQuery: "Hongdae food scene trendy restaurants"
        },
        {
            id: 6,
            name: "강남 한우",
            nameEn: "Gangnam Korean Beef",
            emoji: "🥩",
            image: "https://cdn.pixabay.com/photo/2017/06/29/20/09/korean-bbq-2456232_1280.jpg",
            tooltip: "Premium Korean beef BBQ in upscale Gangnam district",
            searchQuery: "Gangnam Korean BBQ restaurants"
        }
    ];

    // 레스토랑 카드 클릭 핸들러
    const handleRestaurantClick = (restaurant) => {
        handleSendMessage(restaurant.searchQuery);
    };

    useEffect(() => {
        // 초기에는 메시지 없음 (Welcome 화면 표시)
        setMessages([]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 🌊 Streaming 메시지 전송 (통합 API)
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
            status: '🔍 Searching...',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, initialAiMessage]);

        try {
            const sessionId = localStorage.getItem('session_id');
            if (!sessionId) {
                throw new Error('Please log in first');
            }

            // 🔍 디버깅: 전역 지도 함수들 확인
            console.log('🔍 Global map functions:', {
                addMapMarkers: typeof window.addMapMarkers,
                addRestaurantMarkers: typeof window.addRestaurantMarkers,
                addFestivalMarkers: typeof window.addFestivalMarkers,
                addAttractionMarkers: typeof window.addAttractionMarkers
            });

            // 3. 🌊 Integrated Streaming 요청!
            const response = await fetch('http://localhost:8000/api/chat/restaurant/send/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionId}`
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Login expired. Please log in again.');
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
                                                status: `✅ ${data.title} found!`,
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
                                                results: data.results || [],
                                                restaurants: data.restaurants || [],
                                                festivals: data.festivals || [],
                                                attractions: data.attractions || [],
                                                hasRestaurants: data.has_restaurants,
                                                hasFestivals: data.has_festivals,
                                                hasAttractions: data.has_attractions
                                              }
                                            : msg
                                    ));
                                    setLoading(false);

                                    // 🗺️ 통합 마커 처리
                                    console.log('🍽️ Response complete:', {
                                        has_restaurants: data.has_restaurants,
                                        has_festivals: data.has_festivals,
                                        has_attractions: data.has_attractions,
                                        map_markers_count: data.map_markers?.length || 0,
                                        map_markers: data.map_markers
                                    });

                                    if (data.map_markers && data.map_markers.length > 0) {
                                        console.log('🗺️ Adding markers:', data.map_markers);
                                        
                                        // 1순위: 통합 지도 함수
                                        if (window.addMapMarkers) {
                                            console.log('✅ Using addMapMarkers');
                                            window.addMapMarkers(data.map_markers);
                                        }
                                        // 2순위: 타입별 함수
                                        else {
                                            console.log('✅ Using type-specific functions');
                                            if (data.has_restaurants && window.addRestaurantMarkers) {
                                                const restaurantMarkers = data.map_markers.filter(m => m.type === 'restaurant');
                                                window.addRestaurantMarkers(restaurantMarkers);
                                            }
                                            if (data.has_festivals && window.addFestivalMarkers) {
                                                const festivalMarkers = data.map_markers.filter(m => m.type === 'festival');
                                                window.addFestivalMarkers(festivalMarkers);
                                            }
                                            if (data.has_attractions && window.addAttractionMarkers) {
                                                const attractionMarkers = data.map_markers.filter(m => m.type === 'attraction');
                                                window.addAttractionMarkers(attractionMarkers);
                                            }
                                        }
                                    } else {
                                        console.log('❌ No map markers available');
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
                        text: error.message === 'Please log in first' || error.message === 'Login expired. Please log in again.' 
                            ? error.message 
                            : 'Sorry, something went wrong. Please try again.',
                        isStreaming: false,
                        isError: true,
                        status: null
                      }
                    : msg
            ));
            setLoading(false);

            if (error.message.includes('log in')) {
                localStorage.removeItem('session_id');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }
    };

    return (
        <div className="kfood-chatbot-container">
            <main className="kfood-main-chat-area">
                <header className="kfood-chat-header">
                    <span className="kfood-header-back-icon">←</span>
                    <span className="kfood-chat-title">SEOUL FOOD & CULTURE GUIDE</span>
                    <span className="kfood-subtitle">Discover Amazing Restaurants, Festivals & Attractions</span>
                </header>

                <section className="kfood-message-area">
                    {/* 🍽️ Welcome Screen (메시지 없을 때만 표시) */}
                    {messages.length === 0 && (
                        <div className="restaurant-welcome">
                            <div className="welcome-header">
                                <h2 className="welcome-title">
                                    <span className="title-emoji">🍽️</span>
                                    Explore Seoul's Best Restaurants!
                                    <span className="title-emoji">🥢</span>
                                </h2>
                                <p className="welcome-subtitle">
                                    Discover authentic Korean cuisine and hidden culinary gems! 🌟
                                </p>
                            </div>

                            <div className="restaurants-grid">
                                {famousRestaurants.map((restaurant) => (
                                    <div
                                        key={restaurant.id}
                                        className="restaurant-card"
                                        onClick={() => handleRestaurantClick(restaurant)}
                                        title={restaurant.tooltip}
                                    >
                                        {/* 이미지 배경 */}
                                        <div 
                                            className="restaurant-image"
                                            style={{ 
                                                backgroundImage: `url(${restaurant.image})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        />
                                        
                                        {/* 오버레이 */}
                                        <div className="restaurant-overlay" />

                                        {/* 컨텐츠 */}
                                        <div className="restaurant-content">
                                            <div className="restaurant-emoji">{restaurant.emoji}</div>
                                            <div className="restaurant-name">{restaurant.name}</div>
                                            <div className="restaurant-name-en">{restaurant.nameEn}</div>
                                        </div>

                                        {/* 호버 효과 */}
                                        <div className="restaurant-hover">
                                            <p className="hover-text">{restaurant.tooltip}</p>
                                            <span className="hover-cta">Click to explore! 🔍</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="welcome-footer">
                                <p>Or search for any restaurant, festival, or attraction in Seoul! 🔎</p>
                            </div>
                        </div>
                    )}

                    {/* 기존 메시지 표시 */}
                    {messages.map((message) => (
                        <ChatMessage 
                            key={message.id} 
                            message={message}
                        />
                    ))}
                    
                    {loading && (
                        <div className="kfood-chatbot-message">
                            <span className="typing-indicator">AI is typing...</span>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </section>

                <footer className="chat-footer">
                    <div className="suggested-routes">
                        <div className="tags">
                            <span 
                                className="tag tag-korean"
                                onClick={() => handleSendMessage('Korean traditional food')}
                            >
                                #korean-food
                            </span>
                            <span 
                                className="tag tag-bbq"
                                onClick={() => handleSendMessage('Korean BBQ recommendations')}
                            >
                                #korean-bbq
                            </span>
                            <span 
                                className="tag tag-festival"
                                onClick={() => handleSendMessage('Seoul festivals this month')}
                            >
                                #festivals
                            </span>
                            <span 
                                className="tag tag-attraction"
                                onClick={() => handleSendMessage('Must-visit Seoul attractions')}
                            >
                                #attractions
                            </span>
                        </div>
                    </div>
                    
                    <ChatInput 
                        onSend={handleSendMessage} 
                        disabled={loading}
                        placeholder="Ask me about restaurants, festivals, or attractions! 🍽️"
                    />
                </footer>
            </main>
        </div>
    );
}

export default KFood_ChatbotPage;