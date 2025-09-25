const axios = require('axios');
const https = require('https');

// HTTPS 에이전트 (자체 서명 인증서 허용)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * 서비스별 헬스체크 함수들
 */
const healthCheckers = {
    /**
     * Nexus Repository 헬스체크
     */
    async nexus(infrastructure) {
        try {
            const healthUrl = infrastructure.health_check_url || `${infrastructure.service_url}/service/rest/v1/status`;
            const response = await axios.get(healthUrl, {
                timeout: 10000,
                httpsAgent,
                validateStatus: (status) => status < 500
            });
            
            return {
                status: response.status === 200 ? 'healthy' : 'warning',
                response_time: response.config.metadata?.endTime - response.config.metadata?.startTime,
                details: {
                    http_status: response.status,
                    version: response.data?.version || 'unknown'
                }
            };
        } catch (error) {
            return {
                status: 'error',
                error_message: error.message,
                details: {
                    error_code: error.code,
                    error_type: error.name
                }
            };
        }
    },

    /**
     * Docker Registry 헬스체크
     */
    async docker_registry(infrastructure) {
        try {
            const healthUrl = infrastructure.health_check_url || `${infrastructure.service_url}/v2/`;
            const response = await axios.get(healthUrl, {
                timeout: 10000,
                httpsAgent,
                validateStatus: (status) => status < 500
            });
            
            return {
                status: response.status === 200 ? 'healthy' : 'warning',
                response_time: response.config.metadata?.endTime - response.config.metadata?.startTime,
                details: {
                    http_status: response.status,
                    docker_registry_version: response.headers['docker-distribution-api-version'] || 'unknown'
                }
            };
        } catch (error) {
            return {
                status: 'error',
                error_message: error.message,
                details: {
                    error_code: error.code,
                    error_type: error.name
                }
            };
        }
    },

    /**
     * Jenkins 헬스체크
     */
    async jenkins(infrastructure) {
        try {
            const healthUrl = infrastructure.health_check_url || `${infrastructure.service_url}/api/json`;
            const response = await axios.get(healthUrl, {
                timeout: 10000,
                httpsAgent,
                validateStatus: (status) => status < 500
            });
            
            const isHealthy = response.status === 200 || response.status === 403; // 403은 인증 필요하지만 서비스는 정상
            
            return {
                status: isHealthy ? 'healthy' : 'warning',
                response_time: response.config.metadata?.endTime - response.config.metadata?.startTime,
                details: {
                    http_status: response.status,
                    jenkins_version: response.headers['x-jenkins'] || 'unknown',
                    requires_auth: response.status === 403
                }
            };
        } catch (error) {
            return {
                status: 'error',
                error_message: error.message,
                details: {
                    error_code: error.code,
                    error_type: error.name
                }
            };
        }
    },

    /**
     * Argo CD 헬스체크
     */
    async argocd(infrastructure) {
        try {
            const healthUrl = infrastructure.health_check_url || `${infrastructure.service_url}/healthz`;
            const response = await axios.get(healthUrl, {
                timeout: 10000,
                httpsAgent,
                validateStatus: (status) => status < 500
            });
            
            return {
                status: response.status === 200 ? 'healthy' : 'warning',
                response_time: response.config.metadata?.endTime - response.config.metadata?.startTime,
                details: {
                    http_status: response.status,
                    argocd_version: response.headers['x-argocd-version'] || 'unknown'
                }
            };
        } catch (error) {
            return {
                status: 'error',
                error_message: error.message,
                details: {
                    error_code: error.code,
                    error_type: error.name
                }
            };
        }
    }
};

/**
 * 단일 인프라 헬스체크 수행
 * @param {Object} infrastructure - 인프라 정보
 * @returns {Object} - 헬스체크 결과
 */
async function performHealthCheck(infrastructure) {
    const startTime = Date.now();
    
    try {
        console.log(`🔍 헬스체크 시작: ${infrastructure.service_name} (${infrastructure.service_type})`);
        
        // 서비스 타입별 헬스체크 함수 선택
        const checker = healthCheckers[infrastructure.service_type];
        if (!checker) {
            throw new Error(`지원하지 않는 서비스 타입: ${infrastructure.service_type}`);
        }
        
        // 헬스체크 수행
        const result = await checker(infrastructure);
        const endTime = Date.now();
        
        return {
            infrastructure_id: infrastructure.id,
            health_status: result.status,
            response_time_ms: result.response_time || (endTime - startTime),
            error_message: result.error_message || null,
            metadata: {
                checked_at: new Date().toISOString(),
                service_type: infrastructure.service_type,
                environment: infrastructure.environment,
                details: result.details || {}
            }
        };
    } catch (error) {
        const endTime = Date.now();
        console.error(`❌ 헬스체크 실패: ${infrastructure.service_name}`, error);
        
        return {
            infrastructure_id: infrastructure.id,
            health_status: 'error',
            response_time_ms: endTime - startTime,
            error_message: error.message,
            metadata: {
                checked_at: new Date().toISOString(),
                service_type: infrastructure.service_type,
                environment: infrastructure.environment,
                error_details: {
                    error_code: error.code,
                    error_type: error.name,
                    stack: error.stack
                }
            }
        };
    }
}

