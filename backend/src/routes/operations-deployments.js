// [advice from AI] 운영팀 전용 배포 실행 API - 레포지토리 기반 직접 배포
const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// [advice from AI] 데이터베이스 연결 설정
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'timbel_knowledge',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
});

// [advice from AI] POST /api/operations/deployments/execute - 배포 실행
router.post('/execute', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const client = await pool.connect();
    
    const {
      repository,
      buildConfig,
      deploymentTarget
    } = req.body;
    
    const userId = req.user.id;
    const executionId = uuidv4();
    
    // [advice from AI] 배포 실행 기록 생성
    const insertQuery = `
      INSERT INTO operations_deployments (
        id,
        repository_url,
        repository_name,
        repository_owner,
        branch,
        dockerfile_path,
        build_context,
        build_args,
        environment_variables,
        image_name,
        image_tag,
        deployment_environment,
        namespace,
        replicas,
        cpu_request,
        memory_request,
        ports_config,
        status,
        requested_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'preparing', $18, NOW(), NOW()
      ) RETURNING *
    `;
    
    const values = [
      executionId,
      repository.url,
      repository.name,
      repository.owner,
      repository.branch,
      buildConfig.dockerfilePath,
      buildConfig.buildContext,
      JSON.stringify(buildConfig.buildArgs),
      JSON.stringify(buildConfig.environmentVariables),
      buildConfig.imageName,
      buildConfig.imageTag,
      deploymentTarget.environment,
      deploymentTarget.namespace,
      deploymentTarget.replicas,
      deploymentTarget.resources.cpu,
      deploymentTarget.resources.memory,
      JSON.stringify(deploymentTarget.ports),
      userId
    ];
    
    const result = await client.query(insertQuery, values);
    
    // [advice from AI] 초기 로그 생성
    await client.query(`
      INSERT INTO operations_deployment_logs (
        deployment_id, timestamp, stage, message, level
      ) VALUES ($1, NOW(), 'preparation', '배포 준비 시작', 'info')
    `, [executionId]);
    
    client.release();
    
    // [advice from AI] 비동기 배포 프로세스 시작
    startDeploymentProcess(executionId, repository, buildConfig, deploymentTarget);
    
    res.status(201).json({
      success: true,
      message: '배포가 시작되었습니다.',
      execution: {
        id: executionId,
        repository,
        buildConfig,
        deploymentTarget,
        status: 'preparing',
        startedAt: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            stage: 'preparation',
            message: '배포 준비 시작',
            level: 'info'
          }
        ]
      }
    });
  } catch (error) {
    console.error('배포 실행 실패:', error);
    res.status(500).json({
      success: false,
      message: '배포 실행에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] GET /api/operations/deployments/:id/status - 배포 상태 조회
router.get('/:id/status', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const client = await pool.connect();
    const { id } = req.params;
    
    // [advice from AI] 배포 정보 조회
    const deploymentQuery = `
      SELECT * FROM operations_deployments WHERE id = $1
    `;
    
    const deploymentResult = await client.query(deploymentQuery, [id]);
    
    if (deploymentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: '배포 정보를 찾을 수 없습니다.'
      });
    }
    
    const deployment = deploymentResult.rows[0];
    
    // [advice from AI] 로그 조회
    const logsQuery = `
      SELECT * FROM operations_deployment_logs 
      WHERE deployment_id = $1 
      ORDER BY timestamp ASC
    `;
    
    const logsResult = await client.query(logsQuery, [id]);
    
    client.release();
    
    // [advice from AI] 응답 데이터 구성
    const execution = {
      id: deployment.id,
      repository: {
        url: deployment.repository_url,
        name: deployment.repository_name,
        owner: deployment.repository_owner,
        branch: deployment.branch
      },
      buildConfig: {
        dockerfilePath: deployment.dockerfile_path,
        buildContext: deployment.build_context,
        buildArgs: JSON.parse(deployment.build_args || '{}'),
        environmentVariables: JSON.parse(deployment.environment_variables || '{}'),
        imageName: deployment.image_name,
        imageTag: deployment.image_tag
      },
      deploymentTarget: {
        environment: deployment.deployment_environment,
        namespace: deployment.namespace,
        replicas: deployment.replicas,
        resources: {
          cpu: deployment.cpu_request,
          memory: deployment.memory_request
        },
        ports: JSON.parse(deployment.ports_config || '[]')
      },
      status: deployment.status,
      startedAt: deployment.created_at,
      completedAt: deployment.completed_at,
      buildNumber: deployment.build_number,
      imageUrl: deployment.image_url,
      deploymentUrl: deployment.deployment_url,
      logs: logsResult.rows.map(log => ({
        timestamp: log.timestamp,
        stage: log.stage,
        message: log.message,
        level: log.level
      }))
    };
    
    res.json({
      success: true,
      execution
    });
  } catch (error) {
    console.error('배포 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '배포 상태를 조회하는 데 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] GET /api/operations/deployments/history - 배포 히스토리 조회
router.get('/history', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const client = await pool.connect();
    
    const { page = 1, limit = 20, environment, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (environment) {
      paramCount++;
      whereClause += ` AND deployment_environment = $${paramCount}`;
      params.push(environment);
    }
    
    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    const query = `
      SELECT 
        od.*,
        u.full_name as requester_name
      FROM operations_deployments od
      LEFT JOIN timbel_users u ON od.requested_by = u.id
      ${whereClause}
      ORDER BY od.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    
    // [advice from AI] 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM operations_deployments od
      ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].total);
    
    client.release();
    
    // [advice from AI] 응답 데이터 구성
    const executions = result.rows.map(deployment => ({
      id: deployment.id,
      repository: {
        url: deployment.repository_url,
        name: deployment.repository_name,
        owner: deployment.repository_owner,
        branch: deployment.branch
      },
      buildConfig: {
        imageName: deployment.image_name,
        imageTag: deployment.image_tag
      },
      deploymentTarget: {
        environment: deployment.deployment_environment,
        namespace: deployment.namespace
      },
      status: deployment.status,
      startedAt: deployment.created_at,
      completedAt: deployment.completed_at,
      requesterName: deployment.requester_name
    }));
    
    res.json({
      success: true,
      executions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('배포 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '배포 히스토리를 조회하는 데 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] DELETE /api/operations/deployments/:id - 배포 중단
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const client = await pool.connect();
    const { id } = req.params;
    
    // [advice from AI] 배포 상태 확인
    const checkQuery = `
      SELECT status FROM operations_deployments WHERE id = $1
    `;
    
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: '배포 정보를 찾을 수 없습니다.'
      });
    }
    
    const currentStatus = checkResult.rows[0].status;
    
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      client.release();
      return res.status(400).json({
        success: false,
        message: '이미 완료된 배포는 중단할 수 없습니다.'
      });
    }
    
    // [advice from AI] 배포 중단 처리
    await client.query(`
      UPDATE operations_deployments 
      SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    // [advice from AI] 중단 로그 추가
    await client.query(`
      INSERT INTO operations_deployment_logs (
        deployment_id, timestamp, stage, message, level
      ) VALUES ($1, NOW(), 'cancellation', '사용자에 의해 배포가 중단되었습니다', 'warning')
    `, [id]);
    
    client.release();
    
    res.json({
      success: true,
      message: '배포가 중단되었습니다.'
    });
  } catch (error) {
    console.error('배포 중단 실패:', error);
    res.status(500).json({
      success: false,
      message: '배포 중단에 실패했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 비동기 배포 프로세스 함수
async function startDeploymentProcess(executionId, repository, buildConfig, deploymentTarget) {
  const client = await pool.connect();
  
  try {
    // [advice from AI] 단계별 배포 프로세스 시뮬레이션
    const stages = [
      { name: 'preparation', duration: 2000, message: '배포 환경 준비 중...' },
      { name: 'cloning', duration: 3000, message: 'GitHub 레포지토리 클론 중...' },
      { name: 'building', duration: 15000, message: 'Docker 이미지 빌드 중...' },
      { name: 'pushing', duration: 8000, message: '이미지를 레지스트리에 푸시 중...' },
      { name: 'deploying', duration: 10000, message: 'Kubernetes에 배포 중...' },
      { name: 'verification', duration: 5000, message: '배포 상태 검증 중...' }
    ];
    
    for (const stage of stages) {
      // [advice from AI] 상태 업데이트
      await client.query(`
        UPDATE operations_deployments 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `, [stage.name, executionId]);
      
      // [advice from AI] 로그 추가
      await client.query(`
        INSERT INTO operations_deployment_logs (
          deployment_id, timestamp, stage, message, level
        ) VALUES ($1, NOW(), $2, $3, 'info')
      `, [executionId, stage.name, stage.message]);
      
      // [advice from AI] 단계별 대기 (실제로는 실제 작업 수행)
      await new Promise(resolve => setTimeout(resolve, stage.duration));
      
      // [advice from AI] 랜덤 실패 시뮬레이션 (10% 확률)
      if (Math.random() < 0.1 && stage.name === 'building') {
        await client.query(`
          UPDATE operations_deployments 
          SET status = 'failed', completed_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [executionId]);
        
        await client.query(`
          INSERT INTO operations_deployment_logs (
            deployment_id, timestamp, stage, message, level
          ) VALUES ($1, NOW(), $2, '빌드 중 오류가 발생했습니다', 'error')
        `, [executionId, stage.name]);
        
        return;
      }
    }
    
    // [advice from AI] 성공 완료
    const imageUrl = `${buildConfig.imageName}:${buildConfig.imageTag}`;
    const deploymentUrl = `https://${repository.name}-${deploymentTarget.environment}.example.com`;
    
    await client.query(`
      UPDATE operations_deployments 
      SET 
        status = 'completed', 
        completed_at = NOW(), 
        updated_at = NOW(),
        image_url = $1,
        deployment_url = $2,
        build_number = $3
      WHERE id = $4
    `, [imageUrl, deploymentUrl, Math.floor(Math.random() * 1000) + 1, executionId]);
    
    await client.query(`
      INSERT INTO operations_deployment_logs (
        deployment_id, timestamp, stage, message, level
      ) VALUES ($1, NOW(), 'completion', '배포가 성공적으로 완료되었습니다', 'info')
    `, [executionId]);
    
  } catch (error) {
    console.error('배포 프로세스 실행 중 오류:', error);
    
    // [advice from AI] 실패 처리
    await client.query(`
      UPDATE operations_deployments 
      SET status = 'failed', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [executionId]);
    
    await client.query(`
      INSERT INTO operations_deployment_logs (
        deployment_id, timestamp, stage, message, level
      ) VALUES ($1, NOW(), 'error', $2, 'error')
    `, [executionId, `배포 중 오류 발생: ${error.message}`]);
    
  } finally {
    client.release();
  }
}

module.exports = router;
