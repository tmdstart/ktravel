import React, { useState }  from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.js';
import SignupPage from './pages/SignupPage.js';
import DashboardPage from './pages/DashboardPage.js';
import Concept_MainPage from './pages/Concept_MainPage.jsx';
import KpopFestival_MapLayout from './pages/KpopFestival_MapLayout.jsx';
import KDH_ChatbotMapLayout from './pages/KDH_ChatbotMapLayout.jsx';
import Kpop_ChatbotMapLayout from './pages/Kpop_ChatbotMapLayout.jsx';
import KFood_ChatbotMapLayout from './pages/KFood_ChatbotMapLayout.jsx';
import ConcertPage from './pages/ConcertPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import KPathIntegrationPage from './pages/KPathIntegrationPage.jsx';
import KPathIdeaPage from './pages/KPathIdeaPage.jsx';
import ScheduleTable from './pages/ScheduleTable.jsx';
console.log('CLIENT_ID:', process.env.REACT_APP_NAVER_MAPS_CLIENT_ID);


function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleMouseEnter = () => {
        setIsSidebarOpen(true);
    };

    const handleMouseLeave = () => {
        setIsSidebarOpen(false);
    };

    return (
        <Router>
            {/* 최상위 레이아웃 컨테이너: flex 부모 */}
            <div className="app-layout-container">
                
                {/* 1. 사이드바 래퍼: DOM을 안정적으로 유지 */}
                <div 
                    className={`sidebar-wrapper ${isSidebarOpen ? 'open' : 'closed'}`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <Sidebar isOpen={isSidebarOpen} />
                </div>

                {/* 2. 메인 콘텐츠 영역: Routes를 포함하여 전체 페이지 렌더링을 처리 */}
                <main className="main-content">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/chatbot/kpop-star" element={<Kpop_ChatbotMapLayout />} />
                        <Route path="/chatbot/k-food" element={<KFood_ChatbotMapLayout />} />
                        <Route path="/" element={<Concept_MainPage />} />
                        <Route path="/festival" element={<KpopFestival_MapLayout />} />
                        <Route path="/chatbot/demon-hunters" element={<KDH_ChatbotMapLayout />} />
                        <Route path="/festivals" element={<ConcertPage />} />
                        <Route path="/k-pathidea" element={<KPathIntegrationPage />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;