// [advice from AI] 테스트 라우트
import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Test route is working!' });
});

export default router;
