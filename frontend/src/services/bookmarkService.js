/**
 * 📡 bookmarkService.js
 * 백엔드 북마크 API와 통신하는 서비스 레이어
 * 
 * 백엔드 API 구조:
 * - POST   /api/bookmark              → 북마크 생성
 * - GET    /api/bookmark/{user_id}    → 북마크 목록 조회
 * - DELETE /api/bookmark/{bookmark_id}/{user_id} → 북마크 삭제
 */

const API_BASE = 'http://localhost:8000/api';

// ✅ place_type 상수 정의
export const PlaceType = {
    RESTAURANT: 0,  // 음식점
    FESTIVAL: 1,    // 축제
    ATTRACTION: 2,  // 명소
    KCONTENT: 3     // K-콘텐츠
};

/**
 * 🔐 인증 헤더 생성
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('session_id');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

/**
 * 📋 사용자의 모든 북마크 조회
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} 북마크 목록
 */
export const getBookmarks = async (userId) => {
    try {
        console.log('📡 북마크 조회 요청: user_id =', userId);
        
        const response = await fetch(`${API_BASE}/bookmark/${userId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 북마크 조회 실패:', response.status, errorText);
            throw new Error(`북마크 조회 실패: ${response.status}`);
        }

        const bookmarks = await response.json();
        console.log('✅ 북마크 조회 성공:', bookmarks.length, '개');
        console.log('📦 원본 데이터:', bookmarks);
        
        return bookmarks;
    } catch (error) {
        console.error('❌ 북마크 조회 에러:', error);
        throw error;
    }
};

/**
 * 🎬 K-콘텐츠 북마크만 필터링
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Array>} K-콘텐츠 북마크 목록
 */
export const getKContentBookmarks = async (userId) => {
    try {
        const allBookmarks = await getBookmarks(userId);
        
        console.log('📊 전체 북마크 통계:');
        console.log('  - 총 개수:', allBookmarks.length);
        
        // place_type별 분포 확인
        const typeDistribution = {
            '음식점(0)': 0,
            '축제(1)': 0,
            '명소(2)': 0,
            'K-콘텐츠(3)': 0
        };
        
        allBookmarks.forEach(b => {
            switch(b.place_type) {
                case PlaceType.RESTAURANT: typeDistribution['음식점(0)']++; break;
                case PlaceType.FESTIVAL: typeDistribution['축제(1)']++; break;
                case PlaceType.ATTRACTION: typeDistribution['명소(2)']++; break;
                case PlaceType.KCONTENT: typeDistribution['K-콘텐츠(3)']++; break;
            }
        });
        
        console.log('  - place_type 분포:', typeDistribution);
        
        // ✅ place_type === 3인 것만 필터링 (K-콘텐츠)
        const kcontentBookmarks = allBookmarks
            .filter(b => {
                const isKContent = b.place_type === PlaceType.KCONTENT;
                if (isKContent) {
                    console.log(`  ✓ K-콘텐츠: ${b.name} (id: ${b.bookmark_id})`);
                }
                return isKContent;
            })
            // ✅ 중복 제거 (reference_id 기준)
            .reduce((unique, item) => {
                const exists = unique.find(u => u.referenceId === item.reference_id);
                if (!exists) {
                    unique.push({
                        id: item.bookmark_id,
                        title: item.name,
                        img: item.image_url || 'https://via.placeholder.com/200?text=No+Image',
                        referenceId: item.reference_id,
                        latitude: item.latitude,
                        longitude: item.longitude,
                        notes: item.notes,
                        createdAt: item.created_at,
                        placeType: item.place_type
                    });
                } else {
                    console.log(`  ⚠️ 중복 제거: ${item.name}`);
                }
                return unique;
            }, []);

        console.log('🎬 K-콘텐츠 북마크 최종:', kcontentBookmarks.length, '개');
        
        if (kcontentBookmarks.length === 0) {
            console.warn('⚠️ K-콘텐츠 북마크가 없습니다!');
            console.log('💡 place_type=3인 북마크를 추가하세요.');
            console.log('💡 K-Spotlight 페이지에서 하트를 눌러 북마크를 추가할 수 있습니다.');
        }
        
        return kcontentBookmarks;
    } catch (error) {
        console.error('❌ K-콘텐츠 북마크 조회 실패:', error);
        return [];
    }
};

/**
 * 🔖 북마크 추가 (범용)
 * 
 * @param {Object} options - 북마크 옵션
 * @param {number} options.userId - 사용자 ID
 * @param {string} options.name - 장소명
 * @param {number} options.placeType - 장소 타입 (PlaceType 상수 사용)
 * @param {number} options.referenceId - 원본 콘텐츠 ID
 * @param {number} [options.latitude] - 위도
 * @param {number} [options.longitude] - 경도
 * @param {string} [options.imageUrl] - 이미지 URL
 * @param {string} [options.notes] - 메모
 * @returns {Promise<Object>} 생성된 북마크
 * 
 * @example
 * // K-콘텐츠 북마크 추가
 * await addBookmark({
 *   userId: 3,
 *   name: "남산타워",
 *   placeType: PlaceType.KCONTENT,
 *   referenceId: 123,
 *   imageUrl: "https://..."
 * });
 */
export const addBookmark = async ({
    userId,
    name,
    placeType,
    referenceId,
    latitude = null,
    longitude = null,
    imageUrl = null,
    notes = null
}) => {
    try {
        const placeTypeName = Object.keys(PlaceType).find(
            key => PlaceType[key] === placeType
        );
        console.log(`📤 북마크 추가: ${name} (${placeTypeName})`);

        const body = {
            user_id: userId,
            name: name,
            place_type: placeType,
            reference_id: referenceId,
            latitude: latitude,
            longitude: longitude,
            image_url: imageUrl,
            notes: notes,
            extracted_from_convers_id: 0
        };

        const response = await fetch(`${API_BASE}/bookmark`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `북마크 추가 실패: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ 북마크 추가 성공:', result);
        return result;
    } catch (error) {
        console.error('❌ 북마크 추가 에러:', error);
        throw error;
    }
};

/**
 * 🗑️ 북마크 삭제
 * @param {number} bookmarkId - 북마크 ID
 * @param {number} userId - 사용자 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export const deleteBookmark = async (bookmarkId, userId) => {
    try {
        console.log(`🗑️ 북마크 삭제 요청: bookmark_id=${bookmarkId}, user_id=${userId}`);

        const response = await fetch(
            `${API_BASE}/bookmark/${bookmarkId}/${userId}`,
            {
                method: 'DELETE',
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `북마크 삭제 실패: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ 북마크 삭제 성공:', result);
        return result;
    } catch (error) {
        console.error('❌ 북마크 삭제 에러:', error);
        throw error;
    }
};

/**
 * 👤 사용자 정보 조회
 * @returns {Promise<Object>} 사용자 정보
 */
export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('session_id');
        
        if (!token) {
            console.warn('⚠️ 토큰 없음');
            return null;
        }

        const response = await fetch(`${API_BASE}/auth/me`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`사용자 정보 조회 실패: ${response.status}`);
        }

        const userData = await response.json();
        console.log('✅ 사용자 정보:', userData);
        
        return {
            id: userData.user_id || userData.id,
            name: userData.name || userData.username,
            email: userData.email,
            profileImg: userData.profile_img || '/images/profile_emily.jpg'
        };
    } catch (error) {
        console.error('❌ 사용자 정보 조회 실패:', error);
        return null;
    }
};

// export const PlaceType = {
//     ATTRACTION: 1,   // 명소
//     KCONTENT: 3,     // K-콘텐츠
//     RESTAURANT: 0,   // 음식
//     FESTIVAL: 2      // 페스티벌
// };