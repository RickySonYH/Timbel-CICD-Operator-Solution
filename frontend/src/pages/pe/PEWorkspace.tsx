// [advice from AI] PE 작업공간 - PE 대시보드를 메인으로 사용
// PE 대시보드 컴포넌트를 직접 사용하여 작업공간 메인 페이지로 활용

import React from 'react';
import PEDashboard from './PEDashboard';

const PEWorkspace: React.FC = () => {
  // [advice from AI] PE 작업공간 메인 페이지는 PE 대시보드를 직접 사용
  return <PEDashboard />;
};

export default PEWorkspace;