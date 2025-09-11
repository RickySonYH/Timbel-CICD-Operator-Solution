// [advice from AI] CORS 프록시 서버 - RDC API 호출용
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3003;

// [advice from AI] CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// [advice from AI] JSON 파싱 미들웨어
app.use(express.json());

// [advice from AI] RDC API 프록시 엔드포인트
app.post('/api/calculate', async (req, res) => {
  try {
    console.log('RDC API 프록시 요청:', req.body);
    
    const response = await axios.post('http://rdc.rickyson.com:5001/api/calculate', req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    
    console.log('RDC API 응답 성공:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('RDC API 프록시 오류:', error.message);
    res.status(500).json({ 
      error: 'RDC API 호출 실패', 
      message: error.message 
    });
  }
});

// [advice from AI] 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'RDC API Proxy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RDC API 프록시 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`🌐 외부 접속: http://112.153.187.162:${PORT}`);
});
