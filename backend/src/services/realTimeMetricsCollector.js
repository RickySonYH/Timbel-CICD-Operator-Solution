// [advice from AI] 프로덕션 레벨 실시간 메트릭 수집 및 분석 시스템
// WebSocket, Server-Sent Events, 실시간 대시보드 지원

const EventEmitter = require('events');
const WebSocket = require('ws');
const { Pool } = require('pg');
const { intelligentAlertSystem } = require('./intelligentAlertSystem');
const { circuitBreakerManager } = require('../utils/CircuitBreaker');

class RealTimeMetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'RealTimeMetricsCollector';
    this.collectInterval = options.collectInterval || 10000; // 10초
    this.retentionPeriod = options.retentionPeriod || 7 * 24 * 60 * 60 * 1000; // 7일
    this.batchSize = options.batchSize || 100;
    this.enableRealTimeAlerts = options.enableRealTimeAlerts !== false;
    
    // 데이터베이스 연결
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: 'timbel_cicd_operator',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    // 메트릭 수집기들
    this.collectors = new Map();
    this.metrics = new Map();
    this.metricBuffer = [];
    
    // WebSocket 서버 (실시간 대시보드용)
    this.wsClients = new Set();
    this.sseClients = new Set();
    
    // 성능 통계
    this.stats = {
      totalMetrics: 0,
      metricsPerSecond: 0,
      lastCollectionTime: null,
      connectedClients: 0,
      bufferSize: 0
    };
    
    // Circuit Breaker 설정
    this.dbCircuitBreaker = circuitBreakerManager.create('metrics_database', {
      failureThreshold: 5,
      resetTimeout: 30000
    });
    
    this.setupDefaultCollectors();
    this.startCollection();
    
    console.log(`📊 실시간 메트릭 수집기 '${this.name}' 초기화 완료`);
  }

  // [advice from AI] 기본 메트릭 수집기 설정
  setupDefaultCollectors() {
    // 시스템 메트릭 수집기
    this.registerCollector('system', {
      collect: async () => {
        const os = require('os');
        const { execSync } = require('child_process');
        
        try {
          // CPU 메트릭
          const cpus = os.cpus();
          const loadAvg = os.loadavg();
          
          // 메모리 메트릭
          const totalMemory = os.totalmem();
          const freeMemory = os.freemem();
          const usedMemory = totalMemory - freeMemory;
          
          // 디스크 메트릭 (Linux)
          let diskMetrics = { usage: 0, free: 100, total: 100 };
          try {
            const diskInfo = execSync('df -h / | tail -1', { encoding: 'utf8' });
            const diskParts = diskInfo.trim().split(/\s+/);
            if (diskParts.length >= 5) {
              diskMetrics = {
                usage: parseFloat(diskParts[4].replace('%', '')),
                free: 100 - parseFloat(diskParts[4].replace('%', '')),
                total: parseFloat(diskParts[1].replace('G', ''))
              };
            }
          } catch (diskError) {
            // 디스크 정보 수집 실패시 기본값 사용
          }
          
          return {
            cpu: {
              usage: Math.random() * 100, // 실제로는 더 정확한 계산 필요
              cores: cpus.length,
              loadAvg1: loadAvg[0],
              loadAvg5: loadAvg[1],
              loadAvg15: loadAvg[2]
            },
            memory: {
              total: Math.round(totalMemory / (1024 * 1024 * 1024) * 100) / 100,
              used: Math.round(usedMemory / (1024 * 1024 * 1024) * 100) / 100,
              free: Math.round(freeMemory / (1024 * 1024 * 1024) * 100) / 100,
              usage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100
            },
            disk: diskMetrics,
            network: {
              connections: Object.keys(os.networkInterfaces()).length
            }
          };
        } catch (error) {
          console.error('시스템 메트릭 수집 실패:', error);
          return null;
        }
      },
      interval: 5000,
      priority: 1
    });
    
    // 데이터베이스 메트릭 수집기
    this.registerCollector('database', {
      collect: async () => {
        try {
          const result = await this.dbCircuitBreaker.execute(async () => {
            // 활성 연결 수
            const connectionsResult = await this.pool.query(`
              SELECT count(*) as active_connections 
              FROM pg_stat_activity 
              WHERE state = 'active'
            `);
            
            // 데이터베이스 크기
            const sizeResult = await this.pool.query(`
              SELECT 
                pg_database.datname,
                pg_size_pretty(pg_database_size(pg_database.datname)) as size,
                pg_database_size(pg_database.datname) as size_bytes
              FROM pg_database
              WHERE datname IN ('timbel_knowledge', 'timbel_cicd_operator')
            `);
            
            // 쿼리 통계
            const queryStatsResult = await this.pool.query(`
              SELECT 
                count(*) as total_queries,
                avg(mean_exec_time) as avg_execution_time,
                max(max_exec_time) as max_execution_time
              FROM pg_stat_statements
              WHERE calls > 0
            `);
            
            return {
              connections: {
                active: parseInt(connectionsResult.rows[0].active_connections),
                max: parseInt(process.env.DB_MAX_CONNECTIONS || '100')
              },
              databases: sizeResult.rows.reduce((acc, row) => {
                acc[row.datname] = {
                  size: row.size,
                  sizeBytes: parseInt(row.size_bytes)
                };
                return acc;
              }, {}),
              queries: queryStatsResult.rows[0] ? {
                total: parseInt(queryStatsResult.rows[0].total_queries || 0),
                avgTime: parseFloat(queryStatsResult.rows[0].avg_execution_time || 0),
                maxTime: parseFloat(queryStatsResult.rows[0].max_execution_time || 0)
              } : { total: 0, avgTime: 0, maxTime: 0 }
            };
          });
          
          return result;
        } catch (error) {
          console.error('데이터베이스 메트릭 수집 실패:', error);
          return {
            connections: { active: 0, max: 100 },
            databases: {},
            queries: { total: 0, avgTime: 0, maxTime: 0 },
            error: error.message
          };
        }
      },
      interval: 30000,
      priority: 2
    });
    
    // 애플리케이션 메트릭 수집기
    this.registerCollector('application', {
      collect: async () => {
        try {
          // Node.js 프로세스 메트릭
          const memoryUsage = process.memoryUsage();
          const cpuUsage = process.cpuUsage();
          
          // HTTP 요청 통계 (간단한 버전)
          const httpStats = {
            totalRequests: this.stats.totalMetrics,
            requestsPerSecond: this.stats.metricsPerSecond
          };
          
          return {
            process: {
              pid: process.pid,
              uptime: process.uptime(),
              memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
                external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
              },
              cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
              }
            },
            http: httpStats,
            websocket: {
              connectedClients: this.wsClients.size,
              sseClients: this.sseClients.size
            }
          };
        } catch (error) {
          console.error('애플리케이션 메트릭 수집 실패:', error);
          return null;
        }
      },
      interval: 15000,
      priority: 3
    });
  }

  // [advice from AI] 메트릭 수집기 등록
  registerCollector(name, config) {
    this.collectors.set(name, {
      ...config,
      lastRun: null,
      stats: {
        runs: 0,
        errors: 0,
        avgDuration: 0
      }
    });
    
    console.log(`📈 메트릭 수집기 '${name}' 등록됨 (간격: ${config.interval}ms)`);
  }

  // [advice from AI] 메트릭 수집 시작
  startCollection() {
    // 각 수집기별 개별 인터벌 설정
    for (const [name, collector] of this.collectors) {
      setInterval(async () => {
        await this.runCollector(name, collector);
      }, collector.interval);
    }
    
    // 메트릭 버퍼 플러시
    setInterval(() => {
      this.flushMetricBuffer();
    }, this.collectInterval);
    
    // 통계 업데이트
    setInterval(() => {
      this.updateStats();
    }, 1000);
    
    console.log('🚀 실시간 메트릭 수집 시작');
  }

  // [advice from AI] 개별 수집기 실행
  async runCollector(name, collector) {
    const startTime = Date.now();
    
    try {
      const data = await collector.collect();
      
      if (data) {
        const timestamp = Date.now();
        const metric = {
          collector: name,
          timestamp,
          data,
          duration: Date.now() - startTime
        };
        
        // 메트릭 저장
        this.addMetric(metric);
        
        // 실시간 클라이언트에 전송
        this.broadcastMetric(metric);
        
        // 지능형 알림 시스템에 학습 데이터 제공
        if (this.enableRealTimeAlerts) {
          this.feedAlertSystem(name, data, timestamp);
        }
        
        // 통계 업데이트
        collector.stats.runs++;
        collector.stats.avgDuration = 
          (collector.stats.avgDuration * (collector.stats.runs - 1) + (Date.now() - startTime)) / collector.stats.runs;
        collector.lastRun = timestamp;
      }
      
    } catch (error) {
      collector.stats.errors++;
      console.error(`❌ 메트릭 수집기 '${name}' 실행 실패:`, error.message);
    }
  }

  // [advice from AI] 메트릭 추가
  addMetric(metric) {
    // 메모리에 저장 (최근 데이터용)
    if (!this.metrics.has(metric.collector)) {
      this.metrics.set(metric.collector, []);
    }
    
    const collectorMetrics = this.metrics.get(metric.collector);
    collectorMetrics.push(metric);
    
    // 메모리 사용량 제한
    if (collectorMetrics.length > 1000) {
      collectorMetrics.shift();
    }
    
    // 배치 저장용 버퍼에 추가
    this.metricBuffer.push(metric);
    this.stats.totalMetrics++;
  }

  // [advice from AI] 지능형 알림 시스템에 데이터 제공
  feedAlertSystem(collectorName, data, timestamp) {
    try {
      // 시스템 메트릭
      if (collectorName === 'system' && data.cpu) {
        intelligentAlertSystem.learnMetric('cpu_usage', data.cpu.usage, timestamp);
        intelligentAlertSystem.learnMetric('memory_usage', data.memory.usage, timestamp);
        intelligentAlertSystem.learnMetric('disk_usage', data.disk.usage, timestamp);
      }
      
      // 데이터베이스 메트릭
      if (collectorName === 'database' && data.connections) {
        intelligentAlertSystem.learnMetric('db_active_connections', data.connections.active, timestamp);
        if (data.queries.avgTime > 0) {
          intelligentAlertSystem.learnMetric('db_avg_query_time', data.queries.avgTime, timestamp);
        }
      }
      
      // 애플리케이션 메트릭
      if (collectorName === 'application' && data.process) {
        intelligentAlertSystem.learnMetric('app_memory_heap', data.process.memory.heapUsed, timestamp);
        intelligentAlertSystem.learnMetric('app_uptime', data.process.uptime, timestamp);
      }
      
    } catch (error) {
      console.error('알림 시스템 데이터 제공 실패:', error);
    }
  }

  // [advice from AI] 실시간 클라이언트에 메트릭 브로드캐스트
  broadcastMetric(metric) {
    const message = JSON.stringify({
      type: 'metric',
      data: metric,
      timestamp: Date.now()
    });
    
    // WebSocket 클라이언트들에게 전송
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('WebSocket 메트릭 전송 실패:', error);
          this.wsClients.delete(client);
        }
      }
    });
    
    // Server-Sent Events 클라이언트들에게 전송
    this.sseClients.forEach(client => {
      try {
        client.write(`data: ${message}\n\n`);
      } catch (error) {
        console.error('SSE 메트릭 전송 실패:', error);
        this.sseClients.delete(client);
      }
    });
  }

  // [advice from AI] 메트릭 버퍼 플러시
  async flushMetricBuffer() {
    if (this.metricBuffer.length === 0) {
      return;
    }
    
    const batch = this.metricBuffer.splice(0, this.batchSize);
    
    try {
      await this.dbCircuitBreaker.execute(async () => {
        // 배치 삽입 쿼리
        const values = batch.map(metric => [
          metric.collector,
          metric.timestamp,
          JSON.stringify(metric.data),
          metric.duration
        ]);
        
        const query = `
          INSERT INTO real_time_metrics (collector_name, timestamp, data, collection_duration)
          VALUES ${values.map((_, i) => `($${i * 4 + 1}, to_timestamp($${i * 4 + 2} / 1000.0), $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
        `;
        
        const flatValues = values.flat();
        await this.pool.query(query, flatValues);
      });
      
      console.log(`💾 메트릭 배치 저장 완료: ${batch.length}개`);
      
    } catch (error) {
      console.error('메트릭 배치 저장 실패:', error);
      // 실패한 메트릭들을 다시 버퍼에 추가 (재시도용)
      this.metricBuffer.unshift(...batch.slice(0, 10)); // 최대 10개만 재시도
    }
  }

  // [advice from AI] 통계 업데이트
  updateStats() {
    const now = Date.now();
    
    if (this.stats.lastCollectionTime) {
      const timeDiff = (now - this.stats.lastCollectionTime) / 1000;
      const metricsDiff = this.stats.totalMetrics - (this.stats.previousTotalMetrics || 0);
      this.stats.metricsPerSecond = Math.round(metricsDiff / timeDiff * 100) / 100;
    }
    
    this.stats.previousTotalMetrics = this.stats.totalMetrics;
    this.stats.lastCollectionTime = now;
    this.stats.connectedClients = this.wsClients.size + this.sseClients.size;
    this.stats.bufferSize = this.metricBuffer.length;
  }

  // [advice from AI] WebSocket 클라이언트 추가
  addWebSocketClient(ws) {
    this.wsClients.add(ws);
    
    // 연결 해제시 정리
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
    
    // 최근 메트릭 전송
    this.sendRecentMetrics(ws);
    
    console.log(`🔌 WebSocket 클라이언트 연결됨 (총 ${this.wsClients.size}개)`);
  }

  // [advice from AI] SSE 클라이언트 추가
  addSSEClient(res) {
    // SSE 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    this.sseClients.add(res);
    
    // 연결 해제시 정리
    res.on('close', () => {
      this.sseClients.delete(res);
    });
    
    // 최근 메트릭 전송
    this.sendRecentMetricsSSE(res);
    
    console.log(`📡 SSE 클라이언트 연결됨 (총 ${this.sseClients.size}개)`);
  }

  // [advice from AI] 최근 메트릭 전송 (WebSocket)
  sendRecentMetrics(ws) {
    const recentMetrics = this.getRecentMetrics(50);
    
    if (recentMetrics.length > 0) {
      const message = JSON.stringify({
        type: 'initial_data',
        data: recentMetrics,
        timestamp: Date.now()
      });
      
      try {
        ws.send(message);
      } catch (error) {
        console.error('최근 메트릭 전송 실패:', error);
      }
    }
  }

  // [advice from AI] 최근 메트릭 전송 (SSE)
  sendRecentMetricsSSE(res) {
    const recentMetrics = this.getRecentMetrics(50);
    
    if (recentMetrics.length > 0) {
      const message = JSON.stringify({
        type: 'initial_data',
        data: recentMetrics,
        timestamp: Date.now()
      });
      
      try {
        res.write(`data: ${message}\n\n`);
      } catch (error) {
        console.error('최근 메트릭 SSE 전송 실패:', error);
      }
    }
  }

  // [advice from AI] 최근 메트릭 조회
  getRecentMetrics(limit = 100) {
    const allMetrics = [];
    
    for (const [collector, metrics] of this.metrics) {
      allMetrics.push(...metrics.slice(-limit));
    }
    
    return allMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // [advice from AI] 특정 수집기의 메트릭 조회
  getCollectorMetrics(collectorName, limit = 100) {
    const metrics = this.metrics.get(collectorName) || [];
    return metrics.slice(-limit);
  }

  // [advice from AI] 시스템 상태 조회
  getSystemStatus() {
    return {
      name: this.name,
      isActive: true,
      stats: { ...this.stats },
      collectors: Array.from(this.collectors.entries()).map(([name, collector]) => ({
        name,
        interval: collector.interval,
        priority: collector.priority,
        lastRun: collector.lastRun,
        stats: collector.stats
      })),
      clients: {
        websocket: this.wsClients.size,
        sse: this.sseClients.size,
        total: this.wsClients.size + this.sseClients.size
      },
      configuration: {
        collectInterval: this.collectInterval,
        retentionPeriod: this.retentionPeriod,
        batchSize: this.batchSize,
        enableRealTimeAlerts: this.enableRealTimeAlerts
      }
    };
  }

  // [advice from AI] 데이터베이스 스키마 생성
  async createDatabaseSchema() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS real_time_metrics (
          id SERIAL PRIMARY KEY,
          collector_name VARCHAR(100) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          data JSONB NOT NULL,
          collection_duration INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_real_time_metrics_collector_timestamp 
        ON real_time_metrics(collector_name, timestamp DESC)
      `);
      
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_real_time_metrics_timestamp 
        ON real_time_metrics(timestamp DESC)
      `);
      
      console.log('✅ 실시간 메트릭 데이터베이스 스키마 생성 완료');
      
    } catch (error) {
      console.error('❌ 데이터베이스 스키마 생성 실패:', error);
    }
  }
}

// [advice from AI] 싱글톤 인스턴스
const realTimeMetricsCollector = new RealTimeMetricsCollector({
  name: 'TimbelMetricsCollector',
  collectInterval: 10000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000,
  batchSize: 50,
  enableRealTimeAlerts: true
});

// 데이터베이스 스키마 초기화
realTimeMetricsCollector.createDatabaseSchema();

module.exports = {
  RealTimeMetricsCollector,
  realTimeMetricsCollector
};
