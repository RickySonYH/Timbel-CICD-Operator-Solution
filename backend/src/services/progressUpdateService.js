// [advice from AI] PE 보고서 기반 프로젝트 진행 현황 자동 업데이트 서비스

const { Pool } = require('pg');

class ProgressUpdateService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
  }

  // [advice from AI] PE 보고서 제출 시 프로젝트 진행률 자동 업데이트
  async updateProjectProgressFromReport(reportData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      console.log('📊 보고서 기반 프로젝트 진행률 업데이트 시작:', reportData.pe_user_id);

      // 1. PE의 현재 할당된 프로젝트 조회
      const assignmentResult = await client.query(`
        SELECT 
          pwa.*,
          p.name as project_name,
          p.urgency_level,
          p.deadline
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        WHERE pwa.assigned_to = $1 
          AND pwa.assignment_status IN ('assigned', 'in_progress')
        ORDER BY pwa.assigned_at DESC
        LIMIT 1
      `, [reportData.pe_user_id]);

      if (assignmentResult.rows.length === 0) {
        console.log('⚠️ 활성 프로젝트 할당이 없습니다.');
        await client.query('ROLLBACK');
        return { success: false, message: '활성 프로젝트가 없습니다.' };
      }

      const assignment = assignmentResult.rows[0];

      // 2. 보고서에서 진행률 추출 및 검증
      const reportProgress = reportData.progress_percentage || assignment.progress_percentage;
      const progressDiff = reportProgress - assignment.progress_percentage;

      // 3. GitHub 활동 데이터와 비교 검증
      let adjustedProgress = reportProgress;
      const gitAnalytics = await this.getGitAnalytics(assignment.project_id);
      
      if (gitAnalytics) {
        // Git 활동 기반 진행률 보정
        const gitProgressScore = this.calculateGitProgressScore(gitAnalytics);
        adjustedProgress = Math.round((reportProgress * 0.7) + (gitProgressScore * 0.3));
      }

      // 4. 프로젝트 할당 정보 업데이트
      await client.query(`
        UPDATE project_work_assignments 
        SET 
          progress_percentage = $1,
          updated_at = NOW(),
          pe_notes = $2,
          assignment_history = assignment_history || $3
        WHERE id = $4
      `, [
        adjustedProgress,
        reportData.developer_comments || '',
        JSON.stringify({
          action: 'progress_updated_from_report',
          timestamp: new Date().toISOString(),
          report_progress: reportProgress,
          git_adjusted_progress: adjustedProgress,
          progress_diff: progressDiff,
          report_content: reportData.content?.substring(0, 200) || ''
        }),
        assignment.id
      ]);

      // 5. 프로젝트 상태 자동 업데이트
      let newProjectStatus = assignment.assignment_status;
      if (adjustedProgress >= 100) {
        newProjectStatus = 'completed';
      } else if (adjustedProgress >= 80) {
        newProjectStatus = 'testing';
      } else if (adjustedProgress >= 20) {
        newProjectStatus = 'in_development';
      }

      if (newProjectStatus !== assignment.assignment_status) {
        await client.query(`
          UPDATE project_work_assignments 
          SET assignment_status = $1 
          WHERE id = $2
        `, [newProjectStatus, assignment.id]);
      }

      // 6. 마일스톤 달성도 업데이트
      if (reportData.milestones_completed && reportData.milestones_completed.length > 0) {
        for (const milestone of reportData.milestones_completed) {
          await client.query(`
            UPDATE project_progress_milestones 
            SET 
              status = 'completed',
              completed_date = NOW(),
              completion_notes = $1
            WHERE work_assignment_id = $2 AND milestone_name = $3
          `, [milestone.notes || '', assignment.id, milestone.name]);
        }
      }

      // 7. 지연 위험 감지 및 알림
      const riskLevel = this.calculateRiskLevel(assignment, adjustedProgress, progressDiff);
      if (riskLevel === 'high') {
        await this.sendRiskAlert(client, assignment, adjustedProgress, reportData);
      }

      // 8. 진행 현황 히스토리 저장
      await client.query(`
        INSERT INTO project_progress_snapshots (
          project_id, work_assignment_id, snapshot_date, progress_percentage,
          git_commits, git_lines_added, git_files_changed, pe_comments,
          milestone_completion_rate, risk_level
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9)
      `, [
        assignment.project_id,
        assignment.id,
        adjustedProgress,
        gitAnalytics?.total_commits || 0,
        gitAnalytics?.total_lines_added || 0,
        gitAnalytics?.code_files || 0,
        reportData.developer_comments || '',
        await this.calculateMilestoneCompletionRate(client, assignment.id),
        riskLevel
      ]);

      await client.query('COMMIT');

      console.log('✅ 프로젝트 진행률 업데이트 완료:', {
        project: assignment.project_name,
        oldProgress: assignment.progress_percentage,
        newProgress: adjustedProgress,
        status: newProjectStatus
      });

      return {
        success: true,
        data: {
          project_name: assignment.project_name,
          old_progress: assignment.progress_percentage,
          new_progress: adjustedProgress,
          status: newProjectStatus,
          risk_level: riskLevel
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] Git 분석 데이터 조회
  async getGitAnalytics(projectId) {
    try {
      const client = await this.pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM project_git_analytics 
          WHERE project_id = $1 
          ORDER BY analysis_date DESC 
          LIMIT 1
        `, [projectId]);
        
        return result.rows.length > 0 ? result.rows[0] : null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Git 분석 데이터 조회 실패:', error);
      return null;
    }
  }

  // [advice from AI] Git 활동 기반 진행률 점수 계산
  calculateGitProgressScore(gitAnalytics) {
    if (!gitAnalytics) return 0;

    // 커밋 빈도 점수 (0-30점)
    const commitScore = Math.min(gitAnalytics.total_commits * 2, 30);
    
    // 코드 변경량 점수 (0-40점)  
    const codeChangeScore = Math.min((gitAnalytics.total_lines_added + gitAnalytics.total_lines_deleted) / 100, 40);
    
    // 파일 다양성 점수 (0-20점)
    const fileScore = Math.min(gitAnalytics.code_files * 2, 20);
    
    // 문서화 점수 (0-10점)
    const docScore = gitAnalytics.has_readme ? 10 : 0;

    return Math.min(commitScore + codeChangeScore + fileScore + docScore, 100);
  }

  // [advice from AI] 프로젝트 위험도 계산
  calculateRiskLevel(assignment, currentProgress, progressDiff) {
    const daysToDeadline = Math.ceil((new Date(assignment.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const expectedProgress = Math.max(0, 100 - (daysToDeadline * 2)); // 하루 2% 기준
    
    // 진행률 지연 정도
    const progressGap = expectedProgress - currentProgress;
    
    // 최근 진행 속도
    const recentProgressRate = progressDiff;

    if (progressGap > 20 || (daysToDeadline < 7 && currentProgress < 80)) {
      return 'high';
    } else if (progressGap > 10 || recentProgressRate < 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // [advice from AI] 위험 알림 전송
  async sendRiskAlert(client, assignment, currentProgress, reportData) {
    // PO에게 위험 알림
    await client.query(`
      INSERT INTO notifications (
        recipient_id, title, message, notification_type, notification_category,
        related_project_id, related_assignment_id, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      assignment.assigned_by,
      '⚠️ 프로젝트 진행 위험 감지',
      `"${assignment.project_name}" 프로젝트의 진행이 지연되고 있습니다. 현재 진행률: ${currentProgress}%`,
      'warning',
      'project_risk',
      assignment.project_id,
      assignment.id,
      false
    ]);
  }

  // [advice from AI] 마일스톤 완료율 계산
  async calculateMilestoneCompletionRate(client, assignmentId) {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_milestones,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_milestones
      FROM project_progress_milestones 
      WHERE work_assignment_id = $1
    `, [assignmentId]);

    if (result.rows[0].total_milestones === 0) return 100;
    return Math.round((result.rows[0].completed_milestones / result.rows[0].total_milestones) * 100);
  }
}

module.exports = ProgressUpdateService;
