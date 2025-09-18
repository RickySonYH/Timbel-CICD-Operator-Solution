#!/bin/bash

# [advice from AI] 안정적인 백엔드 서버 시작 스크립트

echo "🔧 Timbel 백엔드 서버 시작 중..."

# 기존 프로세스 정리
echo "🧹 기존 프로세스 정리 중..."
pkill -f "node src/index.js" 2>/dev/null || true
sleep 2

# 포트 3001 정리
echo "🔌 포트 3001 정리 중..."
sudo fuser -k 3001/tcp 2>/dev/null || true
sleep 2

# 환경 변수 설정
export DB_HOST=localhost
export DB_PORT=5434
export DB_NAME=timbel_db
export DB_USER=timbel_user
export DB_PASSWORD=timbel_password
export NODE_ENV=development

# 서버 시작
echo "🚀 서버 시작..."
cd /home/rickyson/Timbel-Knowledge-Dev/backend

# 로그 파일 생성
LOG_FILE="server.log"
ERROR_FILE="error.log"

# 백그라운드에서 서버 실행 (로그 파일에 기록)
nohup node src/index.js > "$LOG_FILE" 2> "$ERROR_FILE" &
SERVER_PID=$!

echo "✅ 서버가 PID $SERVER_PID로 시작되었습니다"
echo "📄 로그: $LOG_FILE"
echo "❌ 에러 로그: $ERROR_FILE"

# 3초 후 서버 상태 확인
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    echo "✅ 서버가 정상적으로 실행 중입니다"
    echo "🔗 http://localhost:3001/health"
    
    # 헬스체크
    echo "🏥 헬스체크 중..."
    curl -s http://localhost:3001/health || echo "⚠️ 헬스체크 실패"
else
    echo "❌ 서버 시작 실패"
    echo "📄 최근 로그:"
    tail -10 "$ERROR_FILE" 2>/dev/null || echo "에러 로그 없음"
    exit 1
fi

echo "🎉 서버 시작 완료!"
