// [advice from AI] 일일 배치 작업 스케줄러 서비스

const cron = require('node-cron');
const GitAnalyticsService = require('./gitAnalyticsService');

class SchedulerService {
  constructor() {
    this.gitAnalyticsService = new GitAnalyticsService();
    this.jobs = new Map();
  }

  // [advice from AI] 스케줄러 시작
  async start() {
    try {
      console.log('📅 스케줄러 서비스 시작...');
      
      // Git 분석 테이블 초기화
      await this.gitAnalyticsService.ensureGitAnalyticsTable();
      
      // 일일 진행률 업데이트 작업 (매일 오전 6시)
      this.scheduleDailyProgressUpdate();
      
      // 주간 리포트 생성 작업 (매주 월요일 오전 7시)
      this.scheduleWeeklyReport();
      
      // 긴급 프로젝트 알림 작업 (매 시간)
      this.scheduleUrgentProjectAlerts();
      
      console.log('✅ 모든 스케줄 작업이 등록되었습니다');
      
    } catch (error) {
      console.error('❌ 스케줄러 시작 실패:', error);
    }
  }

  // [advice from AI] 일일 진행률 업데이트 스케줄
  scheduleDailyProgressUpdate() {
    // 매일 오전 6시에 실행 (서버 시간 기준)
    const dailyJob = cron.schedule('0 6 * * *', async () => {
      try {
        console.log('🌅 일일 진행률 업데이트 작업 시작...');
        const startTime = Date.now();
        
        const results = await this.gitAnalyticsService.updateAllProjectsProgress();
        
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        
        console.log(`✅ 일일 진행률 업데이트 완료`);
        console.log(`   📊 처리 결과: 성공 ${successCount}개, 실패 ${errorCount}개`);
        console.log(`   ⏱️ 소요 시간: ${duration}초`);
        
        // 결과를 데이터베이스에 로깅
        await this.logBatchJobResult('daily_progress_update', {
          total_projects: results.length,
          success_count: successCount,
          error_count: errorCount,
          duration_seconds: duration,
          results: results
        });
        
      } catch (error) {
        console.error('❌ 일일 진행률 업데이트 실패:', error);
        await this.logBatchJobResult('daily_progress_update', {
          error: error.message,
          status: 'failed'
        });
      }
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });
    
    this.jobs.set('dailyProgressUpdate', dailyJob);
    console.log('📅 일일 진행률 업데이트 작업 스케줄 등록 완료 (매일 06:00)');
  }

