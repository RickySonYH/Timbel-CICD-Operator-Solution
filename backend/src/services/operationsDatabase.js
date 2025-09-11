// [advice from AI] 운영 센터 PostgreSQL 데이터베이스 서비스
// 테넌트, 인프라, 배포, 모니터링 데이터 CRUD 관리

const { Pool } = require('pg');

class OperationsDatabase {
  constructor() {
    // [advice from AI] PostgreSQL 연결 설정
    this.pool = new Pool({
      host: process.env.DB_HOST || 'postgres', // Docker 컨테이너 이름
      port: parseInt(process.env.DB_PORT || '5432'), // 내부 포트
      database: process.env.DB_NAME || 'timbel_db', // Docker Compose 설정과 맞춤
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel_password',
      max: 20, // 최대 연결 수
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on('connect', () => {
      console.log('✅ 운영 센터 PostgreSQL 연결 성공');
    });

    this.pool.on('error', (err) => {
      console.error('💥 PostgreSQL 연결 오류:', err);
    });
  }

  // [advice from AI] ===== 인프라 관리 CRUD =====

  async createInfrastructure(infraData) {
    const client = await this.pool.connect();
    try {
      const {
        name, description, type, provider, region, 
        totalCpu, totalMemory, totalStorage, totalGpu,
        nodeCount, k8sVersion, apiEndpoint, dashboardUrl, createdBy
      } = infraData;

      const query = `
        INSERT INTO operations_infrastructures 
        (name, description, type, provider, region, total_cpu, total_memory, total_storage, total_gpu, 
         node_count, k8s_version, api_endpoint, dashboard_url, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        name, description, type, provider, region,
        totalCpu, totalMemory, totalStorage, totalGpu,
        nodeCount, k8sVersion, apiEndpoint, dashboardUrl, createdBy
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async getInfrastructures(filters = {}) {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT i.*, 
               COUNT(n.id) as node_count_actual,
               COUNT(t.id) as tenant_count
        FROM operations_infrastructures i
        LEFT JOIN operations_infrastructure_nodes n ON i.id = n.infrastructure_id
        LEFT JOIN operations_tenants t ON i.id = t.infrastructure_id
      `;

      const conditions = [];
      const values = [];
      let paramCount = 0;

      if (filters.status) {
        conditions.push(`i.status = $${++paramCount}`);
        values.push(filters.status);
      }

      if (filters.provider) {
        conditions.push(`i.provider = $${++paramCount}`);
        values.push(filters.provider);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` GROUP BY i.id ORDER BY i.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      const result = await client.query(query, values);
      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  async updateInfrastructureStatus(id, status) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE operations_infrastructures 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *
      `;

      const result = await client.query(query, [status, id]);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async deleteInfrastructure(id) {
    const client = await this.pool.connect();
    try {
      // [advice from AI] 연관된 테넌트 확인
      const tenantCheck = await client.query(
        'SELECT COUNT(*) as count FROM operations_tenants WHERE infrastructure_id = $1 AND status != $2',
        [id, 'inactive']
      );

      if (parseInt(tenantCheck.rows[0].count) > 0) {
        throw new Error('활성 테넌트가 있는 인프라는 삭제할 수 없습니다');
      }

      const query = 'DELETE FROM operations_infrastructures WHERE id = $1 RETURNING *';
      const result = await client.query(query, [id]);
      
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 테넌트 관리 CRUD =====

  async createTenant(tenantData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        tenantId, tenantName, description, environment, cloudProvider, region,
        deploymentMode, deploymentStrategy, autoScaling, monitoringEnabled,
        infrastructureId, services, createdBy
      } = tenantData;

      // [advice from AI] 1. 테넌트 생성
      const tenantQuery = `
        INSERT INTO operations_tenants 
        (tenant_id, tenant_name, description, environment, cloud_provider, region, namespace,
         deployment_mode, deployment_strategy, auto_scaling, monitoring_enabled, infrastructure_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const tenantValues = [
        tenantId, tenantName, description, environment, cloudProvider, region, tenantId,
        deploymentMode, deploymentStrategy, autoScaling, monitoringEnabled, infrastructureId, 
        createdBy || null // [advice from AI] UUID가 아닌 경우 null로 처리
      ];

      const tenantResult = await client.query(tenantQuery, tenantValues);
      const tenant = tenantResult.rows[0];

      // [advice from AI] 2. 서비스 생성
      const serviceResults = [];
      if (services && services.length > 0) {
        for (const service of services) {
          const serviceQuery = `
            INSERT INTO operations_tenant_services 
            (tenant_id, service_name, service_type, display_name, channels, cpu_cores, memory_gb, 
             gpu_count, storage_gb, replicas, image_name, image_tag, registry_url, build_source,
             advanced_settings, environment_variables, health_check_config)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
          `;

          const serviceValues = [
            tenant.id, service.name, service.type, service.displayName || service.name,
            service.channels || 0, service.resources?.cpu || 0.5, service.resources?.memory || 1,
            service.resources?.gpu || 0, service.resources?.storage || 10, service.resources?.replicas || 1,
            service.image || `ecp-ai/${service.name}`, service.tag || 'latest', 
            service.registry || 'harbor.ecp-ai.com', service.buildSource || 'pre-built',
            JSON.stringify(service.config || {}), JSON.stringify(service.env || {}),
            JSON.stringify(service.healthCheck || { path: '/health', port: 8080 })
          ];

          const serviceResult = await client.query(serviceQuery, serviceValues);
          serviceResults.push(serviceResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: {
          tenant: tenant,
          services: serviceResults
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenants(filters = {}) {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM view_tenant_summary
      `;

      const conditions = [];
      const values = [];
      let paramCount = 0;

      if (filters.status) {
        conditions.push(`tenant_status = $${++paramCount}`);
        values.push(filters.status);
      }

      if (filters.cloudProvider) {
        conditions.push(`cloud_provider = $${++paramCount}`);
        values.push(filters.cloudProvider);
      }

      if (filters.environment) {
        conditions.push(`environment = $${++paramCount}`);
        values.push(filters.environment);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      const result = await client.query(query, values);
      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  async getTenantDetail(tenantId) {
    const client = await this.pool.connect();
    try {
      // [advice from AI] 테넌트 기본 정보
      const tenantQuery = `
        SELECT t.*, i.name as infrastructure_name, i.provider as infrastructure_provider
        FROM operations_tenants t
        LEFT JOIN operations_infrastructures i ON t.infrastructure_id = i.id
        WHERE t.tenant_id = $1
      `;

      const tenantResult = await client.query(tenantQuery, [tenantId]);
      if (tenantResult.rows.length === 0) {
        throw new Error('테넌트를 찾을 수 없습니다');
      }

      const tenant = tenantResult.rows[0];

      // [advice from AI] 서비스 목록
      const servicesQuery = `
        SELECT * FROM operations_tenant_services 
        WHERE tenant_id = $1 
        ORDER BY service_name
      `;

      const servicesResult = await client.query(servicesQuery, [tenant.id]);

      // [advice from AI] 최근 배포 기록
      const deploymentsQuery = `
        SELECT * FROM operations_deployments 
        WHERE tenant_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `;

      const deploymentsResult = await client.query(deploymentsQuery, [tenant.id]);

      return {
        success: true,
        data: {
          tenant: tenant,
          services: servicesResult.rows,
          recent_deployments: deploymentsResult.rows
        }
      };

    } finally {
      client.release();
    }
  }

  async updateTenantStatus(tenantId, status) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE operations_tenants 
        SET status = $1, updated_at = NOW() 
        WHERE tenant_id = $2 
        RETURNING *
      `;

      const result = await client.query(query, [status, tenantId]);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async deleteTenant(tenantId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // [advice from AI] 1. 관련 배포 기록 삭제
      await client.query('DELETE FROM operations_deployments WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1)', [tenantId]);

      // [advice from AI] 2. 서비스 삭제
      await client.query('DELETE FROM operations_tenant_services WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1)', [tenantId]);

      // [advice from AI] 3. 모니터링 데이터 삭제
      await client.query('DELETE FROM operations_service_monitoring WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1)', [tenantId]);

      // [advice from AI] 4. 알림 삭제
      await client.query('DELETE FROM operations_alerts WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1)', [tenantId]);

      // [advice from AI] 5. 테넌트 삭제
      const result = await client.query('DELETE FROM operations_tenants WHERE tenant_id = $1 RETURNING *', [tenantId]);

      await client.query('COMMIT');

      return { success: true, data: result.rows[0] };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 배포 관리 CRUD =====

  async createDeployment(deploymentData) {
    const client = await this.pool.connect();
    try {
      const {
        deploymentId, tenantId, deploymentStrategy, manifestCount, manifestFiles,
        resourceRequirements, estimatedCost, createdBy
      } = deploymentData;

      const query = `
        INSERT INTO operations_deployments 
        (deployment_id, tenant_id, deployment_strategy, manifest_count, manifest_files,
         resource_requirements, estimated_cost, status, current_step, deployment_logs)
        VALUES ($1, (SELECT id FROM operations_tenants WHERE tenant_id = $2), $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        deploymentId, tenantId, deploymentStrategy, manifestCount, manifestFiles,
        JSON.stringify(resourceRequirements), JSON.stringify(estimatedCost),
        'pending', '배포 준비 중', JSON.stringify(['🚀 배포 시작...'])
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async updateDeploymentProgress(deploymentId, progressData) {
    const client = await this.pool.connect();
    try {
      const {
        status, progress, currentStep, logs, startedAt, completedAt, errorMessage
      } = progressData;

      const query = `
        UPDATE operations_deployments 
        SET status = $1, progress = $2, current_step = $3, deployment_logs = $4,
            started_at = $5, completed_at = $6, error_message = $7, 
            failed_at = CASE WHEN $1 = 'failed' THEN NOW() ELSE failed_at END
        WHERE deployment_id = $8
        RETURNING *
      `;

      const values = [
        status, progress, currentStep, JSON.stringify(logs),
        startedAt, completedAt, errorMessage, deploymentId
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async getDeployments(filters = {}) {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT d.*, t.tenant_id, t.tenant_name, t.cloud_provider, t.environment
        FROM operations_deployments d
        JOIN operations_tenants t ON d.tenant_id = t.id
      `;

      const conditions = [];
      const values = [];
      let paramCount = 0;

      if (filters.status) {
        conditions.push(`d.status = $${++paramCount}`);
        values.push(filters.status);
      }

      if (filters.cloudProvider) {
        conditions.push(`t.cloud_provider = $${++paramCount}`);
        values.push(filters.cloudProvider);
      }

      if (filters.environment) {
        conditions.push(`t.environment = $${++paramCount}`);
        values.push(filters.environment);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY d.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      const result = await client.query(query, values);
      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 모니터링 데이터 CRUD =====

  async saveMonitoringData(monitoringData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { tenantId, services } = monitoringData;

      // [advice from AI] 기존 모니터링 데이터 삭제 (최신 데이터로 교체)
      await client.query(
        'DELETE FROM operations_service_monitoring WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1)',
        [tenantId]
      );

      // [advice from AI] 새로운 모니터링 데이터 삽입
      for (const service of services) {
        const query = `
          INSERT INTO operations_service_monitoring 
          (tenant_id, service_name, overall_status, uptime_percentage, response_time_ms, error_rate_percent,
           requests_per_second, cpu_usage_percent, memory_usage_percent, gpu_usage_percent, 
           disk_usage_percent, network_io_mbps, service_specific_metrics, health_check_status)
          VALUES ((SELECT id FROM operations_tenants WHERE tenant_id = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        const values = [
          tenantId, service.name, service.status, parseFloat(service.uptime?.replace('%', '') || '99'),
          service.response_time, service.error_rate, service.resources?.requests_per_second || 0,
          service.resources?.cpu_usage || 0, service.resources?.memory_usage || 0, 
          service.resources?.gpu_usage || 0, service.resources?.disk_usage || 0,
          service.resources?.network_io || 0, JSON.stringify(service.metrics || {}),
          JSON.stringify(service.health_checks || {})
        ];

        await client.query(query, values);
      }

      await client.query('COMMIT');
      return { success: true, message: '모니터링 데이터 저장 완료' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMonitoringData(tenantId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM operations_service_monitoring 
        WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1)
        ORDER BY recorded_at DESC
      `;

      const result = await client.query(query, [tenantId]);
      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 알림 관리 CRUD =====

  async createAlert(alertData) {
    const client = await this.pool.connect();
    try {
      const {
        tenantId, alertId, alertName, severity, message, serviceName,
        metricName, currentValue, thresholdValue, notificationChannels, webhookUrl
      } = alertData;

      const query = `
        INSERT INTO operations_alerts 
        (tenant_id, alert_id, alert_name, severity, message, service_name,
         metric_name, current_value, threshold_value, notification_channels, webhook_url)
        VALUES ((SELECT id FROM operations_tenants WHERE tenant_id = $1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        tenantId, alertId, alertName, severity, message, serviceName,
        metricName, currentValue, thresholdValue, notificationChannels, webhookUrl
      ];

      const result = await client.query(query, values);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async getActiveAlerts(tenantId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM operations_alerts 
        WHERE tenant_id = (SELECT id FROM operations_tenants WHERE tenant_id = $1) 
        AND status = 'active'
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [tenantId]);
      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  async resolveAlert(alertId, resolvedBy) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE operations_alerts 
        SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, updated_at = NOW()
        WHERE alert_id = $2
        RETURNING *
      `;

      const result = await client.query(query, [resolvedBy, alertId]);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 통계 및 대시보드 데이터 =====

  async getOperationStats() {
    const client = await this.pool.connect();
    try {
      // [advice from AI] 배포 통계
      const deploymentStats = await client.query('SELECT * FROM view_deployment_stats');

      // [advice from AI] 테넌트 통계
      const tenantStats = await client.query(`
        SELECT 
          COUNT(*) as total_tenants,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_tenants,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_tenants
        FROM operations_tenants
      `);

      // [advice from AI] 인프라 통계
      const infraStats = await client.query(`
        SELECT 
          COUNT(*) as total_infrastructures,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_infrastructures,
          SUM(total_cpu) as total_cpu_capacity,
          SUM(total_memory) as total_memory_capacity,
          SUM(total_gpu) as total_gpu_capacity
        FROM operations_infrastructures
      `);

      // [advice from AI] 서비스 통계
      const serviceStats = await client.query(`
        SELECT 
          COUNT(*) as total_services,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_services,
          SUM(cpu_cores) as total_cpu_allocated,
          SUM(memory_gb) as total_memory_allocated,
          SUM(gpu_count) as total_gpu_allocated
        FROM operations_tenant_services
      `);

      return {
        success: true,
        data: {
          deployments: deploymentStats.rows[0] || {},
          tenants: tenantStats.rows[0] || {},
          infrastructures: infraStats.rows[0] || {},
          services: serviceStats.rows[0] || {}
        }
      };

    } finally {
      client.release();
    }
  }

  // [advice from AI] 연결 종료
  async close() {
    await this.pool.end();
    console.log('🔒 운영 센터 PostgreSQL 연결 종료');
  }
}

module.exports = OperationsDatabase;
