// [advice from AI] 파이프라인 실행 이력 추적 서비스
// 모든 파이프라인 실행을 추적하고 통계를 제공

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class PipelineHistoryService {
  constructor() {
    this.pool = new Pool({
      host: process.env.OPERATIONS_DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'timbel_admin',
      password: process.env.DB_PASSWORD || 'timbel2024!',
      database: process.env.OPERATIONS_DB_NAME || 'timbel_cicd_operator',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    console.log('📊 PipelineHistoryService 초기화 완료');
  }

  /**
   * 파이프라인 실행 시작 기록
   */
  async startExecution(executionData) {
    try {
      const executionId = executionData.execution_id || `exec-${uuidv4()}`;
      
      const query = `
        INSERT INTO pipeline_executions (
          execution_id, pipeline_id, pipeline_name, template_id,
          status, trigger_type, trigger_by, trigger_reason,
          repository_url, branch, commit_hash, commit_message, commit_author,
          started_at, build_number, jenkins_job_name,
          deployment_target, namespace, cluster_id,
          requires_approval, environment_variables, parameters, tags
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING *
      `;
      
      const values = [
        executionId,
        executionData.pipeline_id,
        executionData.pipeline_name,
        executionData.template_id || null,
        'running',
        executionData.trigger_type || 'manual',
        executionData.trigger_by || 'system',
        executionData.trigger_reason || null,
        executionData.repository_url || null,
        executionData.branch || 'main',
        executionData.commit_hash || null,
        executionData.commit_message || null,
        executionData.commit_author || null,
        new Date(),
        executionData.build_number || null,
        executionData.jenkins_job_name || null,
        executionData.deployment_target || 'development',
        executionData.namespace || 'default',
        executionData.cluster_id || null,
        executionData.requires_approval || false,
        JSON.stringify(executionData.environment_variables || {}),
        JSON.stringify(executionData.parameters || {}),
        executionData.tags || []
      ];
      
      const result = await this.pool.query(query, values);
      
      console.log(`✅ 파이프라인 실행 시작 기록: ${executionId}`);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 파이프라인 실행 시작 기록 실패:', error);
      throw error;
    }
  }

  /**
   * 파이프라인 실행 완료 기록
   */
  async completeExecution(executionId, completionData) {
    try {
      const query = `
        UPDATE pipeline_executions
        SET 
          status = $2,
          finished_at = $3,
          docker_image = $4,
          docker_tag = $5,
          registry_url = $6,
          tests_total = $7,
          tests_passed = $8,
          tests_failed = $9,
          tests_skipped = $10,
          test_coverage_percent = $11,
          error_message = $12,
          error_stage = $13,
          build_url = $14,
          updated_at = NOW()
        WHERE execution_id = $1
        RETURNING *
      `;
      
      const values = [
        executionId,
        completionData.status || 'success',
        new Date(),
        completionData.docker_image || null,
        completionData.docker_tag || null,
        completionData.registry_url || null,
        completionData.tests_total || 0,
        completionData.tests_passed || 0,
        completionData.tests_failed || 0,
        completionData.tests_skipped || 0,
        completionData.test_coverage_percent || null,
        completionData.error_message || null,
        completionData.error_stage || null,
        completionData.build_url || null
      ];
      
      const result = await this.pool.query(query, values);
      
      console.log(`✅ 파이프라인 실행 완료 기록: ${executionId} (${completionData.status})`);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 파이프라인 실행 완료 기록 실패:', error);
      throw error;
    }
  }

  /**
   * 스테이지 실행 시작 기록
   */
  async startStageExecution(executionId, stageData) {
    try {
      const query = `
        INSERT INTO pipeline_stage_executions (
          execution_id, stage_name, stage_order,
          status, started_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        executionId,
        stageData.stage_name,
        stageData.stage_order,
        'running',
        new Date()
      ];
      
      const result = await this.pool.query(query, values);
      
      console.log(`📝 스테이지 실행 시작: ${stageData.stage_name}`);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 스테이지 실행 시작 기록 실패:', error);
      throw error;
    }
  }

  /**
   * 스테이지 실행 완료 기록
   */
  async completeStageExecution(stageId, completionData) {
    try {
      const query = `
        UPDATE pipeline_stage_executions
        SET 
          status = $2,
          finished_at = $3,
          log_content = $4,
          error_message = $5,
          exit_code = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [
        stageId,
        completionData.status || 'success',
        new Date(),
        completionData.log_content || null,
        completionData.error_message || null,
        completionData.exit_code || 0
      ];
      
      const result = await this.pool.query(query, values);
      
      console.log(`✅ 스테이지 실행 완료: ${stageId} (${completionData.status})`);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 스테이지 실행 완료 기록 실패:', error);
      throw error;
    }
  }

  /**
   * 아티팩트 추가
   */
  async addArtifact(executionId, artifactData) {
    try {
      const query = `
        INSERT INTO pipeline_artifacts (
          execution_id, stage_id, artifact_type, artifact_name,
          artifact_path, artifact_url, size_bytes, checksum,
          metadata, retention_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        executionId,
        artifactData.stage_id || null,
        artifactData.artifact_type,
        artifactData.artifact_name,
        artifactData.artifact_path || null,
        artifactData.artifact_url || null,
        artifactData.size_bytes || null,
        artifactData.checksum || null,
        JSON.stringify(artifactData.metadata || {}),
        artifactData.retention_days || 30
      ];
      
      const result = await this.pool.query(query, values);
      
      console.log(`📦 아티팩트 추가: ${artifactData.artifact_name}`);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 아티팩트 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 메트릭 기록
   */
  async recordMetric(executionId, metricData) {
    try {
      const query = `
        INSERT INTO pipeline_metrics (
          execution_id, metric_name, metric_value,
          metric_unit, metric_type, tags
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        executionId,
        metricData.metric_name,
        metricData.metric_value,
        metricData.metric_unit || null,
        metricData.metric_type || 'gauge',
        JSON.stringify(metricData.tags || {})
      ];
      
      const result = await this.pool.query(query, values);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 메트릭 기록 실패:', error);
      throw error;
    }
  }

  /**
   * 실행 이력 조회
   */
  async getExecutionHistory(filters = {}) {
    try {
      let query = `
        SELECT * FROM pipeline_execution_summary
        WHERE 1=1
      `;
      
      const values = [];
      let paramIndex = 1;
      
      if (filters.pipeline_id) {
        query += ` AND pipeline_id = $${paramIndex++}`;
        values.push(filters.pipeline_id);
      }
      
      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filters.status);
      }
      
      if (filters.trigger_type) {
        query += ` AND trigger_type = $${paramIndex++}`;
        values.push(filters.trigger_type);
      }
      
      if (filters.deployment_target) {
        query += ` AND deployment_target = $${paramIndex++}`;
        values.push(filters.deployment_target);
      }
      
      if (filters.from_date) {
        query += ` AND started_at >= $${paramIndex++}`;
        values.push(filters.from_date);
      }
      
      if (filters.to_date) {
        query += ` AND started_at <= $${paramIndex++}`;
        values.push(filters.to_date);
      }
      
      query += ` ORDER BY started_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(filters.limit);
      }
      
      const result = await this.pool.query(query, values);
      return result.rows;
      
    } catch (error) {
      console.error('❌ 실행 이력 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 실행 상세 조회
   */
  async getExecutionDetail(executionId) {
    try {
      // 실행 정보
      const executionQuery = `SELECT * FROM pipeline_executions WHERE execution_id = $1`;
      const executionResult = await this.pool.query(executionQuery, [executionId]);
      
      if (executionResult.rows.length === 0) {
        return null;
      }
      
      const execution = executionResult.rows[0];
      
      // 스테이지 정보
      const stagesQuery = `
        SELECT * FROM pipeline_stage_executions 
        WHERE execution_id = $1 
        ORDER BY stage_order
      `;
      const stagesResult = await this.pool.query(stagesQuery, [executionId]);
      
      // 아티팩트 정보
      const artifactsQuery = `
        SELECT * FROM pipeline_artifacts 
        WHERE execution_id = $1
      `;
      const artifactsResult = await this.pool.query(artifactsQuery, [executionId]);
      
      // 메트릭 정보
      const metricsQuery = `
        SELECT * FROM pipeline_metrics 
        WHERE execution_id = $1
        ORDER BY recorded_at DESC
      `;
      const metricsResult = await this.pool.query(metricsQuery, [executionId]);
      
      return {
        ...execution,
        stages: stagesResult.rows,
        artifacts: artifactsResult.rows,
        metrics: metricsResult.rows
      };
      
    } catch (error) {
      console.error('❌ 실행 상세 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 파이프라인 통계
   */
  async getPipelineStatistics(pipelineId, days = 30) {
    try {
      const query = `SELECT * FROM get_pipeline_statistics($1, $2)`;
      const result = await this.pool.query(query, [pipelineId, days]);
      return result.rows[0] || null;
      
    } catch (error) {
      console.error('❌ 파이프라인 통계 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 느린 파이프라인 탐지
   */
  async detectSlowPipelines(thresholdSeconds = 300, days = 7) {
    try {
      const query = `SELECT * FROM detect_slow_pipelines($1, $2)`;
      const result = await this.pool.query(query, [thresholdSeconds, days]);
      return result.rows;
      
    } catch (error) {
      console.error('❌ 느린 파이프라인 탐지 실패:', error);
      throw error;
    }
  }

  /**
   * 대시보드 통계
   */
  async getDashboardStats(days = 7) {
    try {
      const query = `
        SELECT 
          COUNT(*) AS total_executions,
          COUNT(*) FILTER (WHERE status = 'success') AS successful,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed,
          COUNT(*) FILTER (WHERE status = 'running') AS running,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'success')::DECIMAL / NULLIF(COUNT(*), 0) * 100,
            2
          ) AS success_rate,
          ROUND(AVG(duration_seconds), 2) AS avg_duration,
          COUNT(DISTINCT pipeline_id) AS unique_pipelines,
          COUNT(DISTINCT trigger_by) AS unique_users
        FROM pipeline_executions
        WHERE started_at >= NOW() - ($1 || ' days')::INTERVAL
      `;
      
      const result = await this.pool.query(query, [days]);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ 대시보드 통계 조회 실패:', error);
      throw error;
    }
  }
}

// Singleton 인스턴스
let pipelineHistoryServiceInstance = null;

function getPipelineHistoryService() {
  if (!pipelineHistoryServiceInstance) {
    pipelineHistoryServiceInstance = new PipelineHistoryService();
  }
  return pipelineHistoryServiceInstance;
}

module.exports = {
  PipelineHistoryService,
  getPipelineHistoryService
};

