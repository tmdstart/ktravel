import React, { useState, useEffect, useRef } from 'react';
import '../styles/Kpop_ChatbotPage.css';
import {
    ArrowBack,
    WbSunny,
    Search,
} from '@mui/icons-material';

// 1. ResultCard 컴포넌트를 Kpop_ChatbotPage 함수 밖으로 이동하여 명확하게 정의합니다.
// (함수 내부에 있어도 되지만, 일반적으로 컴포넌트 파일 상단에 정의하는 것이 좋습니다.)
const ResultCard = ({ data }) => {
    // data 객체에서 필요한 속성들을 추출합니다.
    const location_name = data.location_name || 'N/A';
    const drama_name_en = data.drama_name_en || 'N/A';
    const drama_name = data.drama_name || 'N/A';
    const address = data.address || 'N/A';
    const image_url = data.image_url || ''; // 이미지가 없을 경우 빈 문자열
    
    // tip 변수는 HTML 또는 Markdown이 섞여있을 수 있으므로 별도 처리
    const tip = data.tip || 'No scene info available.'; 

    // 고객님이 원하시는 전체 내용이 출력되는 JSX를 반환합니다.
    return (
        <div className="result-card-simple">
            💙 **Location:** {location_name}<br />
            🎬 **Drama:** {drama_name_en} ({drama_name})<br />
            📍 **Address:** {address}<br />
            🖼 **Scene Image:**<br />
            {image_url && <img src={image_url} alt={drama_name} width="300" />}
            <br />
            ✨ **Scene Info:**<br />
            
            {/* 💡 문제 해결: tip의 내용 전체를 HTML로 렌더링하여 줄 바꿈과 포맷을 유지 */}
            <div dangerouslySetInnerHTML={{ __html: tip }} /> 
        </div>
    );
};


