// [advice from AI] 최고관리자용 프로젝트 생성 스크립트
// 경영진 대시보드, 프로젝트 워크플로우, 전략 분석, 성과 리포트 테스트용 프로젝트들 생성

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 최고관리자가 생성할 전략적 프로젝트들
const EXECUTIVE_PROJECTS = [
  {
    name: '디지털 트랜스포메이션 전략 수립',
    project_overview: '조직 전체의 디지털 혁신을 위한 종합적인 전략 수립 및 로드맵 작성',
    target_system_name: 'Digital Transformation Strategy Platform',
    urgency_level: 'critical',
    deadline: '2025-12-31',
    is_urgent_development: true,
    urgent_reason: '경쟁사 대비 디지털 역량 격차 해소 및 시장 선점을 위한 긴급 추진 필요',
    expected_completion_hours: 800,
    metadata: {
      business_impact: 'high',
      strategic_priority: 1,
      expected_roi: '500%',
      stakeholders: ['CEO', 'CTO', '사업부장', '기술이사'],
      success_metrics: [
        '디지털 성숙도 지수 30% 향상',
        '업무 자동화율 70% 달성',
        '고객 만족도 25% 개선',
        '운영비용 40% 절감'
      ],
      work_groups: [
        { name: '현황 분석 및 진단', estimated_hours: 120 },
        { name: '전략 수립 및 로드맵 작성', estimated_hours: 200 },
        { name: '기술 아키텍처 설계', estimated_hours: 180 },
        { name: '변화관리 계획 수립', estimated_hours: 100 },
        { name: '실행 계획 및 모니터링 체계', estimated_hours: 120 },
        { name: '파일럿 프로젝트 기획', estimated_hours: 80 }
      ]
    }
  },
  {
    name: 'AI 기반 비즈니스 인텔리전스 플랫폼',
    project_overview: '전사 데이터를 활용한 AI 기반 의사결정 지원 시스템 구축',
    target_system_name: 'Enterprise AI-BI Platform',
    urgency_level: 'high',
    deadline: '2025-10-31',
    is_urgent_development: false,
    expected_completion_hours: 600,
    metadata: {
      business_impact: 'high',
      strategic_priority: 2,
      expected_roi: '300%',
      stakeholders: ['CFO', '데이터팀장', '비즈니스분석팀'],
      success_metrics: [
        '의사결정 속도 50% 향상',
        '예측 정확도 85% 달성',
        '리포팅 자동화 90% 완성',
        '데이터 활용률 3배 증가'
      ],
      work_groups: [
        { name: '데이터 웨어하우스 구축', estimated_hours: 150 },
        { name: 'AI 모델 개발 및 훈련', estimated_hours: 200 },
        { name: '대시보드 및 시각화', estimated_hours: 120 },
        { name: '실시간 분석 엔진', estimated_hours: 80 },
        { name: '보안 및 거버넌스', estimated_hours: 50 }
      ]
    }
  },
  {
    name: '통합 성과 관리 시스템',
    project_overview: 'KPI 기반 조직 성과 측정 및 관리를 위한 통합 플랫폼 구축',
    target_system_name: 'Integrated Performance Management System',
    urgency_level: 'medium',
    deadline: '2025-11-30',
    is_urgent_development: false,
    expected_completion_hours: 450,
    metadata: {
      business_impact: 'medium',
      strategic_priority: 3,
      expected_roi: '200%',
      stakeholders: ['HR팀장', '기획팀장', '각 부서장'],
      success_metrics: [
        '성과 측정 정확도 95% 달성',
        '목표 달성률 20% 향상',
        '성과 리뷰 주기 50% 단축',
        '직원 만족도 15% 개선'
      ],
      work_groups: [
        { name: 'KPI 체계 설계', estimated_hours: 80 },
        { name: '성과 측정 엔진 개발', estimated_hours: 150 },
        { name: '리포팅 및 알림 시스템', estimated_hours: 100 },
        { name: '모바일 앱 개발', estimated_hours: 70 },
        { name: '통합 테스트 및 배포', estimated_hours: 50 }
      ]
    }
  },
  {
    name: '고객 경험 최적화 플랫폼',
    project_overview: '고객 여정 전반의 경험을 분석하고 최적화하는 통합 플랫폼',
    target_system_name: 'Customer Experience Optimization Platform',
    urgency_level: 'high',
    deadline: '2025-09-30',
    is_urgent_development: true,
    urgent_reason: '고객 이탈률 증가 및 경쟁사 대비 고객 만족도 저하로 인한 긴급 대응 필요',
    expected_completion_hours: 520,
    metadata: {
      business_impact: 'critical',
      strategic_priority: 1,
      expected_roi: '400%',
      stakeholders: ['마케팅팀장', '고객서비스팀장', '영업팀장'],
      success_metrics: [
        '고객 만족도 30% 향상',
        '고객 이탈률 25% 감소',
        '고객 생애 가치 40% 증가',
        '응답 시간 60% 단축'
      ],
      work_groups: [
        { name: '고객 여정 매핑', estimated_hours: 80 },
        { name: '실시간 피드백 수집 시스템', estimated_hours: 120 },
        { name: '예측 분석 모델', estimated_hours: 100 },
        { name: '개인화 추천 엔진', estimated_hours: 140 },
        { name: '옴니채널 통합', estimated_hours: 80 }
      ]
    }
  },
  {
    name: '지속가능경영 모니터링 시스템',
    project_overview: 'ESG 경영 지표 추적 및 지속가능성 성과 관리 시스템',
    target_system_name: 'Sustainability Management System',
    urgency_level: 'medium',
    deadline: '2026-03-31',
    is_urgent_development: false,
    expected_completion_hours: 380,
    metadata: {
      business_impact: 'medium',
      strategic_priority: 4,
      expected_roi: '150%',
      stakeholders: ['지속가능경영팀장', '법무팀장', 'IR팀장'],
      success_metrics: [
        'ESG 등급 1단계 상승',
        '탄소 배출량 20% 감소',
        '지속가능성 리포팅 자동화 80%',
        '투자자 신뢰도 향상'
      ],
      work_groups: [
        { name: 'ESG 지표 체계 구축', estimated_hours: 100 },
        { name: '데이터 수집 자동화', estimated_hours: 120 },
        { name: '리포팅 대시보드', estimated_hours: 80 },
        { name: '규제 준수 모니터링', estimated_hours: 80 }
      ]
    }
  }
];

