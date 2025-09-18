# [advice from AI] WSL2에서 외부 접속을 위한 Windows 포트 포워딩 설정 스크립트
# 관리자 권한으로 PowerShell에서 실행하세요

Write-Host "🚀 Timbel 플랫폼 외부 접속 설정 시작" -ForegroundColor Green

# WSL2 IP 주소 (수동으로 업데이트 필요)
$WSL_IP = "172.23.92.151"

Write-Host "📍 WSL2 IP 주소: $WSL_IP" -ForegroundColor Yellow

# 1. 기존 포트 프록시 규칙 삭제
Write-Host "🧹 기존 포트 프록시 규칙 정리 중..." -ForegroundColor Blue
try {
    netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 2>$null
    netsh interface portproxy delete v4tov4 listenport=443 listenaddress=0.0.0.0 2>$null
    Write-Host "✅ 기존 규칙 정리 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 기존 규칙 정리 중 오류 (무시 가능)" -ForegroundColor Yellow
}

# 2. HTTP 포트 포워딩 설정
Write-Host "🌐 HTTP 포트 포워딩 설정 중..." -ForegroundColor Blue
try {
    netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=$WSL_IP
    Write-Host "✅ HTTP 포트 포워딩 설정 완료" -ForegroundColor Green
} catch {
    Write-Host "❌ HTTP 포트 포워딩 설정 실패" -ForegroundColor Red
    exit 1
}

# 3. HTTPS 포트 포워딩 설정
Write-Host "🔒 HTTPS 포트 포워딩 설정 중..." -ForegroundColor Blue
try {
    netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=$WSL_IP
    Write-Host "✅ HTTPS 포트 포워딩 설정 완료" -ForegroundColor Green
} catch {
    Write-Host "❌ HTTPS 포트 포워딩 설정 실패" -ForegroundColor Red
    exit 1
}

# 4. 방화벽 규칙 추가
Write-Host "🔥 방화벽 규칙 설정 중..." -ForegroundColor Blue
try {
    # 기존 규칙 삭제 (있을 경우)
    Remove-NetFirewallRule -DisplayName "WSL2-HTTP" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "WSL2-HTTPS" -ErrorAction SilentlyContinue
    
    # 새 규칙 추가
    New-NetFirewallRule -DisplayName "WSL2-HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
    New-NetFirewallRule -DisplayName "WSL2-HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
    Write-Host "✅ 방화벽 규칙 설정 완료" -ForegroundColor Green
} catch {
    Write-Host "❌ 방화벽 규칙 설정 실패" -ForegroundColor Red
    exit 1
}

# 5. 설정 확인
Write-Host "📊 현재 포트 프록시 설정:" -ForegroundColor Blue
netsh interface portproxy show all

Write-Host ""
Write-Host "🎉 외부 접속 설정 완료!" -ForegroundColor Green
Write-Host "📍 접속 URL: http://rdc.rickyson.com" -ForegroundColor Yellow
Write-Host "⚠️  DNS 설정이 올바른지 확인하세요 (rdc.rickyson.com → 112.153.187.162)" -ForegroundColor Yellow

# 6. 접속 테스트
Write-Host "🧪 로컬 접속 테스트 중..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 로컬 접속 테스트 성공" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 로컬 접속 테스트 실패: HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 로컬 접속 테스트 실패: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 추가 확인 사항:" -ForegroundColor Blue
Write-Host "1. 도메인 DNS가 올바른 IP(112.153.187.162)로 설정되어 있는지 확인" -ForegroundColor White
Write-Host "2. 라우터/방화벽에서 포트 80, 443이 열려있는지 확인" -ForegroundColor White
Write-Host "3. 외부에서 http://rdc.rickyson.com 접속 테스트" -ForegroundColor White
