// [advice from AI] 지식 등록 및 관리 메인 페이지
// 지식 등록 및 관리의 진입점 역할

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const KnowledgeManagement: React.FC = () => {
  const navigate = useNavigate();

  // 지식 관리 대시보드로 리다이렉트
  React.useEffect(() => {
    navigate('/knowledge/dashboard', { replace: true });
  }, [navigate]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        지식 등록 및 관리
      </Typography>
      <Typography variant="body1" color="text.secondary">
        지식 관리 대시보드로 이동 중...
      </Typography>
    </Box>
  );
};

export default KnowledgeManagement;