async function createExecutiveProjects() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 최고관리자 전략 프로젝트 생성 시작...\n');
    
    // 최고관리자 및 도메인 정보 확인
    const executiveResult = await client.query(`
      SELECT id, full_name FROM timbel_users 
      WHERE role_type = 'executive' 
      ORDER BY created_at DESC LIMIT 1
    `);
    
    if (executiveResult.rows.length === 0) {
      throw new Error('최고관리자 계정이 없습니다.');
    }
    
    const executive = executiveResult.rows[0];
    console.log(`👔 최고관리자: ${executive.full_name} (${executive.id})`);
    
    // 적절한 도메인 선택 (Analytics 또는 첫 번째 도메인)
    const domainResult = await client.query(`
      SELECT id, name FROM domains 
      WHERE name ILIKE '%analytics%' OR name ILIKE '%전략%'
      ORDER BY name LIMIT 1
    `);
    
    let selectedDomain;
    if (domainResult.rows.length === 0) {
      const anyDomainResult = await client.query('SELECT id, name FROM domains ORDER BY name LIMIT 1');
      selectedDomain = anyDomainResult.rows[0];
    } else {
      selectedDomain = domainResult.rows[0];
    }
    
    console.log(`🏢 선택된 도메인: ${selectedDomain.name} (${selectedDomain.id})\n`);
    
    const createdProjects = [];
    
    // 각 전략 프로젝트 생성
    for (let i = 0; i < EXECUTIVE_PROJECTS.length; i++) {
      const projectData = EXECUTIVE_PROJECTS[i];
      console.log(`📋 프로젝트 ${i + 1}: ${projectData.name}`);
      
      try {
        await client.query('BEGIN');
        
        // 프로젝트 생성
        const projectResult = await client.query(`
          INSERT INTO projects (
            name, project_overview, target_system_name, urgency_level, deadline,
            is_urgent_development, urgent_reason, expected_completion_hours,
            metadata, domain_id, created_by, project_status, approval_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', 'pending')
          RETURNING *
        `, [
          projectData.name,
          projectData.project_overview,
          projectData.target_system_name,
          projectData.urgency_level,
          projectData.deadline,
          projectData.is_urgent_development,
          projectData.urgent_reason,
          projectData.expected_completion_hours,
          JSON.stringify(projectData.metadata),
          selectedDomain.id,
          executive.id
        ]);
        
        const project = projectResult.rows[0];
        
        // 최고관리자는 바로 승인 처리 (자동 승인)
        const approvalResult = await client.query(`
          INSERT INTO project_approvals (
            project_id, approver_id, approval_action, approval_comment, approved_at
          ) VALUES ($1, $2, 'approved', '최고관리자 직접 승인 - 전략적 우선순위 프로젝트', NOW())
          RETURNING *
        `, [project.id, executive.id]);
        
        // 프로젝트 상태 업데이트 (승인됨)
        await client.query(`
          UPDATE projects 
          SET project_status = 'pending_approval', approval_status = 'approved', updated_at = NOW()
          WHERE id = $1
        `, [project.id]);
        
        await client.query('COMMIT');
        
        createdProjects.push({
          ...project,
          approval_id: approvalResult.rows[0].id
        });
        
        console.log(`   ✅ 생성 완료 (ID: ${project.id.substring(0, 8)}...)`);
        console.log(`   📊 우선순위: ${projectData.metadata.strategic_priority}`);
        console.log(`   📊 예상 ROI: ${projectData.metadata.expected_roi}`);
        console.log(`   📊 예상 시간: ${projectData.expected_completion_hours}시간`);
        
        if (projectData.is_urgent_development) {
          console.log(`   🚨 긴급 프로젝트: ${projectData.urgent_reason}`);
        }
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.log(`   ❌ 생성 실패: ${error.message}`);
      }
    }
    
    console.log(`\n📊 전략 프로젝트 생성 결과:`);
    console.log(`   📈 생성된 프로젝트: ${createdProjects.length}개`);
    console.log(`   📈 성공률: ${Math.round((createdProjects.length / EXECUTIVE_PROJECTS.length) * 100)}%`);
    
    // 긴급도별 분포
    const urgencyDistribution = {};
    createdProjects.forEach(project => {
      const urgency = EXECUTIVE_PROJECTS.find(p => p.name === project.name)?.urgency_level;
      urgencyDistribution[urgency] = (urgencyDistribution[urgency] || 0) + 1;
    });
    
    console.log(`   📈 긴급도 분포:`);
    Object.entries(urgencyDistribution).forEach(([level, count]) => {
      const labels = { critical: '매우긴급', high: '긴급', medium: '보통', low: '낮음' };
      console.log(`     - ${labels[level] || level}: ${count}개`);
    });
    
    // 총 예상 시간 및 ROI
    const totalHours = createdProjects.reduce((sum, project) => {
      const projectData = EXECUTIVE_PROJECTS.find(p => p.name === project.name);
      return sum + (projectData?.expected_completion_hours || 0);
    }, 0);
    
    const avgROI = createdProjects.reduce((sum, project) => {
      const projectData = EXECUTIVE_PROJECTS.find(p => p.name === project.name);
      const roi = parseInt(projectData?.metadata.expected_roi?.replace('%', '') || '0');
      return sum + roi;
    }, 0) / createdProjects.length;
    
    console.log(`   📈 총 예상 시간: ${totalHours}시간 (${Math.round(totalHours / 8)}일)`);
    console.log(`   📈 평균 예상 ROI: ${Math.round(avgROI)}%`);
    
    console.log(`\n🎯 다음 단계:`);
    console.log(`   1️⃣ 경영진 대시보드에서 프로젝트 현황 확인`);
    console.log(`   2️⃣ 프로젝트 워크플로우에서 진행 상황 모니터링`);
    console.log(`   3️⃣ 전략 분석에서 포트폴리오 분석`);
    console.log(`   4️⃣ 성과 리포트에서 ROI 및 성과 지표 확인`);
    console.log(`   5️⃣ PO 할당 및 워크플로우 진행`);
    
    return {
      success: true,
      created_projects: createdProjects,
      statistics: {
        total_created: createdProjects.length,
        success_rate: Math.round((createdProjects.length / EXECUTIVE_PROJECTS.length) * 100),
        urgency_distribution: urgencyDistribution,
        total_hours: totalHours,
        average_roi: Math.round(avgROI)
      }
    };
    
  } catch (error) {
    console.error('❌ 전략 프로젝트 생성 실패:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

// 실행
if (require.main === module) {
  createExecutiveProjects()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 최고관리자 전략 프로젝트 생성 완료');
        console.log(`📊 생성된 프로젝트: ${result.statistics.total_created}개`);
        console.log(`📊 총 예상 시간: ${result.statistics.total_hours}시간`);
        console.log(`📊 평균 ROI: ${result.statistics.average_roi}%`);
      } else {
        console.log('\n💥 프로젝트 생성 실패');
        console.log(`❌ 오류: ${result.error}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { createExecutiveProjects, EXECUTIVE_PROJECTS };
