// [advice from AI] 데이터베이스 연결 설정
const { Pool } = require('pg');

// [advice from AI] PostgreSQL 연결 풀 생성
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
  connectionTimeoutMillis: 2000, // 연결 타임아웃
});

// [advice from AI] 연결 풀 이벤트 리스너
pool.on('connect', () => {
  console.log('🔗 데이터베이스 연결됨');
});

pool.on('error', (err) => {
  console.error('💥 데이터베이스 연결 오류:', err);
});

module.exports = pool;
