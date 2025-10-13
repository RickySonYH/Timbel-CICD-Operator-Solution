// [advice from AI] 운영 도구 센터 - 기존 AutoDeployPage, ServiceConfigPage, MultiTenantPage를 통합
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import BackstageCard from '../../components/layout/BackstageCard';
import AutoDeployment from '../../components/operations/AutoDeployment';
import ServiceConfiguration from '../../components/operations/ServiceConfiguration';
import MultiTenantDeployment from '../../components/operations/MultiTenantDeployment';

// [advice from AI] 배포 마법사 컴포넌트 (기존 기능 유지)
const DeploymentWizard: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        배포 마법사
      </Typography>
      <Alert severity="info">
        배포 마법사 기능은 기존 DeploymentWizard 컴포넌트를 확장하여 구현됩니다.
      </Alert>
      {/* 기존 배포 마법사 기능을 여기에 통합 */}
    </Box>
  );
};

// [advice from AI] 운영 설정 컴포넌트 (기존 기능 유지)
const OperationsSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        운영 설정
      </Typography>
      <Alert severity="info">
        운영 설정 기능은 기존 운영 도구들의 설정 기능을 통합하여 구현됩니다.
      </Alert>
      {/* 기존 운영 설정 기능을 여기에 통합 */}
    </Box>
  );
};

const OperationsToolsCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 탭 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <AutoDeployment />; // 기존 AutoDeployment 그대로 사용
      case 1:
        return <ServiceConfiguration />; // 기존 ServiceConfiguration 그대로 사용
      case 2:
        return <MultiTenantDeployment />; // 기존 MultiTenantDeployment 그대로 사용
      case 3:
        return <DeploymentWizard />;
      case 4:
        return <OperationsSettings />;
      default:
        return <AutoDeployment />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 운영 도구 센터 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          운영 도구 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 운영 도구 및 배포 관리
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            label="자동 배포" 
            iconPosition="start"
          />
          <Tab 
            label="서비스 설정" 
            iconPosition="start"
          />
          <Tab 
            label="멀티테넌트 관리" 
            iconPosition="start"
          />
          <Tab 
            label="배포 마법사" 
            iconPosition="start"
          />
          <Tab 
            label="운영 설정" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* [advice from AI] 탭 콘텐츠 렌더링 */}
      {renderTabContent()}
    </Box>
  );
};

export default OperationsToolsCenter;
