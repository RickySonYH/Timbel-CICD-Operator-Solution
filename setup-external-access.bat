@echo off
REM [advice from AI] WSL2 외부 접속 설정을 위한 배치 파일
REM 관리자 권한으로 실행하세요

echo 🚀 Timbel 플랫폼 외부 접속 설정 시작
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ 관리자 권한으로 실행 중
) else (
    echo ❌ 관리자 권한이 필요합니다. 
    echo 우클릭 → "관리자 권한으로 실행"을 선택하세요.
    pause
    exit /b 1
)

echo.
echo 🧹 기존 포트 프록시 규칙 정리 중...
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 >nul 2>&1

echo 🌐 HTTP 포트 포워딩 설정 중...
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.23.92.151
if %errorLevel% == 0 (
    echo ✅ HTTP 포트 포워딩 설정 완료
) else (
    echo ❌ HTTP 포트 포워딩 설정 실패
    pause
    exit /b 1
)

echo 🔒 HTTPS 포트 포워딩 설정 중...
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=172.23.92.151
if %errorLevel% == 0 (
    echo ✅ HTTPS 포트 포워딩 설정 완료
) else (
    echo ❌ HTTPS 포트 포워딩 설정 실패
    pause
    exit /b 1
)

echo 🔥 방화벽 규칙 설정 중...
powershell -Command "Remove-NetFirewallRule -DisplayName 'WSL2-HTTP' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'WSL2-HTTP' -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow" >nul 2>&1
powershell -Command "Remove-NetFirewallRule -DisplayName 'WSL2-HTTPS' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'WSL2-HTTPS' -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow" >nul 2>&1
echo ✅ 방화벽 규칙 설정 완료

echo.
echo 📊 현재 포트 프록시 설정:
netsh interface portproxy show all

echo.
echo 🎉 외부 접속 설정 완료!
echo 📍 접속 URL: http://rdc.rickyson.com
echo ⚠️  DNS 설정 확인: rdc.rickyson.com → 112.153.187.162
echo.

echo 🧪 로컬 접속 테스트 중...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost' -UseBasicParsing -TimeoutSec 5; Write-Host '✅ 로컬 접속 테스트 성공 (HTTP' $response.StatusCode ')' -ForegroundColor Green } catch { Write-Host '❌ 로컬 접속 테스트 실패:' $_.Exception.Message -ForegroundColor Red }"

echo.
echo 📝 추가 확인 사항:
echo 1. 도메인 DNS가 올바른 IP(112.153.187.162)로 설정되어 있는지 확인
echo 2. 라우터/방화벽에서 포트 80, 443이 열려있는지 확인  
echo 3. 외부에서 http://rdc.rickyson.com 접속 테스트
echo.
pause
