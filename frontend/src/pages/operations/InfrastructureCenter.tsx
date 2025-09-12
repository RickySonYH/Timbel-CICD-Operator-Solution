// [advice from AI] 인프라 관리 센터 - 기존 InfrastructurePage와 HardwareCalcPage를 통합
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
import {
  Cloud as CloudIcon,
  Calculate as CalculateIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';
import InfrastructureManagement from '../../components/operations/InfrastructureManagement';
import HardwareCalculator from '../../components/operations/HardwareCalculator';

// [advice from AI] 리소스 관리 컴포넌트 (기존 기능 유지)
const ResourceManagement: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        리소스 관리
      </Typography>
      <Alert severity="info">
        리소스 관리 기능은 기존 InfrastructureManagement의 리소스 관리 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 리소스 관리 기능을 여기에 통합 */}
    </Box>
  );
};

// [advice from AI] 보안 설정 컴포넌트 (기존 기능 유지)
const SecuritySettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        보안 설정
      </Typography>
      <Alert severity="info">
        보안 설정 기능은 기존 InfrastructureManagement의 보안 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 보안 설정 기능을 여기에 통합 */}
    </Box>
  );
};

// [advice from AI] 인프라 설정 컴포넌트 (기존 기능 유지)
const InfrastructureSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        인프라 설정
      </Typography>
      <Alert severity="info">
        인프라 설정 기능은 기존 InfrastructureManagement의 설정 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 인프라 설정 기능을 여기에 통합 */}
    </Box>
  );
};

const InfrastructureCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 탭 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <InfrastructureManagement />; // 기존 InfrastructureManagement 그대로 사용
      case 1:
        return <HardwareCalculator />; // 기존 HardwareCalculator 그대로 사용
      case 2:
        return <ResourceManagement />;
      case 3:
        return <SecuritySettings />;
      case 4:
        return <InfrastructureSettings />;
      default:
        return <InfrastructureManagement />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 인프라 관리 센터 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          인프라 관리 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 인프라 관리 및 하드웨어 계산
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={<CloudIcon />} 
            label="인프라 관리" 
            iconPosition="start"
          />
          <Tab 
            icon={<CalculateIcon />} 
            label="하드웨어 계산" 
            iconPosition="start"
          />
          <Tab 
            icon={<StorageIcon />} 
            label="리소스 관리" 
            iconPosition="start"
          />
          <Tab 
            icon={<SecurityIcon />} 
            label="보안 설정" 
            iconPosition="start"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="인프라 설정" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* [advice from AI] 탭 콘텐츠 렌더링 */}
      {renderTabContent()}
    </Box>
  );
};

export default InfrastructureCenter;
