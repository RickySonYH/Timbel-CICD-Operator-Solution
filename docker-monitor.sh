#!/bin/bash
# [advice from AI] 도커 컨테이너 모니터링 및 관리 스크립트

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 도커 상태 확인
check_docker_status() {
    log_info "=== 🐳 도커 서비스 상태 확인 ==="
    
    if ! docker info > /dev/null 2>&1; then
        log_error "도커 데몬이 실행되지 않고 있습니다."
        return 1
    fi
    
    log_success "도커 데몬 실행 중"
    return 0
}

# 컨테이너 상태 확인
check_containers() {
    log_info "=== 📊 컨테이너 상태 확인 ==="
    
    # 실행 중인 컨테이너
    echo "실행 중인 컨테이너:"
    docker-compose ps --services --filter "status=running" 2>/dev/null | while read service; do
        if [ ! -z "$service" ]; then
            log_success "✅ $service"
        fi
    done
    
    # 중지된 컨테이너
    echo -e "\n중지된 컨테이너:"
    docker-compose ps --services --filter "status=exited" 2>/dev/null | while read service; do
        if [ ! -z "$service" ]; then
            log_warning "❌ $service"
        fi
    done
    
    # 헬스체크 실패 컨테이너
    echo -e "\n헬스체크 상태:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(unhealthy|health)" || echo "헬스체크 정보 없음"
}

# 리소스 사용량 확인
check_resources() {
    log_info "=== 💾 리소스 사용량 확인 ==="
    
    echo "도커 시스템 정보:"
    docker system df
    
    echo -e "\n컨테이너별 리소스 사용량:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
}

# 로그 확인
check_logs() {
    log_info "=== 📋 최근 로그 확인 ==="
    
    local services=("frontend" "backend" "postgres" "redis" "elasticsearch")
    
    for service in "${services[@]}"; do
        echo -e "\n${BLUE}=== $service 로그 (최근 10줄) ===${NC}"
        docker-compose logs --tail=10 $service 2>/dev/null || log_warning "$service 로그를 가져올 수 없습니다."
    done
}

# 자동 복구 시도
auto_recovery() {
    log_info "=== 🔄 자동 복구 시도 ==="
    
    # 중지된 컨테이너 재시작
    local stopped_containers=$(docker-compose ps --services --filter "status=exited" 2>/dev/null)
    
    if [ ! -z "$stopped_containers" ]; then
        log_warning "중지된 컨테이너 발견, 재시작 시도..."
        echo "$stopped_containers" | while read service; do
            if [ ! -z "$service" ]; then
                log_info "재시작 중: $service"
                docker-compose restart $service
            fi
        done
    else
        log_success "모든 컨테이너가 정상 실행 중입니다."
    fi
    
    # 헬스체크 실패 컨테이너 재시작
    local unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")
    if [ ! -z "$unhealthy" ]; then
        log_warning "헬스체크 실패 컨테이너 재시작: $unhealthy"
        echo "$unhealthy" | while read container; do
            docker restart "$container"
        done
    fi
}

# 정리 작업
cleanup() {
    log_info "=== 🧹 정리 작업 ==="
    
    # 사용하지 않는 이미지 제거
    docker image prune -f
    
    # 사용하지 않는 볼륨 제거 (주의: 데이터 손실 가능)
    # docker volume prune -f
    
    # 사용하지 않는 네트워크 제거
    docker network prune -f
    
    log_success "정리 작업 완료"
}

# 메인 함수
main() {
    echo "🐳 Timbel 도커 환경 모니터링 도구"
    echo "======================================"
    
    case "${1:-status}" in
        "status")
            check_docker_status && check_containers
            ;;
        "resources")
            check_resources
            ;;
        "logs")
            check_logs
            ;;
        "recovery")
            auto_recovery
            ;;
        "cleanup")
            cleanup
            ;;
        "full")
            check_docker_status && check_containers && check_resources && check_logs
            ;;
        "help")
            echo "사용법: $0 [status|resources|logs|recovery|cleanup|full|help]"
            echo "  status    - 컨테이너 상태 확인 (기본값)"
            echo "  resources - 리소스 사용량 확인"
            echo "  logs      - 최근 로그 확인"
            echo "  recovery  - 자동 복구 시도"
            echo "  cleanup   - 정리 작업"
            echo "  full      - 전체 상태 확인"
            echo "  help      - 도움말"
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            echo "도움말을 보려면 '$0 help'를 실행하세요."
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
