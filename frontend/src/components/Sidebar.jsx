import React from 'react';
import './Sidebar.css';
import { Link } from 'react-router-dom';
import { FaStar, FaMusic, FaThLarge, FaCompass, FaCalendar, FaBookmark   } from 'react-icons/fa';


const Sidebar = () => {
    return (
        <div className="sidebar">
            {/* 상단 헤더 */}
            <div className="sidebar-header">
                {/* 햄버거 메뉴 아이콘 */}
                <div className="menu-icon">
                    <span className="hamburger-line"></span>
                    <span className="hamburger-line"></span>
                    <span className="hamburger-line"></span>
                </div>
                {/* 제목 */}
                <h1>K-Guidance Menu</h1>
            </div>

            {/* 새 채팅 버튼 */}
            <Link to="/" className="new-chat-btn-link">
                <button className="new-chat-btn">
                    <span className="chat-icon">💬</span>
                    New Chat
                </button>
            </Link>

            {/* SERVICES 섹션 */}
            <div className="sidebar-section">
                <p className="section-title">SERVICES</p>
                <ul className="menu-list">
                    <li>
                        <Link to="/k-spotlight">
                            <FaStar />
                            <span>K-Spotlight</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/festivals">
                            <FaMusic />
                            <span>K-Concert</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/dashboard">
                            <FaThLarge />
                            <span>My Dashboard</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/k-pathidea">
                            <FaCompass />
                            <span>K-PathIdea</span>
                        </Link>
                    </li>

                </ul>
            </div>

            {/* RECENT CHATS 섹션 */}
            <div className="sidebar-section">
                <p className="section-title">RECENT CHATS</p>
                <ul className="recent-chats-list">
                    <li>K-food tour planning</li>
                    <li>Seoul culinary journey</li>
                </ul>
            </div>
        </div>
    );
};

export default Sidebar;