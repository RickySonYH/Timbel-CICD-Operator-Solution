// [advice from AI] 프로덕션 레벨 데이터베이스 연결 풀 최적화
// 연결 풀링, 쿼리 최적화, 트랜잭션 관리, 장애 복구

const { Pool } = require('pg');
const systemLogger = require('../middleware/systemLogger');

class DatabaseManager {
  constructor() {
    this.pools = new Map();
    this.config = {
      // [advice from AI] 연결 풀 설정 (프로덕션 최적화)
      poolConfig: {
        // 연결 수 설정
        min: parseInt(process.env.DB_POOL_MIN || '5'),      // 최소 연결 수
        max: parseInt(process.env.DB_POOL_MAX || '20'),     // 최대 연결 수
        
        // 타임아웃 설정
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'), // 30초
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'),           // 10분
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),      // 1분
        
        // 연결 검증
        allowExitOnIdle: false,
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '300000'),      // 5분
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),               // 1분
        
        // 연결 유지
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        
        // SSL 설정
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false
      },
      
      // [advice from AI] 데이터베이스별 설정
      databases: {
        knowledge: {
          user: process.env.DB_USER || 'timbel_user',
          host: process.env.DB_HOST || 'postgres',
          database: 'timbel_knowledge',
          password: process.env.DB_PASSWORD || 'timbel_password',
          port: parseInt(process.env.DB_PORT || '5432'),
        },
        operations: {
          user: process.env.DB_USER || 'timbel_user',
          host: process.env.DB_HOST || 'postgres',
          database: 'timbel_cicd_operator',
          password: process.env.DB_PASSWORD || 'timbel_password',
          port: parseInt(process.env.DB_PORT || '5432'),
        }
      },
      
      // [advice from AI] 성능 모니터링 설정
      monitoring: {
        enabled: true,
        slowQueryThreshold: 5000, // 5초 이상 쿼리를 느린 쿼리로 분류
        logQueries: process.env.NODE_ENV === 'development',
        metricsInterval: 60000 // 1분마다 메트릭 수집
      }
    };
    
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      averageQueryTime: 0
    };
    
    this.initializePools();
    this.startMonitoring();
  }

  // [advice from AI] 연결 풀 초기화
  initializePools() {
    Object.entries(this.config.databases).forEach(([name, dbConfig]) => {
      const poolConfig = {
        ...dbConfig,
        ...this.config.poolConfig
      };
      
      const pool = new Pool(poolConfig);
      
      // [advice from AI] 연결 풀 이벤트 핸들러
      pool.on('connect', (client) => {
        console.log(`✅ ${name} DB 연결 생성: ${client.processID}`);
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
      });
      
      pool.on('acquire', (client) => {
        const pid = client && client.processID ? client.processID : 'unknown';
        console.log(`🔗 ${name} DB 연결 획득: ${pid}`);
        this.metrics.activeConnections++;
        this.metrics.idleConnections--;
      });
      
      pool.on('release', (client) => {
        const pid = client && client.processID ? client.processID : 'unknown';
        console.log(`🔓 ${name} DB 연결 해제: ${pid}`);
        this.metrics.activeConnections--;
        this.metrics.idleConnections++;
      });
      
      pool.on('remove', (client) => {
        const pid = client && client.processID ? client.processID : 'unknown';
        console.log(`❌ ${name} DB 연결 제거: ${pid}`);
        this.metrics.totalConnections--;
      });
      
      pool.on('error', (err, client) => {
        console.error(`❌ ${name} DB 연결 오류:`, err);
        this.metrics.errors++;
      });
      
      this.pools.set(name, pool);
      console.log(`🗄️ ${name} 데이터베이스 연결 풀 초기화 완료`);
    });
  }

  // [advice from AI] 연결 풀 조회
  getPool(name = 'operations') {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`데이터베이스 풀 '${name}'을 찾을 수 없습니다.`);
    }
    return pool;
  }

  // [advice from AI] 최적화된 쿼리 실행
  async query(sql, params = [], poolName = 'operations', options = {}) {
    const startTime = Date.now();
    const pool = this.getPool(poolName);
    
    try {
      // [advice from AI] 쿼리 로깅 (개발 환경)
      if (this.config.monitoring.logQueries) {
        console.log(`🔍 SQL 실행 [${poolName}]:`, sql.replace(/\s+/g, ' ').trim());
        if (params.length > 0) {
          console.log('📝 매개변수:', params);
        }
      }
      
      const result = await pool.query(sql, params);
      const duration = Date.now() - startTime;
      
      // [advice from AI] 성능 메트릭 업데이트
      this.updateQueryMetrics(duration, false);
      
      // [advice from AI] 느린 쿼리 감지
      if (duration > this.config.monitoring.slowQueryThreshold) {
        console.warn(`🐌 느린 쿼리 감지 [${poolName}]: ${duration}ms`);
        console.warn('SQL:', sql.replace(/\s+/g, ' ').trim());
        this.metrics.slowQueries++;
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, true);
      
      console.error(`❌ SQL 실행 오류 [${poolName}]:`, error.message);
      console.error('SQL:', sql.replace(/\s+/g, ' ').trim());
      
      throw error;
    }
  }

  // [advice from AI] 트랜잭션 실행
  async transaction(callback, poolName = 'operations') {
    const pool = this.getPool(poolName);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log(`🔄 트랜잭션 시작 [${poolName}]`);
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      console.log(`✅ 트랜잭션 커밋 [${poolName}]`);
      
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ 트랜잭션 롤백 [${poolName}]:`, error.message);
      throw error;
      
    } finally {
      client.release();
    }
  }

  // [advice from AI] 배치 쿼리 실행
  async batchQuery(queries, poolName = 'operations') {
    const pool = this.getPool(poolName);
    const results = [];
    
    console.log(`📦 배치 쿼리 실행 [${poolName}]: ${queries.length}개`);
    
    for (let i = 0; i < queries.length; i++) {
      const { sql, params = [] } = queries[i];
      try {
        const result = await this.query(sql, params, poolName);
        results.push({ success: true, result, index: i });
      } catch (error) {
        results.push({ success: false, error: error.message, index: i });
      }
    }
    
    return results;
  }

  // [advice from AI] 연결 상태 확인
  async healthCheck(poolName = 'operations') {
    try {
      const pool = this.getPool(poolName);
      const result = await pool.query('SELECT NOW() as current_time, version() as version');
      
      return {
        healthy: true,
        database: poolName,
        timestamp: result.rows[0].current_time,
        version: result.rows[0].version,
        poolStats: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      };
      
    } catch (error) {
      return {
        healthy: false,
        database: poolName,
        error: error.message
      };
    }
  }

  // [advice from AI] 쿼리 메트릭 업데이트
  updateQueryMetrics(duration, isError) {
    this.metrics.totalQueries++;
    
    if (isError) {
      this.metrics.errors++;
    }
    
    // [advice from AI] 평균 쿼리 시간 계산 (이동 평균)
    const alpha = 0.1;
    this.metrics.averageQueryTime = 
      (1 - alpha) * this.metrics.averageQueryTime + 
      alpha * duration;
  }

  // [advice from AI] 성능 모니터링 시작
  startMonitoring() {
    if (!this.config.monitoring.enabled) return;
    
    setInterval(() => {
      this.pools.forEach((pool, name) => {
        const stats = {
          database: name,
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
          totalQueries: this.metrics.totalQueries,
          slowQueries: this.metrics.slowQueries,
          errors: this.metrics.errors,
          averageQueryTime: Math.round(this.metrics.averageQueryTime)
        };
        
        console.log(`📊 DB 성능 메트릭 [${name}]:`, stats);
        
        // [advice from AI] 경고 조건 체크
        if (pool.waitingCount > 5) {
          console.warn(`⚠️ ${name} DB 대기 클라이언트 과다: ${pool.waitingCount}개`);
        }
        
        if (this.metrics.averageQueryTime > 1000) {
          console.warn(`⚠️ ${name} DB 평균 쿼리 시간 과다: ${this.metrics.averageQueryTime.toFixed(2)}ms`);
        }
      });
    }, this.config.monitoring.metricsInterval);
  }

  // [advice from AI] 연결 풀 통계 조회
  getPoolStats() {
    const stats = {};
    
    this.pools.forEach((pool, name) => {
      stats[name] = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount,
        config: {
          min: pool.options.min,
          max: pool.options.max,
          connectionTimeoutMillis: pool.options.connectionTimeoutMillis,
          idleTimeoutMillis: pool.options.idleTimeoutMillis
        }
      };
    });
    
    return {
      pools: stats,
      metrics: this.metrics,
      uptime: process.uptime()
    };
  }

  // [advice from AI] 연결 풀 정리
  async close() {
    console.log('🔚 데이터베이스 연결 풀 종료 중...');
    
    const closePromises = Array.from(this.pools.entries()).map(([name, pool]) => {
      console.log(`🔚 ${name} 연결 풀 종료`);
      return pool.end();
    });
    
    await Promise.all(closePromises);
    console.log('✅ 모든 데이터베이스 연결 풀 종료 완료');
  }

  // [advice from AI] 쿼리 빌더 헬퍼 (간단한 버전)
  buildSelectQuery(table, columns = '*', where = {}, options = {}) {
    let sql = `SELECT ${Array.isArray(columns) ? columns.join(', ') : columns} FROM ${table}`;
    const params = [];
    let paramIndex = 1;
    
    // WHERE 절 구성
    if (Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = $${paramIndex++}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // ORDER BY 절
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
      if (options.orderDirection) {
        sql += ` ${options.orderDirection}`;
      }
    }
    
    // LIMIT 절
    if (options.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    
    // OFFSET 절
    if (options.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }
    
    return { sql, params };
  }
}

// [advice from AI] 싱글톤 인스턴스
const databaseManager = new DatabaseManager();

// [advice from AI] 프로세스 종료 시 연결 풀 정리
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT 신호 수신, 데이터베이스 연결 정리 중...');
  await databaseManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM 신호 수신, 데이터베이스 연결 정리 중...');
  await databaseManager.close();
  process.exit(0);
});

module.exports = {
  databaseManager,
  DatabaseManager,
  knowledgePool: databaseManager.getPool('knowledge'),
  operationsPool: databaseManager.getPool('operations')
};