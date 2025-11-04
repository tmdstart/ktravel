// src/components/kpathidea/MemoModal.jsx (새 파일 또는 KPathIdeaPage.jsx에 정의)
import './MemoModal.css'
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
                <h3 className="kpath-modal-title">Enter/modify marker information</h3>
                <label>Title</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="장소 이름을 입력하세요."
                />
                <label>Additional Notes 📄</label>
                <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="추가적인 상세 메모를 입력하세요."
                    rows="4"
                />
                <div className="modal-actions">
                    <button onClick={onClose} className="btn-cancel">Cancel</button>
                    <button onClick={handleSave} className="btn-save">Save</button>
                </div>
            </div>
        </div>
    );
};

export default MemoModal; // 만약 별도 파일이라면 export 필요