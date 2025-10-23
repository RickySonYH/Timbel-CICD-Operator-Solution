// [advice from AI] 확장 가능한 파이프라인 오케스트레이터 API
// 다중 CI/CD 프로바이더 관리 및 파이프라인 실행 조정

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { checkAdvancedPermission } = require('./advanced-permissions');
const systemLogger = require('../middleware/systemLogger');
const PipelineOrchestrator = require('../services/pipeline/PipelineOrchestrator');
const { Pool } = require('pg');

// [advice from AI] 데이터베이스 연결
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'timbel_cicd_operator',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password'
});

// [advice from AI] 싱글톤 오케스트레이터 인스턴스
let orchestratorInstance = null;
const getOrchestratorInstance = () => {
  if (!orchestratorInstance) {
    orchestratorInstance = new PipelineOrchestrator();
  }
  return orchestratorInstance;
};

// [advice from AI] 오케스트레이터 상태 조회
router.get('/status',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const orchestrator = getOrchestratorInstance();
      const stats = orchestrator.getStats();
      const providers = orchestrator.getProviders();
      
      res.json({
        success: true,
        data: {
          ...stats,
          providers: providers.map(p => ({
            name: p.name,
            type: p.metadata?.description || 'Unknown',
            connected: p.connected,
            capabilities: p.capabilities
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('오케스트레이터 상태 조회 오류', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '오케스트레이터 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 등록된 프로바이더 목록 조회
router.get('/providers',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const orchestrator = getOrchestratorInstance();
      const providers = orchestrator.getProviders();
      
      // 데이터베이스에서 추가 정보 조회
      const result = await pool.query(`
        SELECT name, provider_type, display_name, description, enabled, 
               connected, health_status, total_executions, successful_executions,
               failed_executions, last_execution_at
        FROM pipeline_providers
        ORDER BY name
      `);
      
      const dbProviders = result.rows.reduce((acc, row) => {
        acc[row.name] = row;
        return acc;
      }, {});
      
      const enrichedProviders = providers.map(provider => ({
        ...provider,
        ...(dbProviders[provider.name] || {})
      }));
      
      res.json({
        success: true,
        data: enrichedProviders,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('프로바이더 목록 조회 오류', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '프로바이더 목록 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 프로바이더 헬스 체크
router.get('/providers/health',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const orchestrator = getOrchestratorInstance();
      const healthChecks = await orchestrator.checkProvidersHealth();
      
      // 데이터베이스에 헬스 상태 업데이트
      for (const health of healthChecks) {
        await pool.query(`
          UPDATE pipeline_providers 
          SET connected = $1, health_status = $2, health_details = $3, last_health_check = NOW()
          WHERE name = $4
        `, [
          health.healthy,
          health.healthy ? 'healthy' : 'unhealthy',
          JSON.stringify(health.details || {}),
          health.provider
        ]);
      }
      
      res.json({
        success: true,
        data: healthChecks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('프로바이더 헬스 체크 오류', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '프로바이더 헬스 체크 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 실행
router.post('/execute',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const {
        repository,
        branch = 'main',
        environment = 'development',
        pipelineConfig,
        parameters = {},
        providerPreference,
        templateId,
        priority = 5
      } = req.body;

      if (!repository || !pipelineConfig) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: 'repository와 pipelineConfig는 필수입니다.'
        });
      }

      const orchestrator = getOrchestratorInstance();
      const request = {
        repository,
        branch,
        environment,
        pipelineConfig,
        parameters,
        providerPreference,
        templateId,
        priority,
        pipelineType: pipelineConfig.type || 'full_cicd',
        userId: req.user.id,
        userName: req.user.username
      };

      const result = await orchestrator.executePipeline(request);
      
      systemLogger.info('파이프라인 실행 요청 접수', {
        executionId: result.executionId,
        repository,
        branch,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: result,
        message: '파이프라인 실행이 큐에 추가되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('파이프라인 실행 요청 실패', { 
        error: error.message,
        userId: req.user?.id,
        body: req.body 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 실행 요청 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 실행 상태 조회
router.get('/executions/:executionId',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { executionId } = req.params;
      const orchestrator = getOrchestratorInstance();
      
      // 메모리에서 활성 실행 조회
      let executionStatus = orchestrator.getExecutionStatus(executionId);
      
      // 메모리에 없으면 데이터베이스에서 조회
      if (!executionStatus) {
        const result = await pool.query(`
          SELECT pe.*, 
                 ARRAY_AGG(
                   json_build_object(
                     'stage_name', pes.stage_name,
                     'status', pes.status,
                     'started_at', pes.started_at,
                     'completed_at', pes.completed_at,
                     'duration_seconds', pes.duration_seconds
                   ) ORDER BY pes.stage_order
                 ) FILTER (WHERE pes.id IS NOT NULL) as stages
          FROM pipeline_executions pe
          LEFT JOIN pipeline_execution_stages pes ON pe.id = pes.execution_id
          WHERE pe.pipeline_id = $1
          GROUP BY pe.id
        `, [executionId]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          executionStatus = {
            id: row.pipeline_id,
            status: row.status,
            repository: row.repository,
            branch: row.branch,
            environment: row.environment,
            provider: row.provider_name,
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            stages: row.stages || [],
            failureReason: row.failure_reason
          };
        }
      }
      
      if (!executionStatus) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: '실행 정보를 찾을 수 없습니다.'
        });
      }
      
      res.json({
        success: true,
        data: executionStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('실행 상태 조회 오류', { 
        error: error.message,
        executionId: req.params.executionId 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '실행 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 활성 실행 목록 조회
router.get('/executions',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { status, provider, limit = 50, offset = 0 } = req.query;
      const orchestrator = getOrchestratorInstance();
      
      // 메모리에서 활성 실행 목록 조회
      const activeExecutions = orchestrator.getActiveExecutions();
      
      // 데이터베이스에서 히스토리 조회
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (status) {
        whereClause += ` AND status = $${params.length + 1}`;
        params.push(status);
      }
      
      if (provider) {
        whereClause += ` AND provider_name = $${params.length + 1}`;
        params.push(provider);
      }
      
      params.push(limit, offset);
      
      const result = await pool.query(`
        SELECT pipeline_id, repository, branch, environment, status, 
               provider_name, created_at, started_at, completed_at,
               failure_reason, priority
        FROM pipeline_executions 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params);
      
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM pipeline_executions 
        ${whereClause}
      `, params.slice(0, -2));
      
      res.json({
        success: true,
        data: {
          active: activeExecutions,
          history: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(countResult.rows[0].total) > parseInt(offset) + parseInt(limit)
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('실행 목록 조회 오류', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '실행 목록 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 중단
router.post('/executions/:executionId/stop',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const { executionId } = req.params;
      const orchestrator = getOrchestratorInstance();
      
      const result = await orchestrator.stopPipeline(executionId);
      
      systemLogger.info('파이프라인 중단 요청', {
        executionId,
        userId: req.user.id,
        userName: req.user.username
      });
      
      res.json({
        success: true,
        data: result,
        message: '파이프라인이 중단되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('파이프라인 중단 실패', { 
        error: error.message,
        executionId: req.params.executionId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 중단 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 템플릿 목록 조회
router.get('/templates',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { category, language, provider_type, enabled = true } = req.query;
      
      let whereClause = 'WHERE enabled = $1';
      const params = [enabled];
      
      if (category) {
        whereClause += ` AND category = $${params.length + 1}`;
        params.push(category);
      }
      
      if (language) {
        whereClause += ` AND language = $${params.length + 1}`;
        params.push(language);
      }
      
      if (provider_type) {
        whereClause += ` AND provider_type = $${params.length + 1}`;
        params.push(provider_type);
      }
      
      const result = await pool.query(`
        SELECT id, name, display_name, description, category, language, 
               framework, provider_type, parameters, usage_count, version,
               is_default, created_at
        FROM pipeline_templates 
        ${whereClause}
        ORDER BY is_default DESC, usage_count DESC, name
      `, params);
      
      res.json({
        success: true,
        data: result.rows,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('템플릿 목록 조회 오류', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '템플릿 목록 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 특정 템플릿 상세 조회
router.get('/templates/:templateId',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      
      const result = await pool.query(`
        SELECT * FROM pipeline_templates WHERE id = $1
      `, [templateId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: '템플릿을 찾을 수 없습니다.'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('템플릿 상세 조회 오류', { 
        error: error.message,
        templateId: req.params.templateId 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '템플릿 상세 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 템플릿 기반 파이프라인 실행
router.post('/templates/:templateId/execute',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_deploy_services'),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const {
        repository,
        branch = 'main',
        environment = 'development',
        parameters = {},
        providerPreference
      } = req.body;

      if (!repository) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: 'repository는 필수입니다.'
        });
      }

      // 템플릿 조회
      const templateResult = await pool.query(`
        SELECT * FROM pipeline_templates WHERE id = $1 AND enabled = true
      `, [templateId]);
      
      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: '템플릿을 찾을 수 없습니다.'
        });
      }
      
      const template = templateResult.rows[0];
      
      // 템플릿 설정을 파이프라인 설정으로 변환
      const pipelineConfig = {
        ...template.template_config,
        type: template.category,
        templateId: template.id,
        templateName: template.name
      };
      
      const orchestrator = getOrchestratorInstance();
      const request = {
        repository,
        branch,
        environment,
        pipelineConfig,
        parameters,
        providerPreference: providerPreference || template.provider_type,
        templateId: template.id,
        pipelineType: template.category,
        userId: req.user.id,
        userName: req.user.username
      };

      const result = await orchestrator.executePipeline(request);
      
      // 템플릿 사용 횟수 증가
      await pool.query(`
        UPDATE pipeline_templates 
        SET usage_count = usage_count + 1 
        WHERE id = $1
      `, [templateId]);
      
      systemLogger.info('템플릿 기반 파이프라인 실행', {
        executionId: result.executionId,
        templateId,
        templateName: template.name,
        repository,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: {
          ...result,
          template: {
            id: template.id,
            name: template.name,
            category: template.category
          }
        },
        message: '템플릿 기반 파이프라인 실행이 큐에 추가되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('템플릿 기반 파이프라인 실행 실패', { 
        error: error.message,
        templateId: req.params.templateId,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '템플릿 기반 파이프라인 실행 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 파이프라인 통계
router.get('/statistics',
  jwtAuth.verifyToken,
  checkAdvancedPermission('can_view_operations'),
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      
      // 시간 범위 계산
      const timeRanges = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };
      
      const interval = timeRanges[timeRange] || '24 hours';
      
      const [executionStats, providerStats, templateStats] = await Promise.all([
        // 실행 통계
        pool.query(`
          SELECT 
            COUNT(*) as total_executions,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_executions,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
            COUNT(CASE WHEN status = 'running' THEN 1 END) as running_executions,
            ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 2) as avg_duration_seconds
          FROM pipeline_executions 
          WHERE created_at >= NOW() - INTERVAL '${interval}'
        `),
        
        // 프로바이더별 통계
        pool.query(`
          SELECT provider_name, COUNT(*) as executions,
                 COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful
          FROM pipeline_executions 
          WHERE created_at >= NOW() - INTERVAL '${interval}' AND provider_name IS NOT NULL
          GROUP BY provider_name
          ORDER BY executions DESC
        `),
        
        // 템플릿별 통계
        pool.query(`
          SELECT pt.name as template_name, pt.category, COUNT(pe.id) as usage_count
          FROM pipeline_templates pt
          LEFT JOIN pipeline_executions pe ON pt.id = pe.template_id 
            AND pe.created_at >= NOW() - INTERVAL '${interval}'
          GROUP BY pt.id, pt.name, pt.category
          ORDER BY usage_count DESC
          LIMIT 10
        `)
      ]);
      
      res.json({
        success: true,
        data: {
          timeRange,
          overview: executionStats.rows[0],
          byProvider: providerStats.rows,
          byTemplate: templateStats.rows
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('파이프라인 통계 조회 오류', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '파이프라인 통계 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

module.exports = router;
