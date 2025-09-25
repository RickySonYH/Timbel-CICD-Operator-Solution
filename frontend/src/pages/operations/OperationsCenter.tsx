import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert
} from '@mui/material';
// [advice from AI] 사용자 요청에 따라 아이콘 제거

// 컴포넌트 임포트
import InfrastructureOverview from '../../components/infrastructure/InfrastructureOverview';
import CICDPipelineManagement from '../../components/operations/CICDPipelineManagement';


// 탭 패널 컴포넌트
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`operations-tabpanel-${index}`}
      aria-labelledby={`operations-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const OperationsCenter: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  // 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 헤더 */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          운영 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          배포 인프라 관리 및 운영 모니터링
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="대시보드" 
            id="operations-tab-0"
            aria-controls="operations-tabpanel-0"
          />
          <Tab 
            label="인프라 관리" 
            id="operations-tab-1"
            aria-controls="operations-tabpanel-1"
          />
          <Tab 
            label="CI/CD 파이프라인" 
            id="operations-tab-2"
            aria-controls="operations-tabpanel-2"
          />
          <Tab 
            label="모니터링" 
            id="operations-tab-3"
            aria-controls="operations-tabpanel-3"
            disabled
          />
        </Tabs>
      </Paper>

      {/* 탭 컨텐츠 */}
      
      {/* 대시보드 탭 */}
      <TabPanel value={currentTab} index={0}>
        <Alert severity="info" sx={{ mb: 3 }}>
          운영 센터 대시보드는 개발 중입니다. 현재는 인프라 관리 기능을 이용해주세요.
        </Alert>
        
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography variant="h6" color="text.secondary">
            대시보드 기능 개발 예정
          </Typography>
        </Box>
      </TabPanel>

      {/* 인프라 관리 탭 */}
      <TabPanel value={currentTab} index={1}>
        <InfrastructureOverview />
      </TabPanel>

      {/* CI/CD 파이프라인 탭 */}
      <TabPanel value={currentTab} index={2}>
        <CICDPipelineManagement />
      </TabPanel>

      {/* 모니터링 탭 */}
      <TabPanel value={currentTab} index={3}>
        <Alert severity="info" sx={{ mb: 3 }}>
          모니터링 기능은 개발 중입니다.
        </Alert>
        
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography variant="h6" color="text.secondary">
            모니터링 기능 개발 예정
          </Typography>
        </Box>
      </TabPanel>

    </Container>
  );
};

export default OperationsCenter;