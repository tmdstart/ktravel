import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import chatService from '../../services/chatService';
import './Chat.css';

function ChatContainer({ onDestinationsUpdate }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 메시지 목록 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🌊 Streaming 메시지 전송
  const handleSendMessageStreaming = async (messageText) => {
    // 1. 사용자 메시지 추가
    const userMessage = {
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    // 2. 봇 메시지 초기화 (빈 상태) - 🍽️ restaurants 추가!
    const botMessageId = Date.now();
    const initialBotMessage = {
      id: botMessageId,
      text: '',
      isUser: false,
      isStreaming: true,
      status: '🔍 검색 중...',
      timestamp: new Date(),
      results: null,
      festivals: null,
      attractions: null,
      restaurants: null // 🍽️ 레스토랑 추가
    };
    setMessages((prev) => [...prev, initialBotMessage]);

    // 3. 🌊 Streaming 시작!
    try {
      await chatService.sendMessageStreaming(messageText, {
        // 검색 중
        onSearching: (statusMessage) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, status: statusMessage }
              : msg
          ));
        },

        // 결과 찾음
        onFound: (title, result) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { 
                  ...msg, 
                  status: `✅ ${title} 찾음!`,
                  results: [result]
                }
              : msg
          ));
        },

        // 응답 생성 중
        onGenerating: (statusMessage) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, status: statusMessage }
              : msg
          ));
        },

        // 🌊 실시간 텍스트 청크!
        onChunk: (chunk) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { 
                  ...msg, 
                  text: msg.text + chunk,
                  status: null // 상태 메시지 제거
                }
              : msg
          ));
        },

        // ✅ 완료! - 🍽️ restaurants 추가!
        onComplete: (data) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { 
                  ...msg,
                  text: data.full_response,
                  isStreaming: false,
                  results: data.results || (data.result ? [data.result] : null),
                  festivals: data.festivals,
                  attractions: data.attractions,
                  restaurants: data.restaurants, // 🍽️ 레스토랑 추가
                  hasRestaurants: data.has_restaurants, // 🍽️ 레스토랑 존재 여부
                  conversId: data.convers_id
                }
              : msg
          ));
          setLoading(false);

          // 여행지가 추출되었으면 부모에게 알림
          if (data.extracted_destinations && data.extracted_destinations.length > 0) {
            onDestinationsUpdate && onDestinationsUpdate();
          }
        },

        // ❌ 에러
        onError: (error) => {
          setMessages(prev => prev.map(msg => 
            msg.id === botMessageId 
              ? { 
                  ...msg,
                  text: `에러: ${error}`,
                  isStreaming: false,
                  isError: true,
                  status: null
                }
              : msg
          ));
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { 
              ...msg,
              text: '죄송합니다. 메시지 전송 중 오류가 발생했습니다.',
              isStreaming: false,
              isError: true,
              status: null
            }
          : msg
      ));
      setLoading(false);
    }
  };

  // 일반 메시지 전송 (기존 방식 - 백업용) - 🍽️ restaurants 추가!
  const handleSendMessage = async (messageText) => {
    // 사용자 메시지 추가
    const userMessage = {
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // API 호출
      const response = await chatService.sendMessage(messageText);

      // GPT 응답 추가 - 🍽️ restaurants 추가!
      const gptMessage = {
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        results: response.results,
        festivals: response.festivals,
        attractions: response.attractions,
        restaurants: response.restaurants, // 🍽️ 레스토랑 추가
        hasRestaurants: response.has_restaurants // 🍽️ 레스토랑 존재 여부
      };
      setMessages((prev) => [...prev, gptMessage]);

      // 여행지가 추출되었으면 부모에게 알림
      if (response.extracted_destinations && response.extracted_destinations.length > 0) {
        onDestinationsUpdate && onDestinationsUpdate();
      }

    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMessage = {
        text: '죄송합니다. 메시지 전송 중 오류가 발생했습니다.',
        isUser: false,
        isError: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>👋 안녕하세요! 여행 계획을 도와드릴게요.</p>
            <p>가고 싶은 여행지를 말씀해주세요!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              message={msg}
            />
          ))
        )}
        {loading && (
          <div className="chat-loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 🌊 Streaming 방식 사용 */}
      <ChatInput onSend={handleSendMessageStreaming} disabled={loading} />
    </div>
  );
}

export default ChatContainer;