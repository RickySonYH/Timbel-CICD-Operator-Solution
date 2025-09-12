// [advice from AI] QA/QC 센터 - 백스테이지IO 스타일 품질 관리 시스템
// Phase 5: QA/QC 시스템의 통합 센터

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import BackstageCard from '../../components/layout/BackstageCard';
import QADashboard from './QADashboard';
import TestCaseManagement from './TestCaseManagement';
import BugReportManagement from './BugReportManagement';
import IssueTracking from './IssueTracking';
import QAApprovalWorkflow from './QAApprovalWorkflow';

const QACenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // [advice from AI] 탭 컴포넌트 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <QADashboard />;
      case 1:
        return <TestCaseManagement />;
      case 2:
        return <BugReportManagement />;
      case 3:
        return <IssueTracking />;
      case 4:
        return <QAApprovalWorkflow />;
      default:
        return <QADashboard />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* [advice from AI] 헤더 섹션 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          QA/QC 센터
        </Typography>
        <Typography variant="h6" color="text.secondary">
          백스테이지IO 스타일 품질 관리 시스템 - 테스트 계획, 결함 관리, 품질 지표, 테스트 실행
        </Typography>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="대시보드" />
          <Tab label="테스트 케이스" />
          <Tab label="버그 리포트" />
          <Tab label="이슈 트래킹" />
          <Tab label="QA 승인" />
        </Tabs>
      </Box>

      {/* [advice from AI] 탭 콘텐츠 렌더링 */}
      {renderTabContent()}
    </Box>
  );
};

export default QACenter;