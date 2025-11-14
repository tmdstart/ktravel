// KMediaCardData.js
// FastAPI와 직접 연결, 이미지 프록시 없이 원본 URL 사용

const BASE_URL = "http://localhost:8000/api";

/**
 * 공통 fetch 함수
 * @param {string} url
 * @returns {Promise<any>}
 */
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorDetail = await response.text();
      throw new Error(`API Request Failed: ${response.status} - ${errorDetail}`);
    }
    return response.json();
  } catch (error) {
    console.error("🌐 API 호출 오류:", error);
    throw error;
  }
}

/**
 * Helper: 배열을 무작위로 섞습니다. (Fisher-Yates 알고리즘)
 * @param {any[]} array
 * @returns {any[]} 셔플된 배열
 */
function shuffleArray(array) {
  // 배열을 복사하여 원본을 변경하지 않도록 할 수 있지만, 여기서는 성능을 위해 원본 배열을 수정합니다.
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // 요소 교환
  }
  return array;
}

//----------------------------------------------------------------------
// 기존 Export 함수
//----------------------------------------------------------------------

/**
 * 1️⃣ 전체 K-Content 목록 조회
 * @param {number} skip
 * @param {number} limit
 * @returns {Promise<any[]>}
 */
export async function fetchKContentList(skip = 0, limit = 100) {
  const url = `${BASE_URL}/kcontents?skip=${skip}&limit=${limit}`;
  return fetchData(url);
}

/**
 * 2️⃣ 특정 콘텐츠 상세 조회
 * @param {number} contentId
 * @returns {Promise<any>}
 */
export async function fetchKContentDetail(contentId) {
  const url = `${BASE_URL}/kcontents/${contentId}`;
  return fetchData(url);
}

/**
 * 3️⃣ 검색 API
 * @param {string} query
 * @returns {Promise<any[]>}
 */
export async function fetchKContentSearch(query) {
  if (!query || query.trim().length < 2) {
    console.warn("검색어는 2글자 이상이어야 합니다.");
    return [];
  }
  const url = `${BASE_URL}/kcontents/search/query?q=${encodeURIComponent(query)}`;
  return fetchData(url);
}

/**
 * 4️⃣ 카테고리 조회
 * @param {string} category
 * @returns {Promise<any[]>}
 */
export async function fetchKContentByCategory(category) {
  if (!category) return [];
  const url = `${BASE_URL}/kcontents/search/category?category=${encodeURIComponent(category)}`;
  return fetchData(url);
}

/**
 * 5️⃣ Helper: 리스트 안의 모든 이미지 URL 반환 (프록시 없이 원본 URL)
 * @param {string[]} urls
 * @returns {string[]} 원본 URL 배열
 */
export function getImageList(urls) {
  if (!urls || !Array.isArray(urls)) return [];
  return urls;
}

//----------------------------------------------------------------------
// 🆕 추가된 셔플 함수
//----------------------------------------------------------------------

/**
 * 6️⃣ 전체 K-Content 목록을 가져와 클라이언트 측에서 셔플하여 반환
 * ⚠️ 주의: limit으로 제한된 데이터 내에서만 셔플됩니다.
 * @param {number} skip
 * @param {number} limit
 * @returns {Promise<any[]>}
 */
export async function fetchShuffledKContentList(skip = 0, limit = 100) {
    try {
        // 1. 기존 함수를 사용하여 데이터를 가져옴 (서버에서 정렬된 상태 그대로)
        const contentList = await fetchKContentList(skip, limit);
        
        // 2. 클라이언트 측에서 배열을 셔플
        const shuffledList = shuffleArray(contentList);
        
        return shuffledList;
    } catch (error) {
        console.error("🌐 셔플 목록 조회 오류:", error);
        throw error;
    }
}


//----------------------------------------------------------------------
// 🆕 하트 추가 함수 
//----------------------------------------------------------------------


// 좋아요 추가하는 함수
export const addLike = async (contentId) => {
    const response = await fetch(`/api/kcontent/${contentId}/like`, {
        method: 'POST',
        // 사용자 인증 정보 포함
    });
    return await response.json();
}

// 좋아요 취소하는 함수
export const removeLike = async (contentId) => {
    const response = await fetch(`/api/kcontent/${contentId}/like`, {
        method: 'DELETE',
    });
    return await response.json();
}
