#!/bin/bash

# QA API 테스트 스크립트

echo "=== QA API 테스트 시작 ==="

# 1. 로그인하여 토큰 받기
echo "1. 로그인 중..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login-jwt \
  -H "Content-Type: application/json" \
  -d '{"username": "qauser", "password": "1q2w3e4r"}')

echo "로그인 응답: $LOGIN_RESPONSE"

# 토큰 추출
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "추출된 토큰: ${TOKEN:0:50}..."

if [ -z "$TOKEN" ]; then
  echo "❌ 토큰 추출 실패"
  exit 1
fi

echo "✅ 토큰 추출 성공"

# 2. QA 테스트 케이스 목록 조회
echo -e "\n2. QA 테스트 케이스 목록 조회..."
curl -s -X GET "http://localhost:3001/api/qa/test-cases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -c 200
echo ""

# 3. 버그 리포트 생성
echo -e "\n3. 버그 리포트 생성..."
curl -s -X POST "http://localhost:3001/api/qa/bug-reports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "로그인 버튼 클릭 시 오류", "description": "로그인 버튼을 클릭하면 500 에러가 발생합니다", "severity": "high", "priority": "urgent", "component": "authentication"}' | head -c 200
echo ""

# 4. 버그 리포트 목록 조회
echo -e "\n4. 버그 리포트 목록 조회..."
curl -s -X GET "http://localhost:3001/api/qa/bug-reports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -c 200
echo ""

# 5. 이슈 목록 조회
echo -e "\n5. 이슈 목록 조회..."
curl -s -X GET "http://localhost:3001/api/qa/issues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -c 200
echo ""

# 6. QA 승인 목록 조회
echo -e "\n6. QA 승인 목록 조회..."
curl -s -X GET "http://localhost:3001/api/qa/approvals" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -c 200
echo ""

# 7. 테스트 실행 로그 조회
echo -e "\n7. 테스트 실행 로그 조회..."
curl -s -X GET "http://localhost:3001/api/qa/execution-logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -c 200
echo ""

echo -e "\n=== QA API 테스트 완료 ==="
