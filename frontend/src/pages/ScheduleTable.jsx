import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react'; 
import '../styles/ScheduleTable.css';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const globalFetchWithAuth = async (url, options = {}, token, setToken, setAuthError) => {
    setAuthError(null);
    if (!token) {
        const error = new Error("세션이 없습니다. 로그인해주세요");
        setAuthError(error.message);
        throw error;
    }
    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            const error = new Error('로그인이 만료되었습니다. 다시 로그인해주세요.');
            setAuthError(error.message);
            localStorage.removeItem('session_id');
            setToken(null);
            setTimeout(() => { window.location.href = '/'; }, 2000);
            throw error;
        }
        if (!response.ok) {
            const errorDetail = await response.json().catch(() => ({}));
            const errorMessage = errorDetail.detail || `API 요청 실패: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }
        return response;
    } catch (error) {
        console.error("❌ fetch 실패:", error);
        throw error;
    }
};

const createNewRow = () => ({
    id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    label: '',
    destination_id: null
});

const ScheduleTable = ({ scheduleId, onDayTitleChange }) => {
    const [token, setToken] = useState(localStorage.getItem('session_id'));
    const [dayTitles, setDayTitles] = useState([]);
    const [selectedDayTitle, setSelectedDayTitle] = useState('');
    const [description, setDescription] = useState('');
    const [authError, setAuthError] = useState(null);
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    const [isSavingTable, setIsSavingTable] = useState(false);
    const [isDeletionModeActive, setIsDeletionModeActive] = useState(false);

    const initialDays = ['Time','Location', 'Estimated Cost', 'Memo', 'Notice'];
    const initialRows = [createNewRow(), createNewRow(), createNewRow()];
    
    const [scheduleRows, setScheduleRows] = useState(initialRows);
    const [scheduleDays, setScheduleDays] = useState(initialDays);
    const [cellData, setCellData] = useState({});

    const fetchWithAuth = useCallback((url, options = {}) =>
        globalFetchWithAuth(url, options, token, setToken, setAuthError),
    [token]);

    // 🆕 테이블 전체 데이터 로드 (컬럼 순서 + 행 데이터)
    const fetchTableData = useCallback(async () => {
        if (!selectedDayTitle || !token) return;
        setIsLoadingTable(true);

        try {
            const response = await fetchWithAuth(
                `http://localhost:8000/api/destinations/schedule-table-data?day_title=${encodeURIComponent(selectedDayTitle)}`
            );
            const data = await response.json();
            
            console.log("📥 테이블 데이터:", data);

            // 1. 컬럼 순서 설정
            if (data.column_order && data.column_order.length > 0) {
                setScheduleDays(data.column_order);
            }

            // 2. 행 데이터 설정
            if (data.rows && data.rows.length > 0) {
                const newRows = [];
                const newCellData = {};

                data.rows.forEach((rowData, index) => {
                    const row = {
                        id: `row-${Date.now()}-${index}`,
                        destination_id: rowData.destination_id
                    };
                    newRows.push(row);

                    // 각 컬럼의 셀 데이터 설정
                    data.column_order.forEach(columnName => {
                        const key = `${row.id}-${columnName}`;
                        newCellData[key] = rowData[columnName] || '';
                    });
                });

                setScheduleRows(newRows);
                setCellData(newCellData);
            } else {
                // 데이터가 없으면 빈 행 3개
                setScheduleRows([createNewRow(), createNewRow(), createNewRow()]);
                setCellData({});
            }

        } catch (error) {
            console.error("❌ 테이블 데이터 조회 실패:", error.message);
        } finally {
            setIsLoadingTable(false);
        }
    }, [selectedDayTitle, token, fetchWithAuth]);

    // Day Title 변경 시 테이블 데이터 로드
    useEffect(() => {
        fetchTableData();
    }, [fetchTableData]);

    useEffect(() => {
        if (!token) return;
        fetchWithAuth('http://localhost:8000/api/schedules/day_titles')
            .then(res => res.json())
            .then(data => {
                setDayTitles(data.map(d => d.day_title));
                if (data.length > 0 && !selectedDayTitle) {
                    setSelectedDayTitle(data[0].day_title);
                    if (onDayTitleChange) onDayTitleChange(data[0].day_title);
                }
            })
            .catch(err => console.error("❌ day_titles fetch 실패:", err.message));
    }, [token, fetchWithAuth, selectedDayTitle, onDayTitleChange]);

    useEffect(() => {
        if (!scheduleId || !token) return;

        fetchWithAuth(`http://localhost:8000/api/schedules/${scheduleId}`)
            .then(res => res.json())
            .then(data => {
                const dayTitle = data.day_title || '';
                setSelectedDayTitle(dayTitle);
                if (onDayTitleChange) onDayTitleChange(dayTitle);
                setDescription(data.description || '');
            })
            .catch(err => console.error("❌ Schedule fetch 실패:", err.message));
    }, [scheduleId, token, fetchWithAuth, onDayTitleChange]);

    useEffect(() => {
        if (!selectedDayTitle || !token) return;
        fetchWithAuth(
            `http://localhost:8000/api/schedules/description?day_title=${encodeURIComponent(selectedDayTitle)}`
        )
            .then(res => res.json())
            .then(data => {
                setDescription(data.description || '');
            })
            .catch(err => console.error("❌ description fetch 실패:", err.message));
    }, [selectedDayTitle, token, fetchWithAuth]);


    const handleSave = () => {
        if (!selectedDayTitle || !token) return;

        fetchWithAuth(
            `http://localhost:8000/api/schedules/update_description?day_title=${encodeURIComponent(selectedDayTitle)}&description=${encodeURIComponent(description)}`,
            { method: "PUT" }
        )
            .then(res => res.json())
            .then((data) => {
                console.log("✅ 저장 성공:", data);

                alert('Description is Saved! ✅');
            })
            .catch(err => {
                console.error("❌ 저장 실패", err.message);
                alert(`Save fail: ${err.message}`);
            });
    };

    // 🆕 테이블 전체 저장 (컬럼 순서 + 행 데이터)
    const handleSaveTableData = async () => {
        if (!selectedDayTitle || !token) {
            alert('Select schedule.');
            return;
        }

        setIsSavingTable(true);

        try {
            // 행 데이터 구성
            const rows = scheduleRows.map((row, index) => {
                const rowData = {
                    destination_id: row.destination_id,
                    visit_order: index + 1
                };

                // 모든 컬럼의 값 추가
                scheduleDays.forEach(columnName => {
                    rowData[columnName] = getCellValue(row.id, columnName) || '';
                });

                return rowData;
            }).filter(row => row.Location && row.Location.trim()); // Location 있는 행만

            console.log('📤 저장할 데이터:', {
                day_title: selectedDayTitle,
                column_order: scheduleDays,
                rows: rows
            });

            const response = await fetchWithAuth(
                'http://localhost:8000/api/destinations/update-schedule-data',
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        day_title: selectedDayTitle,
                        column_order: scheduleDays,
                        rows: rows
                    })
                }
            );

            const result = await response.json();
            console.log('✅ 저장 성공:', result);
            alert(`Table saved!\n${result.message}`);

            // 저장 후 데이터 새로고침
            await fetchTableData();

        } catch (error) {
            console.error('❌ 테이블 저장 실패:', error.message);
            alert(`저장 실패: ${error.message}`);
        } finally {
            setIsSavingTable(false);
        }
    };


    const handleDayTitleChange = (e) => {
        setSelectedDayTitle(e.target.value);
        if (onDayTitleChange) onDayTitleChange(e.target.value);
    };

    const getCellValue = (rowId, day) => {
        return cellData[`${rowId}-${day}`] || '';
    };

    const handleCellChange = (rowId, day, value) => {
        setCellData(prev => ({
            ...prev,
            [`${rowId}-${day}`]: value
        }));
    };

    const handleAddRow = () => {
        setScheduleRows(prev => [...prev, createNewRow()]);
    };

    const toggleDeletionMode = () =>
        setIsDeletionModeActive(prev => !prev);

    const handleRemoveRow = useCallback((rowId) => { 
        if (!isDeletionModeActive) return;
        if (window.confirm("Are you sure you want to delete this?")) {
            setScheduleRows(prev => prev.filter(row => row.id !== rowId));
            setCellData(prev => {
                const newData = {...prev};
                scheduleDays.forEach(day => delete newData[`${rowId}-${day}`]);
                return newData;
            });
        }
    }, [isDeletionModeActive, scheduleDays]);

    const handleRemoveColumn = (column) => {
        if (!isDeletionModeActive) return;
        if (window.confirm(`"${column}" 컬럼을 삭제하시겠습니까?`)) {
            setScheduleDays(prev => prev.filter(day => day !== column));
            setCellData(prev => {
                const newData = {...prev};
                scheduleRows.forEach(row => delete newData[`${row.id}-${column}`]);
                return newData;
            });
        }
    };

    const handleAddColumn = () => {
        const newColumn = prompt("추가할 컬럼 이름을 입력하세요:");
        if (newColumn && !scheduleDays.includes(newColumn)) {
            setScheduleDays([...scheduleDays, newColumn]);
        } else if (newColumn) {
            alert("이미 존재하는 컬럼입니다.");
        }
    };

    const handleDownloadCSV = () => {
        const header = ["No.", ...scheduleDays].join(",");
        
        const rows = scheduleRows.map((rowItem, ri) => {
            const safeRowIndex = `${ri + 1}`;
            
            const rowData = scheduleDays.map(day => {
                let value = getCellValue(rowItem.id, day) || "";
                if (value.includes(',') || value.includes('"')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                if (!value.startsWith('"') && value.trim().length > 0) {
                    value = `"${value}"`;
                }
                return value;
            });
            return [safeRowIndex, ...rowData].join(",");
        });

        const csvContent = [header, ...rows].join("\n");
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedDayTitle || 'Schedule'}_Details.csv`);
        link.click();
    };

    const onDragEnd = (result) => {
        const { source, destination, type } = result;
        if (!destination || isDeletionModeActive) return;

        if (type === 'ROW') {
            const newRows = Array.from(scheduleRows);
            const [removed] = newRows.splice(source.index, 1);
            newRows.splice(destination.index, 0, removed);
            setScheduleRows(newRows);
        }
    };

    return (
        <div className="kschedule-container">
            <header className="kschedule-header">
                <h1>🗓️ Schedule Management and Editor</h1>

                                        <button 
                            onClick={handleSaveTableData} 
                            className="kschedule-btn-success_ok"
                            disabled={isSavingTable}
                            style={{ 
                                background: isSavingTable ? '#6c757d' : '#28a745',
                                cursor: isSavingTable ? 'not-allowed' : 'pointer'
                            }}
                        >
                            💾 {isSavingTable ? 'Saving...' : 'Save Table'}
                        </button>

                {isLoadingTable && (
                    <p style={{color: '#007bff'}}>
                        ⏳ 테이블 데이터 불러오는 중...
                    </p>
                )}
                {isSavingTable && (
                    <p style={{color: '#28a745'}}>
                        💾 테이블 저장 중...
                    </p>
                )}
            </header>

            {authError && (
                <div className="kschedule-error-message">
                    <p>🛑 **에러:** {authError}</p>
                    {authError.includes('Login error') && <p>잠시 후 메인 페이지로 이동합니다...</p>}

                </div>
            )}

            {!authError && (
                <>
                    <div className="kschedule-details">
                        <label>Day Title</label>
                        <select
                            className="kschedule-select"
                            value={selectedDayTitle}
                            onChange={handleDayTitleChange}
                        >
                            {dayTitles.length === 0 && <option value="">No Schedule!</option>}
                            {dayTitles.map(day => (
                                <option key={day} value={day}>
                                    {day}
                                </option>
                            ))}
                        </select>

                        <label>Description</label>
                        <textarea
                            rows={1}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />

                        <button className="kschedule-btn-success" onClick={handleSave}>
                            ✅ Save Description
                        </button>
                    </div>

                    <div className="kschedule-toolbar">
                        <button onClick={handleAddRow} className="kschedule-btn-primary">
                            ➕ Add Row
                        </button>

                        <button
                            onClick={toggleDeletionMode}
                            style={{ background: isDeletionModeActive ? '#ef4444' : '#cc0000', color: 'white' }}
                            className="kschedule-btn-danger"
                        >
                            <Trash2 size={16} />
                            {isDeletionModeActive ? 'Deletion Mode (ON)' : 'Deletion Mode (OFF)'}
                        </button>

                        <button onClick={handleAddColumn} className="kschedule-btn-secondary">
                            ➕ Add Column
                        </button>

                        <button onClick={handleDownloadCSV} className="kschedule-btn-info">
                            📥 CSV Download
                        </button>
                    </div>

                    <div className="kschedule-table-wrapper">
                        <DragDropContext onDragEnd={onDragEnd}>
                            <table className="kschedule-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        {scheduleDays.map((day, idx) => (
                                            <th
                                                key={`${day}-${idx}`}
                                                className={isDeletionModeActive ? 'kschedule-column-header-deletable' : ''}
                                                onClick={() => handleRemoveColumn(day)}
                                            >
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <Droppable droppableId="droppable-rows" type="ROW">
                                    {(provided) => (
                                        <tbody 
                                            ref={provided.innerRef} 
                                            {...provided.droppableProps}
                                        >
                                            {scheduleRows.map((rowItem, ti) => (
                                                <Draggable
                                                    key={rowItem.id}
                                                    draggableId={rowItem.id}
                                                    index={ti}
                                                    isDragDisabled={isDeletionModeActive}
                                                >
                                                    {(provided) => (
                                                        <tr
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                        >
                                                            <td
                                                                className={`kschedule-time-cell ${isDeletionModeActive ? 'kschedule-time-cell-deletable' : ''}`}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => handleRemoveRow(rowItem.id)}
                                                            >
                                                                {ti + 1}
                                                            </td>

                                                            {scheduleDays.map((day, di) => (
                                                                <td key={di} className="kschedule-schedule-cell">
                                                                    <input
                                                                        type="text"
                                                                        value={getCellValue(rowItem.id, day)}
                                                                        onChange={(e) =>
                                                                            handleCellChange(rowItem.id, day, e.target.value)
                                                                        }
                                                                        className="kschedule-cell-input"
                                                                        placeholder=" "
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </tbody>
                                    )}
                                </Droppable>
                            </table>
                        </DragDropContext>
                    </div>
                </>
            )}
        </div>
    );
};

export default ScheduleTable;