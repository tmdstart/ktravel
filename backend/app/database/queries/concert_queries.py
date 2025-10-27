"""
뮤지컬/공연 관련 데이터베이스 쿼리 및 비즈니스 로직 통합
(테이블명: musical, ID: musical_id, 컬럼: title, place, image, link 등)
"""

class MusicalQueries:
    """뮤지컬/공연 테이블 쿼리 및 비즈니스 로직"""
    
    # 공통 컬럼 목록 (SELECT * 대신 사용, description, filter_type 제거)
    BASE_COLUMNS = "musical_id, title, start_date, end_date, place, image, link, latitude, longitude"
    
    # ============================================
    # 기본 CRUD 쿼리
    # ============================================
    
    @staticmethod
    def get_all(cursor, limit: int = 100, offset: int = 0):
        """모든 뮤지컬/공연 조회 (페이징 포함)"""
        # filter_type 제거
        # 테이블명 변경: concert -> musical
        query = f"""
        SELECT {MusicalQueries.BASE_COLUMNS} FROM musical 
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, (limit, offset))
        return cursor.fetchall()
    
    @staticmethod
    def get_by_id(cursor, musical_id: int):
        """특정 뮤지컬/공연 조회"""
        # 쿼리 ID 및 테이블 이름 변경: concert_id -> musical_id, concert -> musical
        query = f"""
        SELECT {MusicalQueries.BASE_COLUMNS} FROM musical 
        WHERE musical_id = %s
        """
        cursor.execute(query, (musical_id,))
        return cursor.fetchone()
    
    @staticmethod
    def get_ongoing(cursor):
        """진행 중인 뮤지컬/공연 조회"""
        # 테이블명 변경: concert -> musical
        query = f"""
        SELECT {MusicalQueries.BASE_COLUMNS} FROM musical 
        WHERE start_date <= CURDATE() 
        AND end_date >= CURDATE()
        """
        cursor.execute(query)
        return cursor.fetchall()
    
    @staticmethod
    def get_upcoming(cursor):
        """예정된 뮤지컬/공연 조회"""
        # 테이블명 변경: concert -> musical
        query = f"""
        SELECT {MusicalQueries.BASE_COLUMNS} FROM musical 
        WHERE start_date > CURDATE()
        ORDER BY start_date ASC
        """
        cursor.execute(query)
        return cursor.fetchall()
    
    @staticmethod
    def search(cursor, search_query: str):
        """뮤지컬/공연 검색 (제목, 장소)"""
        # 테이블명 변경: concert -> musical
        # ⚠️ description 대신 place 컬럼 사용
        query = f"""
        SELECT {MusicalQueries.BASE_COLUMNS} FROM musical 
        WHERE title LIKE %s 
        OR place LIKE %s
        """
        search_term = f"%{search_query}%"
        cursor.execute(query, (search_term, search_term))
        return cursor.fetchall()
    
    @staticmethod
    def count_all(cursor):
        """전체 뮤지컬/공연 수 조회"""
        # 테이블명 변경: concert -> musical
        query = "SELECT COUNT(*) as count FROM musical"
        cursor.execute(query)
        
        result = cursor.fetchone()
        return result['count']
    
    @staticmethod
    def get_by_date_range(cursor, start_date, end_date):
        """특정 날짜 범위의 뮤지컬/공연 조회"""
        # 테이블명 변경: concert -> musical
        query = f"""
        SELECT {MusicalQueries.BASE_COLUMNS} FROM musical 
        WHERE (start_date BETWEEN %s AND %s)
        OR (end_date BETWEEN %s AND %s)
        OR (start_date <= %s AND end_date >= %s)
        ORDER BY start_date ASC
        """
        cursor.execute(query, (start_date, end_date, start_date, end_date, start_date, end_date))
        return cursor.fetchall()
    
    @staticmethod
    def musical_exists(cursor, musical_id: int) -> bool:
        """뮤지컬/공연 존재 여부 확인"""
        # 컬럼명 및 테이블명 변경: concert_id -> musical_id, concert -> musical
        query = "SELECT COUNT(*) as count FROM musical WHERE musical_id = %s"
        cursor.execute(query, (musical_id,))
        result = cursor.fetchone()
        return result['count'] > 0
    
    # ============================================
    # 비즈니스 로직
    # ============================================
    
    @staticmethod
    def get_all_musicals_with_error_handling(cursor, skip: int = 0, limit: int = 100):
        """모든 뮤지컬/공연 조회 (에러 핸들링 포함)"""
        try:
            # get_all 호출 시 filter_type 인자 제거
            musicals = MusicalQueries.get_all(cursor, limit, skip)
            return {"success": True, "data": musicals}
        except Exception as e:
            import traceback
            print(f"ERROR: {str(e)}")
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_musical_by_id_with_validation(cursor, musical_id: int):
        """특정 뮤지컬/공연 조회 (검증 포함)"""
        try:
            # 함수명 변경: get_concert_by_id -> get_by_id, 변수명 변경: concert -> musical
            musical = MusicalQueries.get_by_id(cursor, musical_id)
            if not musical:
                return {"success": False, "error": "Musical/Performance not found", "status_code": 404}
            return {"success": True, "data": musical}
        except Exception as e:
            import traceback
            print(f"ERROR: {str(e)}")
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}