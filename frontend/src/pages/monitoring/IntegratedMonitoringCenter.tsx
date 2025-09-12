// [advice from AI] 통합 모니터링 센터 - 모든 Phase의 모니터링을 통합 관리
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
  Assessment as AssessmentIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import BackstageCard from '../../components/layout/BackstageCard';
import IntegratedMonitoringDashboard from './IntegratedMonitoringDashboard';

// [advice from AI] Phase별 모니터링 컴포넌트들
const Phase1_2Monitoring: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Phase 1-2: 프로젝트/PO 모니터링
      </Typography>
      <Alert severity="info">
        프로젝트 관리 및 PO 업무 지원 시스템 모니터링 기능을 개발 중입니다.
      </Alert>
      {/* 기존 프로젝트/PO 모니터링 기능을 여기에 통합 */}
    </Box>
  );
};

const Phase3_4Monitoring: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Phase 3-4: PE/완료 시스템 모니터링
      </Typography>
      <Alert severity="info">
        PE 업무 지원 및 완료 시스템 모니터링 기능을 개발 중입니다.
      </Alert>
      {/* 기존 PE/완료 시스템 모니터링 기능을 여기에 통합 */}
    </Box>
  );
};

const Phase5Monitoring: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Phase 5: QA/QC 모니터링
      </Typography>
      <Alert severity="info">
        QA/QC 시스템 모니터링 기능을 개발 중입니다.
      </Alert>
      {/* 기존 QA/QC 모니터링 기능을 여기에 통합 */}
    </Box>
  );
};

const Phase6Monitoring: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Phase 6: 운영 시스템 모니터링
      </Typography>
      <Alert severity="info">
        운영 시스템 모니터링 기능을 개발 중입니다.
      </Alert>
      {/* 기존 운영 시스템 모니터링 기능을 여기에 통합 */}
    </Box>
  );
};

const PredictiveAnalysis: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        예측 분석
      </Typography>
      <Alert severity="info">
        예측 분석 기능은 현재 개발 중입니다. 곧 트렌드 분석 및 예측 기능을 제공할 예정입니다.
      </Alert>
      {/* 예측 분석 기능을 여기에 구현 */}
    </Box>
  );
};

const AutoScaling: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        자동 스케일링
      </Typography>
      <Alert severity="info">
        자동 스케일링 기능은 현재 개발 중입니다. 곧 리소스 자동 조정 기능을 제공할 예정입니다.
      </Alert>
      {/* 자동 스케일링 기능을 여기에 구현 */}
    </Box>
  );
};

const DisasterRecovery: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        장애 복구
      </Typography>
      <Alert severity="info">
        장애 복구 기능은 현재 개발 중입니다. 곧 자동 장애 감지 및 복구 기능을 제공할 예정입니다.
      </Alert>
      {/* 장애 복구 기능을 여기에 구현 */}
    </Box>
  );
};

const MonitoringSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        모니터링 설정
      </Typography>
      <Alert severity="info">
        모니터링 설정 기능은 현재 개발 중입니다. 곧 모니터링 시스템 설정 기능을 제공할 예정입니다.
      </Alert>
      {/* 모니터링 설정 기능을 여기에 구현 */}
    </Box>
  );
};

const IntegratedMonitoringCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 탭 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <IntegratedMonitoringDashboard />; // 통합 모니터링 대시보드
      case 1:
        return <Phase1_2Monitoring />;
      case 2:
        return <Phase3_4Monitoring />;
      case 3:
        return <Phase5Monitoring />;
      case 4:
        return <Phase6Monitoring />;
      case 5:
        return <PredictiveAnalysis />;
      case 6:
        return <AutoScaling />;
      case 7:
        return <DisasterRecovery />;
      case 8:
        return <MonitoringSettings />;
      default:
        return <IntegratedMonitoringDashboard />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 통합 모니터링 센터 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          통합 모니터링 센터
        </Typography>
        <Typography variant="body1" color="text.secondary">
          전체 시스템의 통합 모니터링 및 성능 관리
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab 
            icon={<DashboardIcon />} 
            label="통합 대시보드" 
            iconPosition="start"
          />
          <Tab 
            icon={<BuildIcon />} 
            label="Phase 1-2" 
            iconPosition="start"
          />
          <Tab 
            icon={<BuildIcon />} 
            label="Phase 3-4" 
            iconPosition="start"
          />
          <Tab 
            icon={<BugReportIcon />} 
            label="Phase 5" 
            iconPosition="start"
          />
          <Tab 
            icon={<CloudIcon />} 
            label="Phase 6" 
            iconPosition="start"
          />
          <Tab 
            icon={<AssessmentIcon />} 
            label="예측 분석" 
            iconPosition="start"
          />
          <Tab 
            icon={<TimelineIcon />} 
            label="자동 스케일링" 
            iconPosition="start"
          />
          <Tab 
            icon={<NotificationsIcon />} 
            label="장애 복구" 
            iconPosition="start"
          />
          <Tab 
            icon={<SettingsIcon />} 
            label="설정" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* [advice from AI] 탭 콘텐츠 렌더링 */}
      {renderTabContent()}
    </Box>
  );
};

export default IntegratedMonitoringCenter;
