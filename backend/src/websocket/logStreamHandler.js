// [advice from AI] WebSocket 로그 스트리밍 핸들러

const { getLogStreamService } = require('../services/logStreamService');

/**
 * WebSocket 로그 스트리밍 핸들러 설정
 * @param {WebSocketServer} wss - WebSocket 서버
 */
function setupLogStreamHandler(wss) {
  const logStreamService = getLogStreamService();
  
  console.log('📡 WebSocket 로그 스트리밍 핸들러 초기화');
  
  wss.on('connection', (ws, req) => {
    console.log(`🔌 WebSocket 연결됨: ${req.socket.remoteAddress}`);
    
    // 클라이언트별 구독 정보
    const subscriptions = new Set();
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 WebSocket 메시지:', data);
        
        switch (data.type) {
          case 'subscribe':
            // 스트림 구독
            const { streamId } = data;
            
            if (!streamId) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'streamId is required'
              }));
              return;
            }
            
            logStreamService.subscribe(ws, streamId);
            subscriptions.add(streamId);
            
            ws.send(JSON.stringify({
              type: 'subscribed',
              streamId,
              timestamp: new Date().toISOString()
            }));
            
            console.log(`✅ 구독 완료: ${streamId}`);
            break;
            
          case 'unsubscribe':
            // 스트림 구독 취소
            const { streamId: unsubStreamId } = data;
            
            if (subscriptions.has(unsubStreamId)) {
              logStreamService.unsubscribe(ws, unsubStreamId);
              subscriptions.delete(unsubStreamId);
              
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                streamId: unsubStreamId,
                timestamp: new Date().toISOString()
              }));
              
              console.log(`❌ 구독 취소: ${unsubStreamId}`);
            }
            break;
            
          case 'start-jenkins-stream':
            // Jenkins 빌드 로그 스트리밍 시작
            const { streamId: jenkinsStreamId, jobName, buildNumber } = data;
            
            if (!jenkinsStreamId || !jobName || !buildNumber) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'streamId, jobName, buildNumber are required'
              }));
              return;
            }
            
            // 자동 구독
            logStreamService.subscribe(ws, jenkinsStreamId);
            subscriptions.add(jenkinsStreamId);
            
            // 스트리밍 시작
            logStreamService.streamJenkinsBuildLogs(jenkinsStreamId, jobName, buildNumber);
            
            ws.send(JSON.stringify({
              type: 'stream-started',
              streamId: jenkinsStreamId,
              source: 'jenkins',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'start-k8s-stream':
            // Kubernetes Pod 로그 스트리밍 시작
            const { streamId: k8sStreamId, namespace, podName } = data;
            
            if (!k8sStreamId || !namespace || !podName) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'streamId, namespace, podName are required'
              }));
              return;
            }
            
            // 자동 구독
            logStreamService.subscribe(ws, k8sStreamId);
            subscriptions.add(k8sStreamId);
            
            // 스트리밍 시작
            logStreamService.streamKubernetesPodLogs(k8sStreamId, namespace, podName);
            
            ws.send(JSON.stringify({
              type: 'stream-started',
              streamId: k8sStreamId,
              source: 'kubernetes',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'start-pipeline-stream':
            // 파이프라인 실행 로그 스트리밍 시작
            const { streamId: pipelineStreamId, pipelineId, runId } = data;
            
            if (!pipelineStreamId || !pipelineId || !runId) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'streamId, pipelineId, runId are required'
              }));
              return;
            }
            
            // 자동 구독
            logStreamService.subscribe(ws, pipelineStreamId);
            subscriptions.add(pipelineStreamId);
            
            // 스트리밍 시작
            logStreamService.streamPipelineExecutionLogs(pipelineStreamId, pipelineId, runId);
            
            ws.send(JSON.stringify({
              type: 'stream-started',
              streamId: pipelineStreamId,
              source: 'pipeline',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'stop-stream':
            // 스트리밍 중지
            const { streamId: stopStreamId } = data;
            
            if (stopStreamId) {
              logStreamService.stopStream(stopStreamId);
              
              ws.send(JSON.stringify({
                type: 'stream-stopped',
                streamId: stopStreamId,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          case 'ping':
            // Ping-Pong (연결 유지)
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'list-streams':
            // 활성 스트림 목록 조회
            const activeStreams = logStreamService.getActiveStreams();
            
            ws.send(JSON.stringify({
              type: 'stream-list',
              streams: activeStreams,
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${data.type}`
            }));
        }
        
      } catch (error) {
        console.error('❌ WebSocket 메시지 처리 오류:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket 연결 종료');
      
      // 모든 구독 취소
      subscriptions.forEach(streamId => {
        logStreamService.unsubscribe(ws, streamId);
      });
      
      subscriptions.clear();
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket 오류:', error);
    });
    
    // 연결 확인 메시지
    ws.send(JSON.stringify({
      type: 'connected',
      message: '로그 스트리밍 서버에 연결되었습니다',
      timestamp: new Date().toISOString()
    }));
  });
  
  console.log('✅ WebSocket 로그 스트리밍 핸들러 설정 완료');
}

module.exports = { setupLogStreamHandler };

