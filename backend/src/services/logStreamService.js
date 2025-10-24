// [advice from AI] 실시간 로그 스트리밍 서비스 - WebSocket 기반
// 파이프라인 실행, 빌드, 배포 로그를 실시간으로 스트리밍

const EventEmitter = require('events');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class LogStreamService extends EventEmitter {
  constructor() {
    super();
    
    // 활성 스트림 관리
    this.activeStreams = new Map(); // streamId -> streamInfo
    this.subscribers = new Map(); // streamId -> Set of websocket connections
    
    // 로그 버퍼 (최근 로그 저장)
    this.logBuffers = new Map(); // streamId -> Array of log lines
    this.maxBufferSize = 1000; // 최대 1000줄 저장
    
    console.log('📡 LogStreamService 초기화 완료');
  }

  /**
   * WebSocket 연결 등록
   * @param {WebSocket} ws - WebSocket 연결
   * @param {string} streamId - 스트림 ID
   */
  subscribe(ws, streamId) {
    if (!this.subscribers.has(streamId)) {
      this.subscribers.set(streamId, new Set());
    }
    
    this.subscribers.get(streamId).add(ws);
    
    console.log(`✅ 클라이언트 구독: ${streamId}, 총 ${this.subscribers.get(streamId).size}명`);
    
    // 버퍼에 있는 기존 로그 전송
    if (this.logBuffers.has(streamId)) {
      const bufferedLogs = this.logBuffers.get(streamId);
      ws.send(JSON.stringify({
        type: 'log-history',
        streamId,
        logs: bufferedLogs,
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * WebSocket 연결 해제
   * @param {WebSocket} ws - WebSocket 연결
   * @param {string} streamId - 스트림 ID
   */
  unsubscribe(ws, streamId) {
    if (this.subscribers.has(streamId)) {
      this.subscribers.get(streamId).delete(ws);
      
      console.log(`❌ 클라이언트 구독 취소: ${streamId}, 남은 ${this.subscribers.get(streamId).size}명`);
      
      // 구독자가 없으면 정리
      if (this.subscribers.get(streamId).size === 0) {
        this.subscribers.delete(streamId);
        console.log(`🧹 스트림 구독자 0명, 정리: ${streamId}`);
      }
    }
  }

  /**
   * 로그 메시지 브로드캐스트
   * @param {string} streamId - 스트림 ID
   * @param {Object} logData - 로그 데이터
   */
  broadcast(streamId, logData) {
    // 버퍼에 저장
    if (!this.logBuffers.has(streamId)) {
      this.logBuffers.set(streamId, []);
    }
    
    const buffer = this.logBuffers.get(streamId);
    buffer.push(logData);
    
    // 버퍼 크기 제한
    if (buffer.length > this.maxBufferSize) {
      buffer.shift();
    }
    
    // 구독자들에게 전송
    if (this.subscribers.has(streamId)) {
      const message = JSON.stringify({
        type: 'log',
        streamId,
        data: logData,
        timestamp: new Date().toISOString()
      });
      
      this.subscribers.get(streamId).forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      });
    }
  }

  /**
   * Jenkins 빌드 로그 스트리밍
   * @param {string} streamId - 스트림 ID
   * @param {string} jobName - Jenkins Job 이름
   * @param {number} buildNumber - 빌드 번호
   */
  async streamJenkinsBuildLogs(streamId, jobName, buildNumber) {
    try {
      const jenkinsURL = process.env.JENKINS_URL || 'http://jenkins:8080';
      const jenkinsUser = process.env.JENKINS_USERNAME || 'admin';
      const jenkinsToken = process.env.JENKINS_API_TOKEN || '';
      
      console.log(`📡 Jenkins 로그 스트리밍 시작: ${jobName} #${buildNumber}`);
      
      this.activeStreams.set(streamId, {
        type: 'jenkins',
        jobName,
        buildNumber,
        startedAt: new Date().toISOString()
      });
      
      // Jenkins 로그 폴링 (실시간 스트리밍)
      const axios = require('axios');
      let offset = 0;
      let isComplete = false;
      
      const pollInterval = setInterval(async () => {
        try {
          const response = await axios.get(
            `${jenkinsURL}/job/${jobName}/${buildNumber}/logText/progressiveText?start=${offset}`,
            {
              auth: {
                username: jenkinsUser,
                password: jenkinsToken
              },
              headers: {
                'X-Text-Size': offset
              },
              timeout: 5000
            }
          );
          
          const newText = response.data;
          const newOffset = parseInt(response.headers['x-text-size'] || offset);
          
          if (newText && newText.length > 0) {
            // 로그를 줄 단위로 분리하여 전송
            const lines = newText.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              this.broadcast(streamId, {
                level: this.detectLogLevel(line),
                message: line,
                timestamp: new Date().toISOString()
              });
            });
            
            offset = newOffset;
          }
          
          // 빌드 완료 확인
          if (response.headers['x-more-data'] === 'false') {
            isComplete = true;
            clearInterval(pollInterval);
            
            this.broadcast(streamId, {
              level: 'info',
              message: '🎉 빌드 완료!',
              timestamp: new Date().toISOString()
            });
            
            this.activeStreams.delete(streamId);
            console.log(`✅ Jenkins 로그 스트리밍 완료: ${streamId}`);
          }
          
        } catch (pollError) {
          console.error('Jenkins 로그 폴링 오류:', pollError.message);
          
          if (pollError.response?.status === 404) {
            clearInterval(pollInterval);
            this.broadcast(streamId, {
              level: 'error',
              message: '❌ 빌드를 찾을 수 없습니다',
              timestamp: new Date().toISOString()
            });
            this.activeStreams.delete(streamId);
          }
        }
      }, 2000); // 2초마다 폴링
      
      // 타임아웃 (30분)
      setTimeout(() => {
        if (!isComplete) {
          clearInterval(pollInterval);
          this.broadcast(streamId, {
            level: 'warn',
            message: '⚠️ 스트리밍 타임아웃 (30분)',
            timestamp: new Date().toISOString()
          });
          this.activeStreams.delete(streamId);
        }
      }, 30 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Jenkins 로그 스트리밍 실패:', error);
      this.broadcast(streamId, {
        level: 'error',
        message: `❌ 로그 스트리밍 오류: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Kubernetes Pod 로그 스트리밍
   * @param {string} streamId - 스트림 ID
   * @param {string} namespace - Namespace
   * @param {string} podName - Pod 이름
   */
  async streamKubernetesPodLogs(streamId, namespace, podName) {
    try {
      console.log(`📡 Kubernetes 로그 스트리밍 시작: ${namespace}/${podName}`);
      
      this.activeStreams.set(streamId, {
        type: 'kubernetes',
        namespace,
        podName,
        startedAt: new Date().toISOString()
      });
      
      // kubectl logs -f 실행
      const kubectlProcess = exec(
        `kubectl logs -f ${podName} -n ${namespace}`,
        { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
      );
      
      kubectlProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          this.broadcast(streamId, {
            level: this.detectLogLevel(line),
            message: line,
            source: 'kubernetes',
            pod: podName,
            namespace,
            timestamp: new Date().toISOString()
          });
        });
      });
      
      kubectlProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        this.broadcast(streamId, {
          level: 'error',
          message: errorMsg,
          source: 'kubernetes',
          timestamp: new Date().toISOString()
        });
      });
      
      kubectlProcess.on('close', (code) => {
        this.broadcast(streamId, {
          level: code === 0 ? 'info' : 'error',
          message: code === 0 ? '✅ 로그 스트리밍 종료' : `❌ kubectl 종료 (코드: ${code})`,
          timestamp: new Date().toISOString()
        });
        this.activeStreams.delete(streamId);
        console.log(`✅ Kubernetes 로그 스트리밍 완료: ${streamId}`);
      });
      
      // streamId와 프로세스 매핑 (나중에 종료할 수 있도록)
      this.activeStreams.get(streamId).process = kubectlProcess;
      
    } catch (error) {
      console.error('❌ Kubernetes 로그 스트리밍 실패:', error);
      this.broadcast(streamId, {
        level: 'error',
        message: `❌ 로그 스트리밍 오류: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * 파이프라인 실행 로그 스트리밍
   * @param {string} streamId - 스트림 ID
   * @param {string} pipelineId - 파이프라인 ID
   * @param {string} runId - 실행 ID
   */
  async streamPipelineExecutionLogs(streamId, pipelineId, runId) {
    try {
      console.log(`📡 파이프라인 로그 스트리밍 시작: ${pipelineId} / ${runId}`);
      
      this.activeStreams.set(streamId, {
        type: 'pipeline',
        pipelineId,
        runId,
        startedAt: new Date().toISOString()
      });
      
      // 시뮬레이션: 실제로는 DB나 파일에서 로그 읽기
      const stages = [
        'Source Checkout',
        'Build Dependencies',
        'Unit Tests',
        'Build Docker Image',
        'Push to Registry',
        'Deploy to Kubernetes'
      ];
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        
        // 스테이지 시작
        this.broadcast(streamId, {
          level: 'info',
          message: `\n🚀 Stage ${i + 1}/${stages.length}: ${stage}`,
          stage: stage,
          timestamp: new Date().toISOString()
        });
        
        // 스테이지 실행 로그 시뮬레이션
        await this.simulateStageExecution(streamId, stage);
        
        // 스테이지 완료
        this.broadcast(streamId, {
          level: 'success',
          message: `✅ ${stage} 완료`,
          stage: stage,
          timestamp: new Date().toISOString()
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 전체 완료
      this.broadcast(streamId, {
        level: 'success',
        message: '\n🎉 파이프라인 실행 성공!',
        timestamp: new Date().toISOString()
      });
      
      this.activeStreams.delete(streamId);
      console.log(`✅ 파이프라인 로그 스트리밍 완료: ${streamId}`);
      
    } catch (error) {
      console.error('❌ 파이프라인 로그 스트리밍 실패:', error);
      this.broadcast(streamId, {
        level: 'error',
        message: `❌ 파이프라인 실행 오류: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * 스테이지 실행 시뮬레이션
   */
  async simulateStageExecution(streamId, stage) {
    const logs = this.getStageSimulationLogs(stage);
    
    for (const log of logs) {
      this.broadcast(streamId, {
        level: log.level || 'info',
        message: log.message,
        stage: stage,
        timestamp: new Date().toISOString()
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * 스테이지별 시뮬레이션 로그
   */
  getStageSimulationLogs(stage) {
    const logMap = {
      'Source Checkout': [
        { message: 'Cloning repository...' },
        { message: 'Checking out branch: main' },
        { message: 'Commit: abc123def456' },
        { message: 'Author: RickySon <ricky@timbel.com>' }
      ],
      'Build Dependencies': [
        { message: 'Installing dependencies...' },
        { message: 'npm install' },
        { message: 'added 1234 packages in 15s' }
      ],
      'Unit Tests': [
        { message: 'Running tests...' },
        { message: 'PASS src/components/Button.test.tsx' },
        { message: 'PASS src/utils/helpers.test.ts' },
        { message: 'Tests: 45 passed, 45 total' }
      ],
      'Build Docker Image': [
        { message: 'Building Docker image...' },
        { message: 'Step 1/8 : FROM node:18-alpine' },
        { message: 'Step 2/8 : WORKDIR /app' },
        { message: 'Successfully built image' }
      ],
      'Push to Registry': [
        { message: 'Pushing to registry...' },
        { message: 'The push refers to repository [harbor.timbel.com/app]' },
        { message: 'latest: digest: sha256:abc123...' }
      ],
      'Deploy to Kubernetes': [
        { message: 'Deploying to Kubernetes...' },
        { message: 'deployment.apps/app configured' },
        { message: 'service/app configured' },
        { message: 'Waiting for rollout to finish...' },
        { level: 'success', message: 'deployment "app" successfully rolled out' }
      ]
    };
    
    return logMap[stage] || [{ message: `Executing ${stage}...` }];
  }

  /**
   * 로그 레벨 감지
   */
  detectLogLevel(logLine) {
    const line = logLine.toLowerCase();
    
    if (line.includes('error') || line.includes('fail') || line.includes('❌')) {
      return 'error';
    } else if (line.includes('warn') || line.includes('warning') || line.includes('⚠️')) {
      return 'warn';
    } else if (line.includes('success') || line.includes('✅') || line.includes('completed')) {
      return 'success';
    } else if (line.includes('debug')) {
      return 'debug';
    } else {
      return 'info';
    }
  }

  /**
   * 스트림 종료
   * @param {string} streamId - 스트림 ID
   */
  stopStream(streamId) {
    if (this.activeStreams.has(streamId)) {
      const stream = this.activeStreams.get(streamId);
      
      // kubectl 프로세스 종료
      if (stream.process) {
        stream.process.kill();
      }
      
      this.broadcast(streamId, {
        level: 'info',
        message: '🛑 스트리밍 중지됨',
        timestamp: new Date().toISOString()
      });
      
      this.activeStreams.delete(streamId);
      console.log(`🛑 스트림 중지: ${streamId}`);
    }
  }

  /**
   * 모든 활성 스트림 조회
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.entries()).map(([streamId, info]) => ({
      streamId,
      ...info,
      subscriberCount: this.subscribers.get(streamId)?.size || 0
    }));
  }

  /**
   * 로그 버퍼 정리
   * @param {string} streamId - 스트림 ID (선택사항, 없으면 전체 정리)
   */
  clearLogBuffer(streamId) {
    if (streamId) {
      this.logBuffers.delete(streamId);
    } else {
      this.logBuffers.clear();
    }
  }
}

// Singleton 인스턴스
let logStreamServiceInstance = null;

function getLogStreamService() {
  if (!logStreamServiceInstance) {
    logStreamServiceInstance = new LogStreamService();
  }
  return logStreamServiceInstance;
}

module.exports = {
  LogStreamService,
  getLogStreamService
};