/**
 * 여러 인프라 병렬 헬스체크
 * @param {Array} infrastructures - 인프라 목록
 * @returns {Array} - 헬스체크 결과 목록
 */
async function performBulkHealthCheck(infrastructures) {
    console.log(`🔍 대량 헬스체크 시작: ${infrastructures.length}개 인프라`);
    
    const promises = infrastructures.map(infrastructure => 
        performHealthCheck(infrastructure).catch(error => ({
            infrastructure_id: infrastructure.id,
            health_status: 'error',
            error_message: error.message,
            response_time_ms: 0,
            metadata: {
                checked_at: new Date().toISOString(),
                error_details: { error: error.message }
            }
        }))
    );
    
    const results = await Promise.all(promises);
    console.log(`✅ 대량 헬스체크 완료: ${results.length}개 결과`);
    
    return results;
}

/**
 * 헬스체크 결과 분석
 * @param {Array} healthResults - 헬스체크 결과 목록
 * @returns {Object} - 분석 결과
 */
function analyzeHealthResults(healthResults) {
    const total = healthResults.length;
    const healthy = healthResults.filter(r => r.health_status === 'healthy').length;
    const warning = healthResults.filter(r => r.health_status === 'warning').length;
    const error = healthResults.filter(r => r.health_status === 'error').length;
    
    const avgResponseTime = healthResults.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / total;
    
    return {
        total,
        healthy,
        warning,
        error,
        health_percentage: Math.round((healthy / total) * 100),
        avg_response_time_ms: Math.round(avgResponseTime),
        status_distribution: {
            healthy: Math.round((healthy / total) * 100),
            warning: Math.round((warning / total) * 100),
            error: Math.round((error / total) * 100)
        },
        critical_services: healthResults
            .filter(r => r.health_status === 'error')
            .map(r => ({
                infrastructure_id: r.infrastructure_id,
                error_message: r.error_message
            }))
    };
}

/**
 * 헬스체크 스케줄러 (주기적 실행)
 */
class HealthCheckScheduler {
    constructor(db) {
        this.db = db;
        this.isRunning = false;
        this.interval = null;
        this.checkInterval = 5 * 60 * 1000; // 5분마다
    }
    
    /**
     * 스케줄러 시작
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ 헬스체크 스케줄러가 이미 실행 중입니다.');
            return;
        }
        
        console.log('🚀 헬스체크 스케줄러 시작');
        this.isRunning = true;
        
        // 즉시 한 번 실행
        this.runHealthCheck();
        
        // 주기적 실행 설정
        this.interval = setInterval(() => {
            this.runHealthCheck();
        }, this.checkInterval);
    }
    
    /**
     * 스케줄러 중지
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ 헬스체크 스케줄러가 실행 중이 아닙니다.');
            return;
        }
        
        console.log('🛑 헬스체크 스케줄러 중지');
        this.isRunning = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    
    /**
     * 헬스체크 실행
     */
    async runHealthCheck() {
        try {
            console.log('🔍 정기 헬스체크 시작...');
            
            // 활성 인프라 목록 조회
            const result = await this.db.query(`
                SELECT id, service_type, service_name, service_url, health_check_url, environment
                FROM deployment_infrastructure 
                WHERE status = 'active'
                ORDER BY service_type, environment
            `);
            
            if (result.rows.length === 0) {
                console.log('📭 헬스체크할 활성 인프라가 없습니다.');
                return;
            }
            
            // 헬스체크 수행
            const healthResults = await performBulkHealthCheck(result.rows);
            
            // 결과를 데이터베이스에 저장
            for (const healthResult of healthResults) {
                // 인프라 상태 업데이트
                await this.db.query(`
                    UPDATE deployment_infrastructure 
                    SET health_status = $1, last_health_check = NOW()
                    WHERE id = $2
                `, [healthResult.health_status, healthResult.infrastructure_id]);
                
                // 헬스체크 히스토리 저장
                await this.db.query(`
                    INSERT INTO infrastructure_health_history 
                    (infrastructure_id, health_status, response_time_ms, error_message, metadata)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    healthResult.infrastructure_id,
                    healthResult.health_status,
                    healthResult.response_time_ms,
                    healthResult.error_message,
                    healthResult.metadata
                ]);
            }
            
            // 결과 분석
            const analysis = analyzeHealthResults(healthResults);
            console.log('📊 헬스체크 결과:', {
                total: analysis.total,
                healthy: analysis.healthy,
                warning: analysis.warning,
                error: analysis.error,
                health_percentage: analysis.health_percentage
            });
            
            // 중요한 서비스 오류 알림
            if (analysis.critical_services.length > 0) {
                console.warn('🚨 중요 서비스 오류 감지:', analysis.critical_services);
                // TODO: 알림 시스템 연동
            }
            
        } catch (error) {
            console.error('❌ 정기 헬스체크 실패:', error);
        }
    }
}

module.exports = {
    performHealthCheck,
    performBulkHealthCheck,
    analyzeHealthResults,
    HealthCheckScheduler
};
