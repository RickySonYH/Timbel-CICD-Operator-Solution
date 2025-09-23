// [advice from AI] 종합적인 PE 성과 평가 시스템
// 프로젝트 수행률 + 지식자산 기여 + 기술 역량 + 협업 능력

const { Pool } = require('pg');

class PEPerformanceService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
  }

  // [advice from AI] 종합 성과 평가 계산
  async calculateComprehensivePerformance(peUserId, evaluationPeriod = 90) {
    const client = await this.pool.connect();
    
    try {
      console.log('📊 PE 종합 성과 평가 시작:', peUserId);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (evaluationPeriod * 24 * 60 * 60 * 1000));

      // 1. 프로젝트 성과 (40%)
      const projectPerformance = await this.evaluateProjectPerformance(client, peUserId, startDate, endDate);
      
      // 2. 지식 기여도 (30%)
      const knowledgeContribution = await this.evaluateKnowledgeContribution(client, peUserId, startDate, endDate);
      
      // 3. 기술 역량 (20%)
      const technicalSkills = await this.evaluateTechnicalSkills(client, peUserId, startDate, endDate);
      
      // 4. 협업 능력 (10%)
      const collaborationSkills = await this.evaluateCollaborationSkills(client, peUserId, startDate, endDate);

      // 종합 점수 계산
      const overallScore = 
        (projectPerformance.score * 0.4) +
        (knowledgeContribution.score * 0.3) +
        (technicalSkills.score * 0.2) +
        (collaborationSkills.score * 0.1);

      // 성과 등급 결정
      const performanceGrade = this.calculatePerformanceGrade(overallScore);

      // 개선 제안사항 생성
      const improvementSuggestions = this.generateImprovementSuggestions({
        projectPerformance,
        knowledgeContribution,
        technicalSkills,
        collaborationSkills
      });

      const result = {
        pe_user_id: peUserId,
        evaluation_period: evaluationPeriod,
        evaluation_date: endDate.toISOString(),
        overall_score: Math.round(overallScore * 100) / 100,
        performance_grade: performanceGrade,
        detailed_scores: {
          project_performance: projectPerformance,
          knowledge_contribution: knowledgeContribution,
          technical_skills: technicalSkills,
          collaboration_skills: collaborationSkills
        },
        improvement_suggestions: improvementSuggestions,
        next_evaluation_date: new Date(endDate.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()
      };

      // 평가 결과 저장
      await this.savePerformanceEvaluation(client, result);

      console.log('✅ PE 종합 성과 평가 완료:', { peUserId, overallScore, performanceGrade });

      return result;

    } finally {
      client.release();
    }
  }

  // [advice from AI] 1. 프로젝트 성과 평가 (40%)
  async evaluateProjectPerformance(client, peUserId, startDate, endDate) {
    // 프로젝트 완료율, 품질, 납기 준수율 평가
    const projectResult = await client.query(`
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN pwa.assignment_status = 'completed' THEN 1 END) as completed_assignments,
        AVG(pwa.progress_percentage) as avg_progress,
        AVG(CASE 
          WHEN pwa.completed_at <= p.deadline THEN 100 
          WHEN pwa.completed_at > p.deadline THEN 50
          ELSE 75 
        END) as deadline_adherence_score,
        AVG(pwa.quality_score) as avg_quality_score
      FROM project_work_assignments pwa
      JOIN projects p ON pwa.project_id = p.id
      WHERE pwa.assigned_to = $1 
        AND pwa.assigned_at BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    const project = projectResult.rows[0];
    
    // Git 활동 분석
    const gitResult = await client.query(`
      SELECT 
        SUM(pga.total_commits) as total_commits,
        SUM(pga.total_lines_added) as total_lines_added,
        SUM(pga.total_lines_deleted) as total_lines_deleted,
        AVG(pga.activity_score) as avg_activity_score
      FROM project_git_analytics pga
      JOIN project_repositories pr ON pga.repository_id = pr.id
      JOIN project_work_assignments pwa ON pr.project_id = pwa.project_id
      WHERE pwa.assigned_to = $1 
        AND pga.analysis_date BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    const git = gitResult.rows[0];

    // 프로젝트 성과 점수 계산 (0-100)
    const completionRate = project.total_assignments > 0 ? 
      (project.completed_assignments / project.total_assignments) * 100 : 0;
    const progressScore = project.avg_progress || 0;
    const deadlineScore = project.deadline_adherence_score || 75;
    const qualityScore = project.avg_quality_score || 80;
    const gitActivityScore = Math.min((git.total_commits || 0) * 2, 100);

    const projectScore = (
      completionRate * 0.3 +
      progressScore * 0.25 +
      deadlineScore * 0.25 +
      qualityScore * 0.1 +
      gitActivityScore * 0.1
    ) / 100;

    return {
      score: Math.min(projectScore, 1.0),
      details: {
        total_projects: parseInt(project.total_assignments),
        completed_projects: parseInt(project.completed_assignments),
        completion_rate: Math.round(completionRate),
        average_progress: Math.round(project.avg_progress || 0),
        deadline_adherence: Math.round(deadlineScore),
        quality_score: Math.round(qualityScore),
        git_commits: parseInt(git.total_commits || 0),
        lines_of_code: parseInt((git.total_lines_added || 0) + (git.total_lines_deleted || 0))
      }
    };
  }

  // [advice from AI] 2. 지식 기여도 평가 (30%)
  async evaluateKnowledgeContribution(client, peUserId, startDate, endDate) {
    // 코드 컴포넌트 등록
    const codeResult = await client.query(`
      SELECT COUNT(*) as code_components_count
      FROM code_components 
      WHERE created_by = $1 
        AND created_at BETWEEN $2 AND $3
        AND approval_status = 'approved'
    `, [peUserId, startDate, endDate]);

    // 문서 가이드 작성
    const docResult = await client.query(`
      SELECT COUNT(*) as document_guides_count
      FROM document_guides 
      WHERE created_by = $1 
        AND created_at BETWEEN $2 AND $3
        AND approval_status = 'approved'
    `, [peUserId, startDate, endDate]);

    // 지식자산 사용률 (다른 PE들이 얼마나 사용했는지)
    const usageResult = await client.query(`
      SELECT COUNT(*) as usage_count
      FROM knowledge_asset_usage kau
      JOIN code_components cc ON kau.asset_id = cc.id
      WHERE cc.created_by = $1 
        AND kau.used_at BETWEEN $2 AND $3
      UNION ALL
      SELECT COUNT(*) as usage_count
      FROM knowledge_asset_usage kau
      JOIN document_guides dg ON kau.asset_id = dg.id
      WHERE dg.created_by = $1 
        AND kau.used_at BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    const codeCount = parseInt(codeResult.rows[0].code_components_count);
    const docCount = parseInt(docResult.rows[0].document_guides_count);
    const usageCount = usageResult.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0);

    // 지식 기여 점수 계산
    const codeScore = Math.min(codeCount * 20, 40); // 최대 40점
    const docScore = Math.min(docCount * 15, 30); // 최대 30점  
    const usageScore = Math.min(usageCount * 3, 30); // 최대 30점

    const knowledgeScore = (codeScore + docScore + usageScore) / 100;

    return {
      score: Math.min(knowledgeScore, 1.0),
      details: {
        code_components_created: codeCount,
        document_guides_created: docCount,
        knowledge_assets_used_by_others: usageCount,
        contribution_score: Math.round((codeScore + docScore + usageScore))
      }
    };
  }

  // [advice from AI] 3. 기술 역량 평가 (20%)
  async evaluateTechnicalSkills(client, peUserId, startDate, endDate) {
    // 신규 기술 스택 도입
    const techResult = await client.query(`
      SELECT 
        COUNT(DISTINCT pr.tech_stack) as unique_tech_count,
        AVG(pga.code_quality_score) as avg_code_quality,
        AVG(pga.documentation_score) as avg_documentation
      FROM project_repositories pr
      JOIN project_work_assignments pwa ON pr.project_id = pwa.project_id
      LEFT JOIN project_git_analytics pga ON pr.id = pga.repository_id
      WHERE pwa.assigned_to = $1 
        AND pwa.assigned_at BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    // 코드 리뷰 참여도
    const reviewResult = await client.query(`
      SELECT COUNT(*) as code_reviews_given
      FROM project_code_reviews 
      WHERE reviewer_id = $1 
        AND review_date BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    const tech = techResult.rows[0];
    const uniqueTechCount = parseInt(tech.unique_tech_count || 0);
    const codeQuality = tech.avg_code_quality || 70;
    const documentation = tech.avg_documentation || 60;
    const codeReviews = parseInt(reviewResult.rows[0].code_reviews_given || 0);

    // 기술 역량 점수 계산
    const techDiversityScore = Math.min(uniqueTechCount * 15, 30);
    const qualityScore = (codeQuality / 100) * 40;
    const docScore = (documentation / 100) * 20;
    const reviewScore = Math.min(codeReviews * 5, 10);

    const technicalScore = (techDiversityScore + qualityScore + docScore + reviewScore) / 100;

    return {
      score: Math.min(technicalScore, 1.0),
      details: {
        unique_technologies_used: uniqueTechCount,
        code_quality_score: Math.round(codeQuality),
        documentation_score: Math.round(documentation),
        code_reviews_given: codeReviews
      }
    };
  }

  // [advice from AI] 4. 협업 능력 평가 (10%)
  async evaluateCollaborationSkills(client, peUserId, startDate, endDate) {
    // 멘토링 활동
    const mentorResult = await client.query(`
      SELECT COUNT(*) as mentoring_sessions
      FROM pe_mentoring_sessions 
      WHERE mentor_id = $1 
        AND session_date BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    // 지식 공유 활동 (세미나, 발표 등)
    const sharingResult = await client.query(`
      SELECT COUNT(*) as knowledge_sharing_sessions
      FROM knowledge_sharing_sessions 
      WHERE presenter_id = $1 
        AND session_date BETWEEN $2 AND $3
    `, [peUserId, startDate, endDate]);

    // 팀 프로젝트 참여도
    const teamResult = await client.query(`
      SELECT COUNT(*) as team_projects
      FROM project_work_assignments pwa
      JOIN projects p ON pwa.project_id = p.id
      WHERE pwa.assigned_to = $1 
        AND pwa.assigned_at BETWEEN $2 AND $3
        AND (SELECT COUNT(*) FROM project_work_assignments pwa2 WHERE pwa2.project_id = p.id) > 1
    `, [peUserId, startDate, endDate]);

    const mentoring = parseInt(mentorResult.rows[0].mentoring_sessions || 0);
    const sharing = parseInt(sharingResult.rows[0].knowledge_sharing_sessions || 0);
    const teamProjects = parseInt(teamResult.rows[0].team_projects || 0);

    // 협업 능력 점수 계산
    const mentorScore = Math.min(mentoring * 30, 40);
    const shareScore = Math.min(sharing * 25, 30);
    const teamScore = Math.min(teamProjects * 10, 30);

    const collaborationScore = (mentorScore + shareScore + teamScore) / 100;

    return {
      score: Math.min(collaborationScore, 1.0),
      details: {
        mentoring_sessions: mentoring,
        knowledge_sharing_sessions: sharing,
        team_projects_participated: teamProjects
      }
    };
  }

  // [advice from AI] 성과 등급 계산
  calculatePerformanceGrade(overallScore) {
    if (overallScore >= 0.9) return 'S'; // 탁월
    if (overallScore >= 0.8) return 'A'; // 우수
    if (overallScore >= 0.7) return 'B'; // 양호
    if (overallScore >= 0.6) return 'C'; // 보통
    return 'D'; // 개선필요
  }

  // [advice from AI] 개선 제안사항 생성
  generateImprovementSuggestions(scores) {
    const suggestions = [];

    // 프로젝트 성과
    if (scores.projectPerformance.score < 0.7) {
      suggestions.push({
        category: 'project_performance',
        priority: 'high',
        suggestion: '프로젝트 완료율과 납기 준수율 향상이 필요합니다. 작업 계획 수립과 진행 관리에 더 집중해주세요.'
      });
    }

    // 지식 기여도
    if (scores.knowledgeContribution.score < 0.5) {
      suggestions.push({
        category: 'knowledge_contribution',
        priority: 'medium',
        suggestion: '지식자산 등록과 문서화를 늘려주세요. 개발한 코드를 컴포넌트화하여 공유하는 것을 추천합니다.'
      });
    }

    // 기술 역량
    if (scores.technicalSkills.score < 0.6) {
      suggestions.push({
        category: 'technical_skills',
        priority: 'medium',
        suggestion: '새로운 기술 스택 학습과 코드 품질 향상에 투자해주세요. 코드 리뷰 참여도 늘려보세요.'
      });
    }

    // 협업 능력
    if (scores.collaborationSkills.score < 0.4) {
      suggestions.push({
        category: 'collaboration_skills',
        priority: 'low',
        suggestion: '멘토링이나 지식 공유 활동에 참여해보세요. 팀 프로젝트에서 더 적극적인 역할을 해주세요.'
      });
    }

    return suggestions;
  }

  // [advice from AI] 성과 평가 결과 저장
  async savePerformanceEvaluation(client, evaluationResult) {
    await client.query(`
      INSERT INTO pe_performance_evaluations (
        pe_user_id, evaluation_date, evaluation_period, overall_score,
        performance_grade, project_score, knowledge_score, technical_score,
        collaboration_score, detailed_metrics, improvement_suggestions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (pe_user_id, evaluation_date::date) 
      DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        performance_grade = EXCLUDED.performance_grade,
        project_score = EXCLUDED.project_score,
        knowledge_score = EXCLUDED.knowledge_score,
        technical_score = EXCLUDED.technical_score,
        collaboration_score = EXCLUDED.collaboration_score,
        detailed_metrics = EXCLUDED.detailed_metrics,
        improvement_suggestions = EXCLUDED.improvement_suggestions
    `, [
      evaluationResult.pe_user_id,
      evaluationResult.evaluation_date,
      evaluationResult.evaluation_period,
      evaluationResult.overall_score,
      evaluationResult.performance_grade,
      evaluationResult.detailed_scores.project_performance.score,
      evaluationResult.detailed_scores.knowledge_contribution.score,
      evaluationResult.detailed_scores.technical_skills.score,
      evaluationResult.detailed_scores.collaboration_skills.score,
      JSON.stringify(evaluationResult.detailed_scores),
      JSON.stringify(evaluationResult.improvement_suggestions)
    ]);
  }
}

module.exports = PEPerformanceService;