  // [advice from AI] 주간 리포트 생성 스케줄
  scheduleWeeklyReport() {
    // 매주 월요일 오전 7시에 실행
    const weeklyJob = cron.schedule('0 7 * * 1', async () => {
      try {
        console.log('📈 주간 리포트 생성 작업 시작...');
        
        await this.generateWeeklyReport();
        
        console.log('✅ 주간 리포트 생성 완료');
        
      } catch (error) {
        console.error('❌ 주간 리포트 생성 실패:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });
    
    this.jobs.set('weeklyReport', weeklyJob);
    console.log('📅 주간 리포트 생성 작업 스케줄 등록 완료 (매주 월요일 07:00)');
  }

  // [advice from AI] 긴급 프로젝트 알림 스케줄
  scheduleUrgentProjectAlerts() {
    // 매 시간 정각에 실행
    const urgentAlertsJob = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🚨 긴급 프로젝트 알림 체크 시작...');
        
        await this.checkUrgentProjectAlerts();
        
        console.log('✅ 긴급 프로젝트 알림 체크 완료');
        
      } catch (error) {
        console.error('❌ 긴급 프로젝트 알림 체크 실패:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });
    
    this.jobs.set('urgentAlerts', urgentAlertsJob);
    console.log('📅 긴급 프로젝트 알림 작업 스케줄 등록 완료 (매시간 정각)');
  }

  // [advice from AI] 주간 리포트 생성
  async generateWeeklyReport() {
    try {
      const client = await this.gitAnalyticsService.pool.connect();
      
      try {
        // 지난 주 프로젝트 진행률 변화 조회
        const weeklyProgressResult = await client.query(`
          SELECT 
            p.id,
            p.name,
            p.progress_rate as current_progress,
            pga.calculated_progress as git_progress,
            pga.total_commits,
            pga.commits_last_7_days,
            pga.activity_score,
            pga.analysis_date
          FROM projects p
          LEFT JOIN project_git_analytics pga ON p.id = pga.project_id
          WHERE p.project_status IN ('in_progress', 'development')
            AND pga.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY p.updated_at DESC
        `);
        
        // 주간 리포트 데이터 생성
        const weeklyReport = {
          report_date: new Date().toISOString(),
          total_active_projects: weeklyProgressResult.rows.length,
          projects_with_progress: weeklyProgressResult.rows.filter(p => p.commits_last_7_days > 0).length,
          average_progress: weeklyProgressResult.rows.reduce((sum, p) => sum + (p.current_progress || 0), 0) / weeklyProgressResult.rows.length,
          total_commits_this_week: weeklyProgressResult.rows.reduce((sum, p) => sum + (p.commits_last_7_days || 0), 0),
          projects: weeklyProgressResult.rows
        };
        
        // 주간 리포트 저장
        await client.query(`
          INSERT INTO weekly_reports (
            report_date, report_data, created_at
          ) VALUES ($1, $2, NOW())
        `, [
          new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식
          JSON.stringify(weeklyReport)
        ]);
        
        console.log('📊 주간 리포트 생성 및 저장 완료');
        return weeklyReport;
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ 주간 리포트 생성 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 긴급 프로젝트 알림 체크
  async checkUrgentProjectAlerts() {
    try {
      const client = await this.gitAnalyticsService.pool.connect();
      
      try {
        // 긴급 상황 프로젝트 조회
        const urgentProjectsResult = await client.query(`
          SELECT 
            p.id,
            p.name,
            p.urgency_level,
            p.deadline,
            p.progress_rate,
            pga.commits_last_7_days,
            pga.last_commit_date,
            CASE 
              WHEN p.deadline IS NOT NULL THEN 
                EXTRACT(days FROM (p.deadline - CURRENT_DATE))
              ELSE NULL
            END as days_to_deadline
          FROM projects p
          LEFT JOIN project_git_analytics pga ON p.id = pga.project_id
          WHERE p.project_status IN ('in_progress', 'development')
            AND (
              -- 마감 7일 전이면서 진행률 50% 미만
              (p.deadline IS NOT NULL 
               AND EXTRACT(days FROM (p.deadline - CURRENT_DATE)) <= 7 
               AND p.progress_rate < 50)
              -- 또는 지난 3일간 커밋이 없는 긴급 프로젝트
              OR (p.urgency_level IN ('high', 'critical') 
                  AND (pga.last_commit_date IS NULL 
                       OR pga.last_commit_date < CURRENT_DATE - INTERVAL '3 days'))
            )
        `);
        
        // 알림 생성
        for (const project of urgentProjectsResult.rows) {
          let alertMessage = '';
          let alertType = 'warning';
          
          if (project.days_to_deadline !== null && project.days_to_deadline <= 7 && project.progress_rate < 50) {
            alertMessage = `프로젝트 "${project.name}"의 마감일이 ${project.days_to_deadline}일 남았으나 진행률이 ${project.progress_rate}%입니다.`;
            alertType = 'deadline_warning';
          } else if (project.urgency_level === 'critical' && project.commits_last_7_days === 0) {
            alertMessage = `긴급 프로젝트 "${project.name}"에서 최근 7일간 활동이 없습니다.`;
            alertType = 'activity_warning';
          }
          
          if (alertMessage) {
            // 중복 알림 방지를 위한 체크
            const existingAlert = await client.query(`
              SELECT id FROM notifications 
              WHERE target_type = 'project' 
                AND target_id = $1 
                AND alert_type = $2
                AND created_at > CURRENT_DATE - INTERVAL '1 day'
            `, [project.id, alertType]);
            
            if (existingAlert.rows.length === 0) {
              // 새 알림 생성
              await client.query(`
                INSERT INTO notifications (
                  recipient_id, title, message, alert_type, priority,
                  target_type, target_id, created_at
                ) VALUES (
                  (SELECT created_by FROM projects WHERE id = $1), 
                  $2, $3, $4, $5, 'project', $1, NOW()
                )
              `, [
                project.id,
                '프로젝트 진행 알림',
                alertMessage,
                alertType,
                project.urgency_level === 'critical' ? 'high' : 'medium'
              ]);
              
              console.log(`🚨 알림 생성: ${alertMessage}`);
            }
          }
        }
        
        console.log(`📋 긴급 프로젝트 체크 완료: ${urgentProjectsResult.rows.length}개 프로젝트 검토`);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ 긴급 프로젝트 알림 체크 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 배치 작업 결과 로깅
  async logBatchJobResult(jobName, result) {
    try {
      const client = await this.gitAnalyticsService.pool.connect();
      
      try {
        // 배치 작업 로그 테이블 생성 (없는 경우)
        await client.query(`
          CREATE TABLE IF NOT EXISTS batch_job_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_name VARCHAR(100) NOT NULL,
            execution_date TIMESTAMP NOT NULL DEFAULT NOW(),
            result_data JSONB,
            status VARCHAR(50) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        // 로그 저장
        await client.query(`
          INSERT INTO batch_job_logs (job_name, result_data, status)
          VALUES ($1, $2, $3)
        `, [jobName, JSON.stringify(result), result.status || 'completed']);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ 배치 작업 로그 저장 실패:', error);
    }
  }

  // [advice from AI] 수동 진행률 업데이트 (테스트용)
  async runManualProgressUpdate() {
    try {
      console.log('🔧 수동 진행률 업데이트 실행...');
      
      const results = await this.gitAnalyticsService.updateAllProjectsProgress();
      
      console.log('✅ 수동 진행률 업데이트 완료');
      return results;
      
    } catch (error) {
      console.error('❌ 수동 진행률 업데이트 실패:', error);
      throw error;
    }
  }

  // [advice from AI] 스케줄러 중지
  stop() {
    try {
      console.log('📅 스케줄러 서비스 중지 중...');
      
      this.jobs.forEach((job, name) => {
        job.stop();
        console.log(`   ⏹️ ${name} 작업 중지됨`);
      });
      
      this.jobs.clear();
      console.log('✅ 모든 스케줄 작업이 중지되었습니다');
      
    } catch (error) {
      console.error('❌ 스케줄러 중지 실패:', error);
    }
  }

  // [advice from AI] 스케줄 상태 조회
  getScheduleStatus() {
    const schedules = [];
    
    this.jobs.forEach((job, name) => {
      schedules.push({
        name: name,
        running: job.running,
        scheduled: job.scheduled
      });
    });
    
    return {
      total_jobs: schedules.length,
      schedules: schedules
    };
  }
}

module.exports = SchedulerService;