function Kpop_ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messageEndRef = useRef(null);
    const [streamingMessage, setStreamingMessage] = useState('');

    const popularDramas = [
        // ... (popularDramas 배열 내용은 변경 없음)
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

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingMessage]);

    const handleWelcomeCardClick = (drama) => {
        const query = `Tell me about ${drama.drama_name} filming location`;
        handleSendMessage(query);
    };

    const handleSendMessage = async (customMessage = null) => {
        const messageToSend = customMessage || inputMessage.trim();
        if (!messageToSend || isLoading) return;

        setInputMessage('');
        setIsLoading(true);

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
            
            const apiUrl = 'http://localhost:8000/api/chat/kcontents/send/stream';
            
            console.log('📤 Sending request:', {
                url: apiUrl,
                method: 'POST',
                message: messageToSend,
                hasToken: !!token
            });
            
            const response = await fetch(apiUrl, {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: messageToSend })
            });

            console.log('📥 Response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
                }
                if (response.status === 405) {
                    throw new Error('API 메서드 오류: POST 요청이 필요합니다.');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            
            let finalBotMessage = {
                type: 'bot',
                content: '',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                results: [],
                map_markers: []
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = JSON.parse(line.slice(6));
                            console.log('📦 Stream data:', jsonData.type);

                            if (jsonData.type === 'chunk') {
                                accumulatedText += jsonData.content;
                                setStreamingMessage(accumulatedText);
                            } else if (jsonData.type === 'done') {
                                console.log('✅ Stream complete:', jsonData);
                                
                                finalBotMessage = {
                                    ...finalBotMessage,
                                    content: accumulatedText,
                                    results: jsonData.results || [],
                                    map_markers: jsonData.map_markers || [],
                                };

                                if (finalBotMessage.map_markers && finalBotMessage.map_markers.length > 0) {
                                    if (window.addMapMarkers) {
                                        window.addMapMarkers(finalBotMessage.map_markers);
                                    } else {
                                        console.log('⚠️ Map function not registered');
                                    }
                                }
                                
                                setMessages(prev => [...prev, finalBotMessage]);
                                setStreamingMessage('');
                                return;

                            } else if (jsonData.type === 'error') {
                                throw new Error(jsonData.message);
                            }
                        } catch (e) {
                            console.error('JSON parsing error:', e, 'Line:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Message send error:', error);
            const errorMessage = {
                type: 'bot',
                content: error.message.includes('인증') ? 
                    'Please log in to continue using the service! 🔐' : 
                    `Sorry, something went wrong. ${error.message} Please try again! 😅`,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMessage]);
            setStreamingMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

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
            case 'kpop-idol':
                query = 'Recommend K-Pop idol spots or agency buildings';
                break;
            case 'best-food':
                query = 'Recommend the best restaurants near Gangnam station';
                break;
            default:
                query = tag;
        }
        handleSendMessage(query);
    };

    // 2. renderMessageContent 함수를 수정하여 results가 있을 경우 ResultCard를 렌더링합니다.
    // 2. renderMessageContent 함수를 수정하여 results가 있을 경우 ResultCard를 렌더링합니다.
    const renderMessageContent = (msg) => {
        // 챗봇 메시지이고, results 배열이 있으며, 최소한 하나의 결과가 있을 때
        if (msg.type === 'bot' && msg.results && msg.results.length > 0) {
            
            // 💡 여기서 results 배열의 첫 번째 항목만 가져옵니다. (카드 한 장만 출력)
            const firstResult = msg.results[0]; 

            return (
                <>
                    {/* 일반 챗봇 응답 텍스트 */}
                    <div
                        className="kpop-chatbot-html"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                    />
                    
                    {/* ResultCard: 첫 번째 결과만 렌더링합니다. */}
                    <div className="kpop-results-container">
                        <ResultCard data={firstResult} />
                    </div>
                </>
            );
        }

        // 일반 텍스트 메시지 (사용자 메시지 또는 결과가 없는 챗봇 메시지)
        return (
            <div
                className="kpop-chatbot-html"
                dangerouslySetInnerHTML={{ __html: msg.content }}
            />
        );
    };

    // 3. 기존의 ResultCard 정의 부분을 제거합니다. (상단으로 이동)
    /* const ResultCard = ({ data }) => {
        ... (제거됨)
    };
    */

    return (
        <div className="kpop-main-chat-area">
            {/* ... (Header 부분 변경 없음) */}
            <div className="kpop-chat-header">
                <ArrowBack className="kpop-header-back-icon" />
                <span className="kpop-chat-title">K-Pop Integrated Guide</span>
                <span className="kpop-subtitle">Seoul Tour & Location Search</span>
                <div className="kpop-weather-info">
                    <WbSunny className="kpop-weather-icon" />
                    <span>Seoul weather</span>
                    <span className="kpop-temp">20.5℃</span>
                    <span className="kpop-date-range">2025-09-03 ~ 2025-09-07</span>
                    <span className="kpop-more-weather">See more weather</span>
                </div>
            </div>

            <div className="kpop-message-area">
                <div className="kdrama-welcome">
                    {/* ... (Welcome Card 부분 변경 없음) */}
                    <div className="welcome-header">
                        <h1 className="welcome-title">
                            <span className="title-emoji">🎤</span>
                            K-Pop & K-Drama Tour Spots
                            <span className="title-emoji">✨</span>
                        </h1>
                        <p className="welcome-subtitle">
                            Explore iconic scenes and idol-approved locations!
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

                {/* messages.map: 수정된 renderMessageContent를 사용 */}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={msg.type === 'user' ? 'kpop-user-message' : 'kpop-chatbot-message'}
                    >
                        {/* renderMessageContent가 ResultCard를 포함할 수 있도록 수정됨 */}
                        {renderMessageContent(msg)}
                        <span className="kpop-timestamp">{msg.timestamp}</span>
                    </div>
                ))}
                
                {streamingMessage && (
                    <div className="kpop-chatbot-message">
                        <div
                            dangerouslySetInnerHTML={{ __html: streamingMessage }}
                        />
                        <span className="kpop-timestamp typing">Typing...</span>
                    </div>
                )}
                <div ref={messageEndRef} />
            </div>

            {/* ... (Footer 부분 변경 없음) */}
            <div className="kpop-chat-footer">
                <div className="kpop-suggested-routes">
                    <span className="kpop-suggest-title">K-POP TAGS</span>
                    <div className="kpop-tags">
                        <span className="kpop-tag kpop-tag-kpop" onClick={() => handleTagClick('kpop-idol')}>
                            #k-pop-idol
                        </span>
                        <span className="kpop-tag kpop-tag-hotplace" onClick={() => handleTagClick('best-food')}>
                            #best-food
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
                        placeholder="Ask about your favorite K-Pop spot, restaurant, or drama..."
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