// [advice from AI] Timbel 플랫폼 메인 서버
// 설계서의 Node.js 20+ + Express + TypeScript 구성

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
// [advice from AI] axios import - 타입 오류 해결
// @ts-ignore
import axios from 'axios';
import { Database } from './utils/database';

// 라우터 임포트
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organization';
import catalogRoutes from './routes/catalog';

// 미들웨어 임포트
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// [advice from AI] 보안 미들웨어 설정
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// [advice from AI] Rate limiting 설정
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP'
});
app.use(limiter);

// 기본 미들웨어
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true }));

// [advice from AI] 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// [advice from AI] RDC API 프록시 엔드포인트
app.post('/api/proxy/rdc-calculate', async (req, res) => {
  try {
    const requestData = req.body;
    
    if (!requestData) {
      return res.status(400).json({ error: 'Request data is required' });
    }

    logger.info('RDC API 호출:', requestData);

    const response = await axios.post('http://rdc.rickyson.com:5001/api/calculate', requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30초 타임아웃
    });

    logger.info('RDC API 응답 성공');
    res.json(response.data);
  } catch (error: unknown) {
    logger.error('RDC API proxy error:', error);
    
    // @ts-ignore
    if (axios.isAxiosError && axios.isAxiosError(error)) {
      return res.status(500).json({ 
        error: 'Failed to call RDC API',
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to call RDC API',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// [advice from AI] API 라우터 설정
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/catalog', catalogRoutes);

// 에러 핸들링
app.use(errorHandler);

// [advice from AI] 데이터베이스 연결 및 서버 시작
async function startServer() {
  try {
    const isConnected = await Database.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    
    app.listen(PORT, () => {
      logger.info(`🚀 Timbel 플랫폼 서버가 포트 ${PORT}에서 실행 중입니다`);
      logger.info(`📊 환경: ${process.env.NODE_ENV}`);
      logger.info(`🔗 헬스체크: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await Database.close();
  process.exit(0);
});

startServer();
