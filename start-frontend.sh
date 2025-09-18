#!/bin/bash

# [advice from AI] 안정적인 프론트엔드 시작 스크립트

echo "🎨 Timbel 프론트엔드 서버 시작 중..."

# 기존 프로세스 정리
echo "🧹 기존 프로세스 정리 중..."
pkill -f "npm start" 2>/dev/null || true
pkill -f "craco start" 2>/dev/null || true
sleep 2

# 포트 3000 정리
echo "🔌 포트 3000 정리 중..."
PID=$(lsof -t -i:3000 2>/dev/null)
if [ -n "$PID" ]; then
    echo "포트 3000에서 실행 중인 프로세스 종료: $PID"
    kill -9 $PID 2>/dev/null || true
    sleep 2
else
    echo "포트 3000 사용 프로세스 없음"
fi

# 프론트엔드 디렉토리로 이동
cd /home/rickyson/Timbel-Knowledge-Dev/frontend

# 환경 변수 설정
export PORT=3000
export BROWSER=none
export GENERATE_SOURCEMAP=false
export TSC_COMPILE_ON_ERROR=true
export ESLINT_NO_DEV_ERRORS=true
export SKIP_PREFLIGHT_CHECK=true
export DISABLE_ESLINT_PLUGIN=true

echo "🚀 프론트엔드 시작..."

# 로그 파일 생성
LOG_FILE="frontend.log"
ERROR_FILE="frontend-error.log"

# 백그라운드에서 프론트엔드 실행
nohup npm start > "$LOG_FILE" 2> "$ERROR_FILE" &
FRONTEND_PID=$!

echo "✅ 프론트엔드가 PID $FRONTEND_PID로 시작되었습니다"
echo "📄 로그: $LOG_FILE"
echo "❌ 에러 로그: $ERROR_FILE"

# 10초 후 서버 상태 확인
echo "⏳ 프론트엔드 시작 대기 중... (10초)"
sleep 10

if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ 프론트엔드가 정상적으로 실행 중입니다"
    echo "🔗 http://localhost:3000"
    
    # 헬스체크 (간단한 포트 확인)
    echo "🏥 포트 확인 중..."
    if lsof -i :3000 > /dev/null 2>&1; then
        echo "✅ 포트 3000에서 정상 실행 중"
    else
        echo "⚠️ 포트 3000 확인 실패"
    fi
else
    echo "❌ 프론트엔드 시작 실패"
    echo "📄 최근 로그:"
    tail -10 "$ERROR_FILE" 2>/dev/null || echo "에러 로그 없음"
    exit 1
fi

echo "🎉 프론트엔드 시작 완료!"
echo "🌐 브라우저에서 http://localhost:3000 을 열어주세요"
