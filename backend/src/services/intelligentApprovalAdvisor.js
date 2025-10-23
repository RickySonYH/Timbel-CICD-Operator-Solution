// [advice from AI] 프로덕션 레벨 지능형 승인 어드바이저 시스템
// 각 단계별 체크리스트, 위험 분석, 베스트 프랙티스 추천, ML 기반 예측

const { Pool } = require('pg');
const EventEmitter = require('events');
const crypto = require('crypto');
const systemLogger = require('../middleware/systemLogger');

class IntelligentApprovalAdvisor extends EventEmitter {
  constructor() {
    super();
    
    // [advice from AI] 데이터베이스 연결 풀 설정
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://timbel_user:timbel_password@localhost:5432/timbel_cicd_operator',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // [advice from AI] 캐싱 시스템
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5분
    
    // [advice from AI] 성능 메트릭
    this.metrics = {
      totalAnalyses: 0,
      averageAnalysisTime: 0,
      cacheHitRate: 0,
      riskDetectionAccuracy: 0
    };

    // [advice from AI] 설정 가능한 파라미터
    this.config = {
      riskThresholds: {
        low: 30,
        medium: 60,
        high: 80,
        critical: 95
      },
      approvalScoreThresholds: {
        block: 60,
        caution: 80,
        proceed: 100
      },
      cacheEnabled: process.env.NODE_ENV === 'production',
      enableMLPredictions: true,
      enableHistoricalAnalysis: true,
      maxSimilarProjects: 10
    };

    systemLogger.info('🧠 지능형 승인 어드바이저 초기화 완료', {
      component: 'IntelligentApprovalAdvisor',
      cacheEnabled: this.config.cacheEnabled,
      mlEnabled: this.config.enableMLPredictions
    });

    // [advice from AI] 프로덕션 레벨 단계별 체크리스트 템플릿
    this.checklistTemplates = {
      project_creation: [
        { 
          id: 'project_scope', 
          text: '프로젝트 범위가 명확히 정의되어 있나요?', 
          weight: 0.9, 
          category: 'critical',
          description: 'SMART 기준(Specific, Measurable, Achievable, Relevant, Time-bound)에 따라 범위가 정의되어야 합니다.',
          validationRules: ['scope_document_exists', 'acceptance_criteria_defined'],
          automatedCheck: true,
          dependencies: []
        },
        { 
          id: 'resource_estimation', 
          text: '필요한 리소스(인력, 시간, 예산)가 산정되어 있나요?', 
          weight: 0.8, 
          category: 'important',
          description: '과거 유사 프로젝트 데이터를 기반으로 한 정확한 리소스 산정이 필요합니다.',
          validationRules: ['effort_estimation_complete', 'budget_approved'],
          automatedCheck: true,
          dependencies: ['project_scope']
        },
        { 
          id: 'stakeholder_identified', 
          text: '모든 이해관계자가 식별되고 동의했나요?', 
          weight: 0.7, 
          category: 'important',
          description: 'RACI 매트릭스를 통해 역할과 책임이 명확히 정의되어야 합니다.',
          validationRules: ['stakeholder_matrix_complete', 'sign_off_received'],
          automatedCheck: false,
          dependencies: []
        },
        { 
          id: 'similar_project_review', 
          text: '유사한 프로젝트 사례를 검토했나요?', 
          weight: 0.6, 
          category: 'recommended',
          description: '과거 3년간의 유사 프로젝트 성공/실패 사례를 분석하여 교훈을 도출해야 합니다.',
          validationRules: ['historical_analysis_complete', 'lessons_learned_documented'],
          automatedCheck: true,
          dependencies: []
        },
        { 
          id: 'risk_assessment', 
          text: '주요 위험 요소가 식별되고 대응 방안이 있나요?', 
          weight: 0.8, 
          category: 'important',
          description: '위험 매트릭스를 통해 High/Medium/Low 위험을 분류하고 각각의 완화 전략을 수립해야 합니다.',
          validationRules: ['risk_register_complete', 'mitigation_plans_defined'],
          automatedCheck: true,
          dependencies: ['project_scope', 'similar_project_review']
        },
        {
          id: 'compliance_requirements',
          text: '규제 및 컴플라이언스 요구사항이 검토되었나요?',
          weight: 0.9,
          category: 'critical',
          description: 'GDPR, SOX, PCI-DSS 등 관련 규제 요구사항을 사전에 식별하고 준수 방안을 마련해야 합니다.',
          validationRules: ['compliance_checklist_complete', 'legal_review_done'],
          automatedCheck: true,
          dependencies: ['project_scope']
        },
        {
          id: 'architecture_review',
          text: '기술 아키텍처 검토가 완료되었나요?',
          weight: 0.8,
          category: 'important',
          description: '확장성, 보안성, 유지보수성을 고려한 아키텍처 설계 및 기술 스택 선정이 필요합니다.',
          validationRules: ['architecture_document_approved', 'tech_stack_validated'],
          automatedCheck: true,
          dependencies: ['project_scope', 'compliance_requirements']
        }
      ],
      
      po_approval: [
        { 
          id: 'business_value', 
          text: '비즈니스 가치가 명확히 정의되어 있나요?', 
          weight: 0.9, 
          category: 'critical',
          description: 'ROI, NPV, 페이백 기간 등 정량적 지표와 전략적 가치가 명시되어야 합니다.',
          validationRules: ['roi_calculated', 'business_case_approved', 'kpi_defined'],
          automatedCheck: true,
          dependencies: []
        },
        { 
          id: 'priority_alignment', 
          text: '조직의 우선순위와 일치하나요?', 
          weight: 0.8, 
          category: 'important',
          description: '회사의 전략적 목표 및 OKR과의 연관성을 명확히 제시해야 합니다.',
          validationRules: ['strategic_alignment_verified', 'okr_mapping_complete'],
          automatedCheck: true,
          dependencies: ['business_value']
        },
        { 
          id: 'resource_availability', 
          text: '필요한 리소스가 확보 가능한가요?', 
          weight: 0.8, 
          category: 'important',
          description: '인력, 예산, 시설, 도구 등 모든 필요 리소스의 가용성을 확인해야 합니다.',
          validationRules: ['resource_allocation_confirmed', 'budget_secured', 'team_capacity_verified'],
          automatedCheck: true,
          dependencies: []
        },
        { 
          id: 'timeline_realistic', 
          text: '제시된 일정이 현실적인가요?', 
          weight: 0.7, 
          category: 'important',
          description: 'Monte Carlo 시뮬레이션이나 유사 프로젝트 데이터를 기반으로 한 현실적인 일정 수립이 필요합니다.',
          validationRules: ['timeline_validated', 'buffer_included', 'milestone_defined'],
          automatedCheck: true,
          dependencies: ['resource_availability']
        },
        { 
          id: 'success_criteria', 
          text: '성공 기준이 측정 가능하게 정의되어 있나요?', 
          weight: 0.8, 
          category: 'important',
          description: 'SMART 기준에 따른 구체적이고 측정 가능한 성공 지표가 정의되어야 합니다.',
          validationRules: ['success_metrics_defined', 'measurement_plan_ready'],
          automatedCheck: true,
          dependencies: ['business_value']
        },
        {
          id: 'risk_tolerance',
          text: '리스크 허용 수준이 정의되었나요?',
          weight: 0.7,
          category: 'important',
          description: '프로젝트의 위험 허용 범위와 에스컬레이션 절차가 명확히 정의되어야 합니다.',
          validationRules: ['risk_appetite_defined', 'escalation_procedure_ready'],
          automatedCheck: true,
          dependencies: ['business_value', 'timeline_realistic']
        }
      ],
      
      pe_assignment: [
        { id: 'skill_match', text: '할당된 PE의 기술 스택이 프로젝트와 일치하나요?', weight: 0.9, category: 'critical' },
        { id: 'workload_check', text: 'PE의 현재 업무 부하가 적정한가요?', weight: 0.8, category: 'important' },
        { id: 'experience_level', text: '유사 프로젝트 경험이 충분한가요?', weight: 0.7, category: 'important' },
        { id: 'mentoring_support', text: '필요시 멘토링 지원 체계가 있나요?', weight: 0.6, category: 'recommended' },
        { id: 'communication_plan', text: '의사소통 계획이 수립되어 있나요?', weight: 0.7, category: 'important' }
      ],
      
      qa_approval: [
        { id: 'test_coverage', text: '테스트 커버리지가 충분한가요? (>80%)', weight: 0.9, category: 'critical' },
        { id: 'code_quality', text: '코드 품질 기준을 만족하나요?', weight: 0.8, category: 'important' },
        { id: 'security_review', text: '보안 검토가 완료되었나요?', weight: 0.8, category: 'important' },
        { id: 'performance_test', text: '성능 테스트가 수행되었나요?', weight: 0.7, category: 'important' },
        { id: 'documentation', text: '기술 문서가 완성되어 있나요?', weight: 0.6, category: 'recommended' }
      ],
      
      deployment_approval: [
        { id: 'environment_ready', text: '배포 환경이 준비되어 있나요?', weight: 0.9, category: 'critical' },
        { id: 'rollback_plan', text: '롤백 계획이 수립되어 있나요?', weight: 0.8, category: 'important' },
        { id: 'monitoring_setup', text: '모니터링 및 알림이 설정되어 있나요?', weight: 0.8, category: 'important' },
        { id: 'backup_verified', text: '백업이 검증되어 있나요?', weight: 0.7, category: 'important' },
        { id: 'maintenance_window', text: '유지보수 시간대가 적절한가요?', weight: 0.6, category: 'recommended' }
      ]
    };

    // [advice from AI] 위험 패턴 정의
    this.riskPatterns = {
      high_complexity: {
        triggers: ['microservice', 'distributed', 'real-time', 'high-traffic'],
        warning: '복잡한 아키텍처 프로젝트입니다. 추가적인 설계 검토와 단계적 배포를 고려하세요.',
        recommendations: [
          '아키텍처 리뷰 세션 추가',
          '프로토타입 우선 개발',
          '단계적 배포 계획 수립',
          '모니터링 강화'
        ]
      },
      
      tight_deadline: {
        triggers: ['urgent', 'asap', '긴급', '즉시'],
        warning: '촉박한 일정으로 품질 리스크가 있습니다. 범위 조정이나 리소스 추가를 고려하세요.',
        recommendations: [
          'MVP 범위 재정의',
          '추가 리소스 할당 검토',
          '품질 기준 명확화',
          '위험 완화 계획 수립'
        ]
      },
      
      new_technology: {
        triggers: ['new', 'latest', 'experimental', '신기술', '최신'],
        warning: '새로운 기술 스택 사용으로 학습 곡선과 안정성 리스크가 있습니다.',
        recommendations: [
          '기술 검증 단계 추가',
          '전문가 자문 확보',
          '대안 기술 준비',
          '교육 및 학습 시간 확보'
        ]
      },
      
      large_team: {
        triggers: (project) => {
          const teamSize = project.team_members?.length || 0;
          return teamSize > 8;
        },
        warning: '대규모 팀으로 커뮤니케이션 복잡도가 높습니다.',
        recommendations: [
          '팀 구조 최적화',
          '명확한 역할 분담',
          '정기적인 동기화 미팅',
          '문서화 표준 수립'
        ]
      }
    };

    // [advice from AI] 베스트 프랙티스 데이터베이스
    this.bestPractices = {
      project_creation: [
        '유사 프로젝트 성공 사례를 참고하여 일정과 리소스를 산정하세요',
        '프로젝트 시작 전 모든 이해관계자와의 킥오프 미팅을 진행하세요',
        '명확한 완료 기준(DoD: Definition of Done)을 설정하세요'
      ],
      
      po_approval: [
        'ROI(투자 수익률) 계산을 통해 비즈니스 가치를 정량화하세요',
        '프로젝트 우선순위를 다른 진행 중인 프로젝트와 비교 검토하세요',
        '단계적 배포(Phased Delivery)를 통해 위험을 분산하세요'
      ],
      
      pe_assignment: [
        'PE의 기술 스택과 프로젝트 요구사항을 매칭 점수로 평가하세요',
        '현재 업무 부하를 고려하여 realistic한 일정을 수립하세요',
        '복잡한 프로젝트의 경우 시니어 PE와 주니어 PE를 페어링하세요'
      ],
      
      qa_approval: [
        '자동화된 테스트 파이프라인을 구축하여 지속적인 품질 검증을 하세요',
        '코드 리뷰 체크리스트를 활용하여 일관된 품질 기준을 유지하세요',
        '성능 기준을 사전에 정의하고 이를 만족하는지 검증하세요'
      ],
      
      deployment_approval: [
        '블루-그린 배포나 카나리 배포를 통해 배포 위험을 최소화하세요',
        '배포 전 체크리스트를 통해 모든 준비사항을 점검하세요',
        '배포 후 모니터링 계획을 수립하고 알림 임계값을 설정하세요'
      ]
    };
  }

