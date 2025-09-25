// [advice from AI] CI/CD 파이프라인 전용 페이지
// 기존 OperationsCenter의 탭 구조에서 독립된 페이지로 분리

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CICDPipelineManagement from '../../components/operations/CICDPipelineManagement';

const CICDPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 브레드크럼 네비게이션 */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link 
            color="inherit" 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            sx={{ textDecoration: 'none' }}
          >
            홈
          </Link>
          <Link 
            color="inherit" 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              navigate('/operations');
            }}
            sx={{ textDecoration: 'none' }}
          >
            운영센터
          </Link>
          <Typography color="text.primary">CI/CD 파이프라인</Typography>
        </Breadcrumbs>
      </Box>

      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          CI/CD 파이프라인 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          GitHub → Jenkins → Nexus → Argo CD 전체 파이프라인을 통합 관리합니다.
        </Typography>
      </Box>

      {/* CI/CD 파이프라인 관리 컴포넌트 */}
      <CICDPipelineManagement />
    </Container>
  );
};

export default CICDPage;