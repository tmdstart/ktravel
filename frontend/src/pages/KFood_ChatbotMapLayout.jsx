// KFood_ChatbotMapLayout.jsx - 레스토랑 + 지도 레이아웃
import React from 'react';
import KFood_ChatbotPage from './KFood_ChatbotPage';  // ← 실제 파일명으로 변경
import NaverMap from './NaverMap'; 

function KFood_ChatbotMapLayout() {
    return (
        <div style={styles.layoutContainer}>
            {/* 1. 레스토랑 채팅 영역 (왼쪽) */}
            <div style={styles.chatArea}>
                <KFood_ChatbotPage />
            </div>

            {/* 2. 지도 영역 (오른쪽) */}
            <div style={styles.mapArea}>
                <NaverMap />
            </div>
        </div>
    );
}

const styles = {
    layoutContainer: {
        display: 'flex',
        height: '100vh',
        width: '100vw'
    },
    chatArea: {
        flexBasis: '50%',
        minWidth: '400px',
        overflow: 'hidden',
        position: 'relative',
        height: '100%'
    },
    mapArea: {
        flexBasis: '50%',
        position: 'relative',
        height: '100%'
    }
};

export default KFood_ChatbotMapLayout;