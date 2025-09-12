// [advice from AI] 모니터링 센터 - 기존 MonitoringDashboard를 기반으로 탭 구조 확장
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
  Dashboard as DashboardIcon,
  Notifications as NotificationsIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';
import MonitoringDashboard from '../../components/operations/MonitoringDashboard';

// [advice from AI] 알림 관리 컴포넌트 (기존 기능 유지)
const AlertManagement: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        알림 관리
      </Typography>
      <Alert severity="info">
        알림 관리 기능은 기존 MonitoringDashboard의 알림 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 알림 기능을 여기에 통합 */}
    </Box>
  );
};

// [advice from AI] 로그 분석 컴포넌트 (기존 기능 유지)
const LogAnalysis: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        로그 분석
      </Typography>
      <Alert severity="info">
        로그 분석 기능은 기존 MonitoringDashboard의 로그 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 로그 기능을 여기에 통합 */}
    </Box>
  );
};

// [advice from AI] 성능 분석 컴포넌트 (기존 기능 유지)
const PerformanceAnalysis: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        성능 분석
      </Typography>
      <Alert severity="info">
        성능 분석 기능은 기존 MonitoringDashboard의 성능 메트릭 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 성능 분석 기능을 여기에 통합 */}
    </Box>
  );
};

// [advice from AI] 모니터링 설정 컴포넌트 (기존 기능 유지)
const MonitoringSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        모니터링 설정
      </Typography>
      <Alert severity="info">
        모니터링 설정 기능은 기존 MonitoringDashboard의 설정 기능을 확장하여 구현됩니다.
      </Alert>
      {/* 기존 설정 기능을 여기에 통합 */}
    </Box>
  );
};

const MonitoringCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 탭 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <MonitoringDashboard />; // 기존 MonitoringDashboard 그대로 사용
      case 1:
        return <AlertManagement />;
      case 2:
        return <LogAnalysis />;
      case 3:
        return <PerformanceAnalysis />;
      case 4:
        return <MonitoringSettings />;
      default:
        return <MonitoringDashboard />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 모니터링 센터 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          모니터링 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ECP-AI K8s Orchestrator 기반 실시간 모니터링 및 분석
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={<DashboardIcon />} 
            label="실시간 모니터링" 
            iconPosition="start"
          />
          <Tab 
            icon={<NotificationsIcon />} 
            label="알림 관리" 
            iconPosition="start"
          />
          <Tab 
            icon={<TimelineIcon />} 
            label="로그 분석" 
            iconPosition="start"
          />
          <Tab 
            icon={<SpeedIcon />} 
            label="성능 분석" 
            iconPosition="start"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="모니터링 설정" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* [advice from AI] 탭 콘텐츠 렌더링 */}
      {renderTabContent()}
    </Box>
  );
};

export default MonitoringCenter;
