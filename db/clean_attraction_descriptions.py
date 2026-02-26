"""
attraction 테이블 description 클리닝 스크립트
- JSON-LD 스키마 블록 제거 ({ "@context": "https://schema.org" ... })
- 깨진 인코딩 문자 정리 (??)
- 과도한 공백/줄바꿈 정리
- 클리닝 전/후 미리보기 후 확인 받고 실제 업데이트
"""

import re
import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "ktravel",
    "user": "ktravel_user",
    "password": "ktravel_password",
    "options": "-csearch_path=lgup2"
}


def clean_description(text: str) -> str:
    if not text:
        return text

    # 1. JSON-LD 블록 제거 ({ "@context": ... } 이후 전부)
    json_start = text.find('{ "@context"')
    if json_start == -1:
        json_start = text.find('{"@context"')
    if json_start != -1:
        text = text[:json_start]

    # 2. 깨진 인코딩 문자 정리 (?? → ')
    text = text.replace("??", "'")

    # 3. HTML 태그 제거 (혹시 남아있을 경우)
    text = re.sub(r'<[^>]+>', '', text)

    # 4. 연속 공백/줄바꿈 정리
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)

    return text.strip()


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 전체 레코드 가져오기
    cur.execute("SELECT attr_id, title, description FROM attraction ORDER BY attr_id")
    rows = cur.fetchall()

    print(f"총 {len(rows)}개 레코드 클리닝 시작\n")

    cleaned = []
    changed_count = 0

    for attr_id, title, description in rows:
        original = description or ""
        new_desc = clean_description(original)

        if new_desc != original:
            changed_count += 1
            cleaned.append((attr_id, title, original, new_desc))

    print(f"변경 필요한 레코드: {changed_count}개 / 전체 {len(rows)}개\n")

    # 상위 5개 미리보기
    print("=" * 70)
    print("[ 미리보기: 변경되는 상위 5개 ]")
    print("=" * 70)
    for attr_id, title, original, new_desc in cleaned[:5]:
        print(f"\n[{attr_id}] {title}")
        print(f"  이전 길이: {len(original)}자 → 이후 길이: {len(new_desc)}자")
        print(f"  이후 내용 (앞 200자):\n  {new_desc[:200]}")
        print("-" * 70)

    # 확인 후 업데이트
    answer = input("\n실제 DB에 반영할까요? (yes/no): ").strip().lower()
    if answer != "yes":
        print("취소됨.")
        cur.close()
        conn.close()
        return

    # 업데이트 실행
    for attr_id, title, original, new_desc in cleaned:
        cur.execute(
            "UPDATE attraction SET description = %s WHERE attr_id = %s",
            (new_desc, attr_id)
        )

    conn.commit()
    print(f"\n✅ {changed_count}개 레코드 업데이트 완료!")

    # 결과 검증
    cur.execute("SELECT AVG(LENGTH(description)), MAX(LENGTH(description)) FROM attraction")
    avg_len, max_len = cur.fetchone()
    print(f"   평균 길이: {avg_len:.0f}자 / 최대 길이: {max_len}자")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
