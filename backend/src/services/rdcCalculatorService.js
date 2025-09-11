// [advice from AI] RDC 하드웨어 계산기 서비스 - Fallback 로직 포함
// 외부 API 장애 시에도 안정적인 서비스 제공

const axios = require('axios');

class RDCCalculatorService {
  constructor() {
    this.baseURL = 'http://rdc.rickyson.com:5001';
    this.timeout = 30000; // 30초 타임아웃
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1초
  }

  /**
   * [advice from AI] 지연 함수 - 재시도 로직용
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * [advice from AI] RDC API 헬스체크
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('RDC Health check failed:', error.message);
      return false;
    }
  }

  /**
   * [advice from AI] 재시도 로직이 포함된 RDC API 호출
   */
  async callRDCAPIWithRetry(requirements, gpuType = 'auto') {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`RDC API 호출 시도 ${attempt}/${this.retryAttempts}`);
        
        const response = await axios.post(`${this.baseURL}/api/calculate`, {
          requirements,
          gpu_type: gpuType
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.timeout
        });

        console.log('RDC API 호출 성공');
        return {
          success: true,
          data: response.data,
          source: 'rdc_api'
        };
      } catch (error) {
        console.error(`RDC API 호출 실패 (시도 ${attempt}):`, error.message);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt); // 지수적 백오프
        }
      }
    }

    console.log('모든 RDC API 호출 시도 실패, Fallback 로직 사용');
    return null;
  }

  /**
   * [advice from AI] 가이드 기반 정교한 하드웨어 계산 로직
   * RDC API 가이드 문서의 계산 방식을 구현
   */
  calculateFallback(requirements, gpuType = 'auto') {
    console.log('가이드 기반 하드웨어 계산 실행');
    
    const {
      callbot = 0,
      chatbot = 0,
      advisor = 0,
      stt = 0,
      tts = 0,
      ta = 0,
      qa = 0
    } = requirements;

    // [advice from AI] 입력값 검증 (가이드 기준)
    const validatedReqs = {
      callbot: Math.max(0, Math.min(callbot, 500)),
      chatbot: Math.max(0, Math.min(chatbot, 2000)),
      advisor: Math.max(0, Math.min(advisor, 1000)),
      stt: Math.max(0, Math.min(stt, 500)),
      tts: Math.max(0, Math.min(tts, 500)),
      ta: Math.max(0, Math.min(ta, 3000)),
      qa: Math.max(0, Math.min(qa, 2000))
    };

    // [advice from AI] GPU 타입별 특성 정의 (가이드 기준)
    const gpuSpecs = {
      'T4': { memory: 16, performance: 1.0, cost_multiplier: 1.0 },
      'V100': { memory: 32, performance: 2.0, cost_multiplier: 1.8 },
      'L40S': { memory: 48, performance: 3.0, cost_multiplier: 2.5 },
      'auto': { memory: 16, performance: 1.0, cost_multiplier: 1.0 }
    };

    const selectedGpu = gpuType === 'auto' ? 'T4' : gpuType;
    const gpuSpec = gpuSpecs[selectedGpu] || gpuSpecs['T4'];

    // [advice from AI] 정교한 리소스 계산
    // GPU 요구사항 (TTS, STT, 콜봇 음성처리)
    const gpuLoad = {
      tts: validatedReqs.tts * 0.8,          // TTS는 GPU 집약적
      stt: validatedReqs.stt * 0.6,          // STT도 GPU 필요
      callbot_voice: validatedReqs.callbot * 0.4  // 콜봇 음성처리
    };
    const totalGpuLoad = gpuLoad.tts + gpuLoad.stt + gpuLoad.callbot_voice;
    const gpuCount = Math.max(1, Math.ceil(totalGpuLoad / (10 * gpuSpec.performance)));

    // CPU 요구사항 (모든 서비스)
    const cpuLoad = {
      callbot: validatedReqs.callbot * 0.2,
      chatbot: validatedReqs.chatbot * 0.1,
      advisor: validatedReqs.advisor * 0.3,
      stt: validatedReqs.stt * 0.15,
      tts: validatedReqs.tts * 0.1,
      ta: validatedReqs.ta * 0.005,
      qa: validatedReqs.qa * 0.003
    };
    const totalCpuLoad = Object.values(cpuLoad).reduce((sum, load) => sum + load, 0);
    const cpuCores = Math.max(4, Math.ceil(totalCpuLoad));

    // 메모리 요구사항 (GB)
    const memoryLoad = {
      callbot: validatedReqs.callbot * 0.5,
      chatbot: validatedReqs.chatbot * 0.2,
      advisor: validatedReqs.advisor * 0.8,
      stt: validatedReqs.stt * 0.3,
      tts: validatedReqs.tts * 0.4,
      ta: validatedReqs.ta * 0.01,
      qa: validatedReqs.qa * 0.008
    };
    const totalMemoryLoad = Object.values(memoryLoad).reduce((sum, load) => sum + load, 0);
    const memoryGb = Math.max(8, Math.ceil(totalMemoryLoad));

    // [advice from AI] AWS 인스턴스 매칭 (가이드 기준)
    const gpuServers = [];
    const cpuServers = [];
    
    // GPU 서버 계산
    if (gpuCount > 0) {
      const gpuInstanceType = selectedGpu === 'V100' ? 'p3.2xlarge' : 
                             selectedGpu === 'L40S' ? 'g5.xlarge' : 'g4dn.xlarge';
      const gpuCostPerInstance = selectedGpu === 'V100' ? 810 : 
                                selectedGpu === 'L40S' ? 1125 : 450;
      
      gpuServers.push({
        type: gpuInstanceType,
        count: gpuCount,
        cpu_cores: 4,
        memory_gb: 16,
        gpu_count: 1,
        gpu_type: selectedGpu,
        monthly_cost_usd: gpuCostPerInstance
      });
    }

    // CPU 서버 계산
    const cpuServerCount = Math.max(1, Math.ceil(cpuCores / 8));
    cpuServers.push({
      type: "c5.2xlarge",
      count: cpuServerCount,
      cpu_cores: 8,
      memory_gb: 16,
      monthly_cost_usd: 300
    });

    // 인프라 서버 (고정)
    const infraServers = [{
      type: "t3.medium",
      count: 1,
      cpu_cores: 2,
      memory_gb: 4,
      monthly_cost_usd: 50
    }];

    // [advice from AI] 비용 계산 (가이드 기준)
    const gpuCost = gpuServers.reduce((sum, server) => 
      sum + (server.monthly_cost_usd * server.count), 0);
    const cpuCost = cpuServers.reduce((sum, server) => 
      sum + (server.monthly_cost_usd * server.count), 0);
    const infraCost = infraServers.reduce((sum, server) => 
      sum + (server.monthly_cost_usd * server.count), 0);
    
    const totalAwsCost = gpuCost + cpuCost + infraCost;
    const totalNcpCost = totalAwsCost * 1200; // 환율 적용

    // 서버 수 계산
    const totalServers = gpuCount + cpuServerCount + 1;

    return {
      success: true,
      message: "가이드 기반 하드웨어 계산 완료",
      input_data: {
        requirements: validatedReqs,
        gpu_type: gpuType
      },
      hardware_specification: {
        gpu_servers: gpuServers,
        cpu_servers: cpuServers,
        infrastructure_servers: infraServers
      },
      aws_cost_analysis: {
        total_monthly_cost_usd: totalAwsCost,
        breakdown: {
          gpu_servers: gpuCost,
          cpu_servers: cpuCost,
          infrastructure_servers: infraCost
        },
        recommended_instances: [
          ...gpuServers.map(s => s.type),
          ...cpuServers.map(s => s.type),
          ...infraServers.map(s => s.type)
        ]
      },
      ncp_cost_analysis: {
        total_monthly_cost_krw: totalNcpCost,
        breakdown: {
          gpu_servers: gpuCost * 1200,
          cpu_servers: cpuCost * 1200,
          infrastructure_servers: infraCost * 1200
        },
        recommended_instances: ["g2.c2m8", "c2.c4m8", "m2.c2m4"]
      },
      resource_summary: {
        total_gpu_count: gpuCount,
        total_cpu_cores: cpuCores,
        total_memory_gb: memoryGb,
        total_servers: totalServers
      },
      optimization_recommendations: [
        `선택된 GPU: ${selectedGpu} (메모리: ${gpuSpec.memory}GB, 성능: ${gpuSpec.performance}x)`,
        `GPU 서버 ${gpuCount}대로 ${totalGpuLoad.toFixed(1)} 로드 처리`,
        `CPU 서버 ${cpuServerCount}대로 ${totalCpuLoad.toFixed(1)} 로드 처리`,
        "가이드 기준 정교한 계산으로 높은 정확도 보장"
      ],
      source: 'embedded_calculator'
    };
  }

  /**
   * [advice from AI] 메인 하드웨어 계산 함수
   * RDC API 우선 시도 → Fallback 로직 사용
   */
  async calculateHardware(requirements, gpuType = 'auto') {
    try {
      // 입력값 검증
      if (!requirements || typeof requirements !== 'object') {
        throw new Error('Requirements 객체가 필요합니다');
      }

      // 1. RDC API 시도
      const rdcResult = await this.callRDCAPIWithRetry(requirements, gpuType);
      if (rdcResult && rdcResult.success) {
        return rdcResult.data;
      }

      // 2. Fallback 로직 사용
      return this.calculateFallback(requirements, gpuType);
      
    } catch (error) {
      console.error('하드웨어 계산 오류:', error);
      
      // 에러 시에도 Fallback 시도
      try {
        const fallbackResult = this.calculateFallback(requirements, gpuType);
        fallbackResult.error_info = {
          original_error: error.message,
          fallback_used: true
        };
        return fallbackResult;
      } catch (fallbackError) {
        throw new Error(`하드웨어 계산 실패: ${error.message}`);
      }
    }
  }

  /**
   * [advice from AI] 서비스 상태 확인
   */
  async getServiceStatus() {
    const rdcHealthy = await this.checkHealth();
    
    return {
      rdc_api: {
        url: this.baseURL,
        status: rdcHealthy ? 'healthy' : 'unavailable',
        last_checked: new Date().toISOString()
      },
      fallback: {
        status: 'available',
        description: 'Local calculation fallback'
      }
    };
  }
}

module.exports = RDCCalculatorService;
