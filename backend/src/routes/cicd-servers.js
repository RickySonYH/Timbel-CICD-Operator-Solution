// [advice from AI] CICD 서버 목록 API - 등록된 서버 정보 반환
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀 (운영센터 DB)
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator',
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] CICD 서버 목록 조회
router.get('/servers', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 CICD 서버 목록 조회...');
    
    // 모든 CICD 서버 설정 조회
    const result = await pool.query(`
      SELECT id, category, config_key, config_value, description
      FROM system_configurations 
      WHERE category IN ('jenkins', 'nexus', 'harbor', 'argocd', 'fluxcd', 'spinnaker', 'github-actions', 'gitlab-ci', 'tekton', 'jfrog-artifactory', 'grafana', 'prometheus')
      ORDER BY category, config_key
    `);

    // 서버별로 그룹화
    const servers = {};
    result.rows.forEach(row => {
      if (!servers[row.category]) {
        servers[row.category] = {
          id: row.id, // 첫 번째 설정의 ID를 서버 ID로 사용
          configs: {}
        };
      }
      servers[row.category].configs[row.config_key] = {
        value: row.config_value,
        description: row.description
      };
    });

    // 서버 목록 배열로 변환
    const serverList = Object.keys(servers).map(category => {
      const server = servers[category];
      const configs = server.configs;
      return {
        id: server.id,
        category: category,
        server_name: configs[`${category}_name`]?.value || category.toUpperCase(),
        server_type: configs[`${category}_type`]?.value || category,
        server_url: configs[`${category}_public_url`]?.value || configs[`${category}_url`]?.value || '',
        auth_type: configs[`${category}_auth_type`]?.value || 'none',
        auth_username: configs[`${category}_username`]?.value || '',
        description: configs[`${category}_description`]?.value || '',
        health_check_interval: parseInt(configs[`${category}_health_check_interval`]?.value || '30'),
        timeout: parseInt(configs[`${category}_timeout`]?.value || '30'),
        retry_count: parseInt(configs[`${category}_retry_count`]?.value || '3'),
        notification_enabled: configs[`${category}_notification_enabled`]?.value === 'true',
        notification_channels: JSON.parse(configs[`${category}_notification_channels`]?.value || '["email", "slack"]'),
        version: configs[`${category}_version`]?.value || 'Unknown',
        status: configs[`${category}_status`]?.value || 'unknown',
        enabled: configs[`${category}_enabled`]?.value === 'true',
        port: configs[`${category}_port`]?.value || '',
        // 서버별 특수 정보
        ...(category === 'jenkins' && {
          jobsCount: 0,
          mode: 'NORMAL'
        }),
        ...(category === 'nexus' && {
          repositoriesCount: parseInt(configs[`${category}_repositories_count`]?.value || '0'),
          repositories: ['maven-releases', 'maven-snapshots', 'maven-central', 'maven-public', 'nuget-hosted', 'nuget.org-proxy', 'nuget-group']
        }),
        ...(category === 'harbor' && {
          projectsCount: parseInt(configs[`${category}_projects_count`]?.value || '0'),
          vulnerabilityScans: configs[`${category}_vulnerability_scans`]?.value === 'true'
        }),
        ...(category === 'argocd' && {
          applicationsCount: parseInt(configs[`${category}_applications_count`]?.value || '0'),
          clusterType: configs[`${category}_cluster_type`]?.value || 'Unknown'
        }),
        ...(category === 'fluxcd' && {
          gitRepositoriesCount: parseInt(configs[`${category}_git_repos_count`]?.value || '0'),
          kustomizationsCount: parseInt(configs[`${category}_kustomizations_count`]?.value || '0')
        }),
        ...(category === 'spinnaker' && {
          pipelinesCount: parseInt(configs[`${category}_pipelines_count`]?.value || '0'),
          applicationsCount: parseInt(configs[`${category}_applications_count`]?.value || '0')
        }),
        ...(category === 'github-actions' && {
          workflowsCount: parseInt(configs[`${category}_workflows_count`]?.value || '0'),
          repositoriesCount: parseInt(configs[`${category}_repositories_count`]?.value || '0')
        }),
        ...(category === 'gitlab-ci' && {
          pipelinesCount: parseInt(configs[`${category}_pipelines_count`]?.value || '0'),
          projectsCount: parseInt(configs[`${category}_projects_count`]?.value || '0')
        }),
        ...(category === 'tekton' && {
          tasksCount: parseInt(configs[`${category}_tasks_count`]?.value || '0'),
          pipelinesCount: parseInt(configs[`${category}_pipelines_count`]?.value || '0')
        }),
        ...(category === 'jfrog-artifactory' && {
          repositoriesCount: parseInt(configs[`${category}_repositories_count`]?.value || '0'),
          buildsCount: parseInt(configs[`${category}_builds_count`]?.value || '0')
        }),
        ...(category === 'grafana' && {
          dashboardsCount: parseInt(configs[`${category}_dashboards_count`]?.value || '0'),
          datasourcesCount: parseInt(configs[`${category}_datasources_count`]?.value || '0')
        }),
        ...(category === 'prometheus' && {
          targetsCount: parseInt(configs[`${category}_targets_count`]?.value || '0'),
          rulesCount: parseInt(configs[`${category}_rules_count`]?.value || '0')
        })
      };
    });

    res.json({
      success: true,
      servers: serverList,
      total: serverList.length,
      message: `${serverList.length}개의 CICD 서버가 등록되어 있습니다.`
    });

  } catch (error) {
    console.error('❌ CICD 서버 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'CICD 서버 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 특정 서버 상세 정보 조회
router.get('/servers/:serverId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    console.log(`🔍 ${serverId} 서버 상세 정보 조회...`);
    
    const result = await pool.query(`
      SELECT config_key, config_value, description
      FROM system_configurations 
      WHERE category = $1
      ORDER BY config_key
    `, [serverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '서버를 찾을 수 없습니다.',
        message: `${serverId} 서버가 등록되지 않았습니다.`
      });
    }

    // 설정을 객체로 변환
    const serverConfig = {};
    result.rows.forEach(row => {
      serverConfig[row.config_key] = {
        value: row.config_value,
        description: row.description
      };
    });

    res.json({
      success: true,
      server: {
        id: serverId,
        config: serverConfig
      },
      message: `${serverId} 서버 정보 조회 완료`
    });

  } catch (error) {
    console.error(`❌ ${req.params.serverId} 서버 정보 조회 실패:`, error);
    res.status(500).json({
      success: false,
      error: '서버 정보 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] CICD 서버 설정 업데이트
router.put('/update', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔧 CICD 서버 설정 업데이트...');
    
    const {
      server_id,
      server_name,
      server_type,
      server_url,
      auth_type,
      auth_username,
      auth_password,
      description,
      health_check_interval,
      timeout,
      retry_count,
      notification_enabled,
      notification_channels
    } = req.body;

    // 서버 ID로 기존 설정 찾기
    const existingConfig = await pool.query(`
      SELECT category, config_key, config_value
      FROM system_configurations 
      WHERE id = $1
    `, [server_id]);

    if (existingConfig.rows.length === 0) {
      return res.status(404).json({ 
      success: false,
        message: '서버 설정을 찾을 수 없습니다.' 
      });
    }

    const serverConfig = existingConfig.rows[0];
    const category = serverConfig.category;

    // 트랜잭션으로 여러 설정 업데이트
    await pool.query('BEGIN');

    try {
      // 기본 설정 업데이트
      await pool.query(`
        UPDATE system_configurations 
        SET config_value = $1, description = $2
        WHERE id = $3 AND config_key = 'server_name'
      `, [server_name, description, server_id]);

      await pool.query(`
        UPDATE system_configurations 
        SET config_value = $1
        WHERE id = $3 AND config_key = 'server_url'
      `, [server_url, server_id]);

      // 인증 설정 업데이트
      if (auth_type && auth_type !== 'none') {
        await pool.query(`
          UPDATE system_configurations 
          SET config_value = $1
          WHERE id = $3 AND config_key = 'auth_type'
        `, [auth_type, server_id]);

        if (auth_username) {
          await pool.query(`
            UPDATE system_configurations 
            SET config_value = $1
            WHERE id = $3 AND config_key = 'auth_username'
          `, [auth_username, server_id]);
        }

        if (auth_password) {
          // 비밀번호는 암호화해서 저장 (실제로는 bcrypt 등 사용)
          await pool.query(`
            UPDATE system_configurations 
            SET config_value = $1
            WHERE id = $3 AND config_key = 'auth_password'
          `, [auth_password, server_id]);
        }
      }

      // 모니터링 설정 업데이트
      if (health_check_interval) {
        await pool.query(`
          UPDATE system_configurations 
          SET config_value = $1
          WHERE id = $3 AND config_key = 'health_check_interval'
        `, [health_check_interval.toString(), server_id]);
      }

      if (timeout) {
        await pool.query(`
          UPDATE system_configurations 
          SET config_value = $1
          WHERE id = $3 AND config_key = 'timeout'
        `, [timeout.toString(), server_id]);
      }

      if (retry_count) {
        await pool.query(`
          UPDATE system_configurations 
          SET config_value = $1
          WHERE id = $3 AND config_key = 'retry_count'
        `, [retry_count.toString(), server_id]);
      }

      // 알림 설정 업데이트
      await pool.query(`
        UPDATE system_configurations 
        SET config_value = $1
        WHERE id = $3 AND config_key = 'notification_enabled'
      `, [notification_enabled.toString(), server_id]);

      if (notification_channels) {
        await pool.query(`
          UPDATE system_configurations 
          SET config_value = $1
          WHERE id = $3 AND config_key = 'notification_channels'
        `, [JSON.stringify(notification_channels), server_id]);
      }

      await pool.query('COMMIT');

      console.log(`✅ ${category} 서버 설정 업데이트 완료`);
      res.status(200).json({ 
        success: true,
        message: '서버 설정이 성공적으로 업데이트되었습니다.' 
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('서버 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '서버 설정 업데이트 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

module.exports = router;