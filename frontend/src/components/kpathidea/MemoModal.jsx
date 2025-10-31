// src/components/kpathidea/MemoModal.jsx (새 파일 또는 KPathIdeaPage.jsx에 정의)

import React, { useState } from 'react';

const MemoModal = ({ markerId, initialTitle, initialMemo, onSave, onClose }) => {
    const [title, setTitle] = useState(initialTitle);
    const [memo, setMemo] = useState(initialMemo);

    const handleSave = () => {
        onSave(title, memo);
    };

    return (
        <div className="modal-overlay">
            <div className="kpath-memo-modal">
                <h3 className="kpath-modal-title">마커 정보 입력/수정</h3>
                <label>타이틀 (마커 아래 표시)</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="장소 이름을 입력하세요."
                />
                <label>추가 메모 (인포윈도우)</label>
                <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="추가적인 상세 메모를 입력하세요."
                    rows="4"
                />
                <div className="modal-actions">
                    <button onClick={onClose} className="btn-cancel">취소</button>
                    <button onClick={handleSave} className="btn-save">저장</button>
                </div>
            </div>
        </div>
    );
};

export default MemoModal; // 만약 별도 파일이라면 export 필요