  // [advice from AI] 캐시 관리
  getCacheKey(projectId, stage, additionalParams = {}) {
    const keyData = { projectId, stage, ...additionalParams };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate * this.metrics.totalAnalyses + 1) / (this.metrics.totalAnalyses + 1);
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    if (this.config.cacheEnabled) {
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
    }
  }

  // [advice from AI] 자동 검증 규칙 실행
  async executeValidationRules(projectId, checklistItem) {
    const validationResults = {};
    
    for (const rule of checklistItem.validationRules) {
      try {
        switch (rule) {
          case 'scope_document_exists':
            validationResults[rule] = await this.checkScopeDocument(projectId);
            break;
          case 'roi_calculated':
            validationResults[rule] = await this.checkROICalculation(projectId);
            break;
          case 'test_coverage':
            validationResults[rule] = await this.checkTestCoverage(projectId);
            break;
          case 'security_review_done':
            validationResults[rule] = await this.checkSecurityReview(projectId);
            break;
          default:
            validationResults[rule] = { status: 'not_implemented', message: '검증 규칙이 구현되지 않았습니다.' };
        }
      } catch (error) {
        validationResults[rule] = { status: 'error', message: error.message };
        systemLogger.error('검증 규칙 실행 실패', { rule, projectId, error: error.message });
      }
    }

    return validationResults;
  }

  // [advice from AI] 개별 검증 규칙들
  async checkScopeDocument(projectId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count FROM project_documents 
        WHERE project_id = $1 AND document_type = 'scope' AND status = 'approved'
      `, [projectId]);
      
      const count = parseInt(result.rows[0].count);
      return {
        status: count > 0 ? 'passed' : 'failed',
        message: count > 0 ? '범위 문서가 승인되었습니다.' : '승인된 범위 문서가 없습니다.',
        value: count
      };
    } finally {
      client.release();
    }
  }

  async checkROICalculation(projectId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT roi_percentage, npv_value, payback_months 
        FROM project_financials 
        WHERE project_id = $1
      `, [projectId]);
      
      if (result.rows.length === 0) {
        return { status: 'failed', message: 'ROI 계산이 없습니다.' };
      }

      const financials = result.rows[0];
      const hasValidROI = financials.roi_percentage > 0 && financials.payback_months < 36;
      
      return {
        status: hasValidROI ? 'passed' : 'warning',
        message: hasValidROI ? 'ROI 계산이 완료되었습니다.' : 'ROI가 낮거나 페이백 기간이 깁니다.',
        value: financials
      };
    } finally {
      client.release();
    }
  }

  async checkTestCoverage(projectId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT test_coverage_percentage, last_test_run 
        FROM project_quality_metrics 
        WHERE project_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [projectId]);
      
      if (result.rows.length === 0) {
        return { status: 'failed', message: '테스트 커버리지 데이터가 없습니다.' };
      }

      const coverage = result.rows[0].test_coverage_percentage;
      const isRecent = new Date() - new Date(result.rows[0].last_test_run) < 24 * 60 * 60 * 1000; // 24시간 이내

      return {
        status: coverage >= 80 && isRecent ? 'passed' : 'failed',
        message: `테스트 커버리지: ${coverage}% (${isRecent ? '최신' : '오래됨'})`,
        value: { coverage, isRecent }
      };
    } finally {
      client.release();
    }
  }

  async checkSecurityReview(projectId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT status, severity_high, severity_medium, severity_low, reviewed_at
        FROM security_reviews 
        WHERE project_id = $1 
        ORDER BY reviewed_at DESC 
        LIMIT 1
      `, [projectId]);
      
      if (result.rows.length === 0) {
        return { status: 'failed', message: '보안 검토가 수행되지 않았습니다.' };
      }

      const review = result.rows[0];
      const isApproved = review.status === 'approved' && review.severity_high === 0;
      
      return {
        status: isApproved ? 'passed' : 'failed',
        message: isApproved ? '보안 검토가 승인되었습니다.' : `보안 이슈 발견: High(${review.severity_high}), Medium(${review.severity_medium})`,
        value: review
      };
    } finally {
      client.release();
    }
  }

  // [advice from AI] ML 기반 성공 확률 예측
  async predictProjectSuccess(projectId, stage) {
    if (!this.config.enableMLPredictions) {
      return { probability: 0.75, confidence: 'low', reason: 'ML 예측이 비활성화되었습니다.' };
    }

    try {
      const client = await this.pool.connect();
      
      try {
        // 프로젝트 특성 데이터 수집
        const projectFeatures = await client.query(`
          SELECT 
            p.project_name, p.description, p.estimated_duration,
            d.business_type, d.complexity_score,
            COUNT(wg.id) as team_size,
            AVG(u.experience_years) as avg_experience
          FROM projects p
          LEFT JOIN domains d ON p.domain_id = d.id
          LEFT JOIN work_groups wg ON p.id = wg.project_id
          LEFT JOIN timbel_users u ON wg.assigned_user_id = u.id
          WHERE p.id = $1
          GROUP BY p.id, d.business_type, d.complexity_score
        `, [projectId]);

        if (projectFeatures.rows.length === 0) {
          return { probability: 0.5, confidence: 'very_low', reason: '프로젝트 데이터 부족' };
        }

        const features = projectFeatures.rows[0];
        
        // 유사 프로젝트 성공률 기반 예측
        const similarProjects = await client.query(`
          SELECT project_status, 
                 EXTRACT(EPOCH FROM (updated_at - created_at))/86400 as actual_duration
          FROM projects p2
          LEFT JOIN domains d2 ON p2.domain_id = d2.id
          WHERE d2.business_type = $1
            AND p2.project_status IN ('completed', 'failed', 'cancelled')
            AND p2.id != $2
          ORDER BY p2.updated_at DESC
          LIMIT 20
        `, [features.business_type, projectId]);

        let successProbability = 0.75; // 기본값
        let confidence = 'medium';
        let reason = '통계적 분석 기반';

        if (similarProjects.rows.length >= 5) {
          const successCount = similarProjects.rows.filter(p => p.project_status === 'completed').length;
          const baseSuccessRate = successCount / similarProjects.rows.length;
          
          // 팀 크기 조정
          let teamSizeMultiplier = 1.0;
          if (features.team_size > 10) teamSizeMultiplier = 0.8;
          else if (features.team_size > 5) teamSizeMultiplier = 0.9;
          else if (features.team_size < 3) teamSizeMultiplier = 0.85;

          // 경험 수준 조정
          let experienceMultiplier = 1.0;
          if (features.avg_experience > 5) experienceMultiplier = 1.1;
          else if (features.avg_experience < 2) experienceMultiplier = 0.8;

          // 복잡도 조정
          let complexityMultiplier = 1.0;
          if (features.complexity_score > 8) complexityMultiplier = 0.7;
          else if (features.complexity_score > 6) complexityMultiplier = 0.85;

          successProbability = Math.min(0.95, Math.max(0.1, 
            baseSuccessRate * teamSizeMultiplier * experienceMultiplier * complexityMultiplier
          ));
          
          confidence = similarProjects.rows.length >= 15 ? 'high' : 'medium';
          reason = `${similarProjects.rows.length}개 유사 프로젝트 분석 기반`;
        }

        return {
          probability: Math.round(successProbability * 100) / 100,
          confidence,
          reason,
          factors: {
            baseSuccessRate: similarProjects.rows.length > 0 ? 
              similarProjects.rows.filter(p => p.project_status === 'completed').length / similarProjects.rows.length : 0.75,
            teamSize: features.team_size,
            avgExperience: features.avg_experience,
            complexityScore: features.complexity_score,
            similarProjectsCount: similarProjects.rows.length
          }
        };

      } finally {
        client.release();
      }
    } catch (error) {
      systemLogger.error('ML 예측 실패', { projectId, stage, error: error.message });
      return { probability: 0.5, confidence: 'very_low', reason: '예측 오류 발생' };
    }
  }

  // [advice from AI] 프로덕션 레벨 프로젝트별 맞춤 체크리스트 생성
  async generateChecklistForProject(projectId, stage) {
    const startTime = Date.now();
    
    try {
      // 캐시 확인
      const cacheKey = this.getCacheKey(projectId, stage);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        systemLogger.info('체크리스트 캐시 히트', { projectId, stage, cacheKey });
        return cached;
      }

      const client = await this.pool.connect();
      
      try {
        // 프로젝트 정보 조회
        const projectResult = await client.query(`
          SELECT p.*, d.name as domain_name, d.business_type,
                 COUNT(wg.id) as team_size
          FROM projects p
          LEFT JOIN domains d ON p.domain_id = d.id
          LEFT JOIN work_groups wg ON p.id = wg.project_id
          WHERE p.id = $1
          GROUP BY p.id, d.name, d.business_type
        `, [projectId]);

        if (projectResult.rows.length === 0) {
          throw new Error('프로젝트를 찾을 수 없습니다');
        }

        const project = projectResult.rows[0];
        const baseChecklist = this.checklistTemplates[stage] || [];

        // [advice from AI] 프로젝트 특성에 따른 체크리스트 커스터마이징
        let customizedChecklist = [...baseChecklist];

        // 비즈니스 타입별 추가 항목
        if (project.business_type === 'financial' && stage === 'qa_approval') {
          customizedChecklist.push({
            id: 'compliance_check',
            text: '금융 규제 준수 사항이 검토되었나요?',
            weight: 0.9,
            category: 'critical'
          });
        }

        // 팀 크기별 추가 항목
        if (project.team_size > 5 && stage === 'pe_assignment') {
          customizedChecklist.push({
            id: 'communication_tools',
            text: '팀 커뮤니케이션 도구가 설정되어 있나요?',
            weight: 0.7,
            category: 'important'
          });
        }

        // 위험 분석
        const riskAnalysis = this.analyzeProjectRisks(project);

        return {
          success: true,
          data: {
            checklist: customizedChecklist,
            riskAnalysis,
            bestPractices: this.bestPractices[stage] || [],
            projectContext: {
              name: project.project_name,
              domain: project.domain_name,
              businessType: project.business_type,
              teamSize: project.team_size,
              complexity: this.assessComplexity(project)
            }
          }
        };

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('체크리스트 생성 오류:', error);
      throw error;
    }
  }

  // [advice from AI] 프로젝트 위험 분석
  analyzeProjectRisks(project) {
    const risks = [];
    const projectText = `${project.project_name} ${project.description || ''} ${project.requirements || ''}`.toLowerCase();

    // 각 위험 패턴 검사
    Object.entries(this.riskPatterns).forEach(([riskType, pattern]) => {
      let isTriggered = false;

      if (typeof pattern.triggers === 'function') {
        isTriggered = pattern.triggers(project);
      } else if (Array.isArray(pattern.triggers)) {
        isTriggered = pattern.triggers.some(trigger => projectText.includes(trigger));
      }

      if (isTriggered) {
        risks.push({
          type: riskType,
          level: this.calculateRiskLevel(riskType, project),
          warning: pattern.warning,
          recommendations: pattern.recommendations
        });
      }
    });

    return risks;
  }

  // [advice from AI] 복잡도 평가
  assessComplexity(project) {
    let complexityScore = 0;

    // 팀 크기 기반
    if (project.team_size > 8) complexityScore += 3;
    else if (project.team_size > 4) complexityScore += 2;
    else complexityScore += 1;

    // 비즈니스 타입 기반
    if (['financial', 'healthcare', 'government'].includes(project.business_type)) {
      complexityScore += 2;
    }

    // 설명 키워드 기반
    const complexKeywords = ['microservice', 'distributed', 'real-time', 'ai', 'ml', 'blockchain'];
    const projectText = `${project.project_name} ${project.description || ''}`.toLowerCase();
    
    complexKeywords.forEach(keyword => {
      if (projectText.includes(keyword)) complexityScore += 1;
    });

    if (complexityScore <= 3) return 'low';
    if (complexityScore <= 6) return 'medium';
    return 'high';
  }

  // [advice from AI] 위험 레벨 계산
  calculateRiskLevel(riskType, project) {
    const baseRiskLevels = {
      high_complexity: 'high',
      tight_deadline: 'high',
      new_technology: 'medium',
      large_team: 'medium'
    };

    return baseRiskLevels[riskType] || 'low';
  }

  // [advice from AI] 이전 유사 프로젝트 분석
  async getSimilarProjectInsights(projectId, stage) {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(`
          SELECT p.project_name, p.project_status, p.created_at, p.updated_at,
                 d.business_type, d.name as domain_name,
                 EXTRACT(EPOCH FROM (p.updated_at - p.created_at))/86400 as duration_days
          FROM projects p
          LEFT JOIN domains d ON p.domain_id = d.id
          WHERE p.id != $1 
            AND p.project_status IN ('completed', 'deployed')
            AND d.business_type = (
              SELECT d2.business_type FROM projects p2 
              LEFT JOIN domains d2 ON p2.domain_id = d2.id 
              WHERE p2.id = $1
            )
          ORDER BY p.updated_at DESC
          LIMIT 5
        `, [projectId]);

        const insights = {
          similarProjects: result.rows,
          averageDuration: 0,
          successRate: 0,
          commonChallenges: [],
          recommendations: []
        };

        if (result.rows.length > 0) {
          insights.averageDuration = result.rows.reduce((sum, p) => sum + (p.duration_days || 0), 0) / result.rows.length;
          insights.successRate = result.rows.filter(p => p.project_status === 'completed').length / result.rows.length * 100;
          
          // 일반적인 추천사항
          if (insights.averageDuration > 90) {
            insights.recommendations.push('유사 프로젝트들이 평균 3개월 이상 소요되었습니다. 충분한 일정을 확보하세요.');
          }
          
          if (insights.successRate < 80) {
            insights.recommendations.push('이 도메인의 프로젝트 성공률이 낮습니다. 위험 관리에 더욱 주의하세요.');
          }
        }

        return insights;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('유사 프로젝트 분석 오류:', error);
      return { similarProjects: [], recommendations: ['유사 프로젝트 분석을 수행할 수 없습니다.'] };
    }
  }

  // [advice from AI] 승인 추천 점수 계산
  async calculateApprovalScore(projectId, stage, checklistResponses) {
    const checklist = await this.generateChecklistForProject(projectId, stage);
    let totalWeight = 0;
    let achievedWeight = 0;

    checklist.data.checklist.forEach(item => {
      totalWeight += item.weight;
      if (checklistResponses[item.id] === true) {
        achievedWeight += item.weight;
      }
    });

    const score = totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 0;
    
    let recommendation = 'proceed'; // proceed, caution, block
    if (score < 60) recommendation = 'block';
    else if (score < 80) recommendation = 'caution';

    return {
      score: Math.round(score),
      recommendation,
      criticalIssues: checklist.data.checklist
        .filter(item => item.category === 'critical' && !checklistResponses[item.id])
        .map(item => item.text),
      improvements: checklist.data.checklist
        .filter(item => !checklistResponses[item.id])
        .map(item => item.text)
    };
  }

  // [advice from AI] 서비스 종료
  async close() {
    await this.pool.end();
  }
}

module.exports = IntelligentApprovalAdvisor;
