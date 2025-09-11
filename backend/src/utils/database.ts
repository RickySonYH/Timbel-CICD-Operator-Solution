// [advice from AI] 간단하고 견고한 PostgreSQL 연결 관리

import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

// 데이터베이스 연결 풀
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'timbel_db',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export class Database {
  // [advice from AI] 쿼리 실행
  static async query(text: string, params?: any[]): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query error:', { query: text, error });
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 트랜잭션 실행
  static async transaction(callback: (client: PoolClient) => Promise<any>): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 연결 테스트
  static async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      logger.info('Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      return false;
    }
  }

  // [advice from AI] 연결 종료
  static async close(): Promise<void> {
    await pool.end();
  }
}
