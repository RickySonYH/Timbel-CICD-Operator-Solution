// [advice from AI] 동적 서비스 템플릿 관리 시스템
// 기본 8개 서비스 + 사용자 정의 서비스 추가/수정/삭제

const { Pool } = require('pg');

class ServiceTemplateManager {
  constructor() {
    // [advice from AI] PostgreSQL 연결 설정
    this.pool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'timbel_knowledge',
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel_password'
    });

    // [advice from AI] 기본 서비스 카테고리
    this.serviceCategories = {
      'core': '핵심 서비스 (콜봇, 챗봇, 어드바이저)',
      'ai': 'AI 서비스 (STT, TTS, TA, QA)',
      'infrastructure': '인프라 서비스 (공통, 모니터링)',
      'custom': '사용자 정의 서비스'
    };

    // [advice from AI] 지원 서비스 타입
    this.serviceTypes = {
      'api': 'API 서비스',
      'web': '웹 서비스',
      'ai': 'AI/ML 서비스',
      'data': '데이터 처리 서비스',
      'monitoring': '모니터링 서비스',
      'storage': '스토리지 서비스',
      'queue': '메시지 큐 서비스',
      'custom': '커스텀 서비스'
    };
  }

  // [advice from AI] ===== 서비스 템플릿 CRUD =====

  async getAllServiceTemplates(filters = {}) {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM view_service_templates_summary';
      const conditions = [];
      const values = [];
      let paramCount = 0;

      if (filters.category) {
        conditions.push(`category = $${++paramCount}`);
        values.push(filters.category);
      }

      if (filters.status) {
        conditions.push(`status = $${++paramCount}`);
        values.push(filters.status);
      }

      if (filters.isDefault !== undefined) {
        conditions.push(`is_default = $${++paramCount}`);
        values.push(filters.isDefault);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY is_default DESC, category, service_name';

      const result = await client.query(query, values);
      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  async getServiceTemplate(serviceName) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM service_templates WHERE service_name = $1';
      const result = await client.query(query, [serviceName]);
      
      if (result.rows.length === 0) {
        throw new Error('서비스 템플릿을 찾을 수 없습니다');
      }

      // [advice from AI] 의존성 정보도 함께 조회
      const depsQuery = `
        SELECT 
          st.service_name,
          st.display_name,
          sd.dependency_type,
          sd.description
        FROM service_dependencies sd
        JOIN service_templates st ON sd.depends_on_service_id = st.id
        WHERE sd.service_id = $1
      `;
      
      const depsResult = await client.query(depsQuery, [result.rows[0].id]);

      return {
        success: true,
        data: {
          ...result.rows[0],
          dependencies: depsResult.rows
        }
      };

    } finally {
      client.release();
    }
  }

  async createServiceTemplate(templateData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        serviceName, displayName, description, category, serviceType,
        defaultCpu, defaultMemoryGb, defaultGpu, defaultStorageGb, defaultReplicas,
        defaultImage, defaultTag, defaultRegistry, defaultPorts,
        advancedSettingsTemplate, environmentVariablesTemplate, healthCheckTemplate,
        defaultMetrics, monitoringEndpoints, version, createdBy, dependencies
      } = templateData;

      // [advice from AI] 서비스 템플릿 생성
      const query = `
        INSERT INTO service_templates 
        (service_name, display_name, description, category, service_type,
         default_cpu, default_memory_gb, default_gpu, default_storage_gb, default_replicas,
         default_image, default_tag, default_registry, default_ports,
         advanced_settings_template, environment_variables_template, health_check_template,
         default_metrics, monitoring_endpoints, version, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;

      const values = [
        serviceName, displayName, description || '', category || 'custom', serviceType || 'custom',
        defaultCpu || 0.5, defaultMemoryGb || 1.0, defaultGpu || 0, defaultStorageGb || 10, defaultReplicas || 1,
        defaultImage || `custom/${serviceName}`, defaultTag || 'latest', defaultRegistry || 'harbor.ecp-ai.com',
        defaultPorts || [8080], JSON.stringify(advancedSettingsTemplate || {}),
        JSON.stringify(environmentVariablesTemplate || {}), JSON.stringify(healthCheckTemplate || { path: '/health', port: 8080 }),
        defaultMetrics || ['response_time', 'cpu_usage'], monitoringEndpoints || ['/health', '/ready'],
        version || '1.0.0', createdBy || 'system'
      ];

      const result = await client.query(query, values);
      const newTemplate = result.rows[0];

      // [advice from AI] 의존성 설정
      if (dependencies && dependencies.length > 0) {
        for (const dep of dependencies) {
          const depQuery = `
            INSERT INTO service_dependencies (service_id, depends_on_service_id, dependency_type, description)
            VALUES ($1, (SELECT id FROM service_templates WHERE service_name = $2), $3, $4)
          `;
          
          await client.query(depQuery, [
            newTemplate.id, dep.serviceName, dep.type, dep.description
          ]);
        }
      }

      await client.query('COMMIT');

      return { success: true, data: newTemplate };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateServiceTemplate(serviceName, updateData) {
    const client = await this.pool.connect();
    try {
      const {
        displayName, description, defaultCpu, defaultMemoryGb, defaultGpu,
        defaultStorageGb, defaultReplicas, defaultImage, defaultTag,
        advancedSettingsTemplate, environmentVariablesTemplate, status, version
      } = updateData;

      const query = `
        UPDATE service_templates 
        SET 
          display_name = COALESCE($2, display_name),
          description = COALESCE($3, description),
          default_cpu = COALESCE($4, default_cpu),
          default_memory_gb = COALESCE($5, default_memory_gb),
          default_gpu = COALESCE($6, default_gpu),
          default_storage_gb = COALESCE($7, default_storage_gb),
          default_replicas = COALESCE($8, default_replicas),
          default_image = COALESCE($9, default_image),
          default_tag = COALESCE($10, default_tag),
          advanced_settings_template = COALESCE($11, advanced_settings_template),
          environment_variables_template = COALESCE($12, environment_variables_template),
          status = COALESCE($13, status),
          version = COALESCE($14, version),
          updated_at = NOW()
        WHERE service_name = $1
        RETURNING *
      `;

      const values = [
        serviceName, displayName, description, defaultCpu, defaultMemoryGb, defaultGpu,
        defaultStorageGb, defaultReplicas, defaultImage, defaultTag,
        JSON.stringify(advancedSettingsTemplate), JSON.stringify(environmentVariablesTemplate),
        status, version
      ];

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('서비스 템플릿을 찾을 수 없습니다');
      }

      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async deleteServiceTemplate(serviceName) {
    const client = await this.pool.connect();
    try {
      // [advice from AI] 기본 서비스는 삭제 불가
      const checkQuery = 'SELECT is_default FROM service_templates WHERE service_name = $1';
      const checkResult = await client.query(checkQuery, [serviceName]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('서비스 템플릿을 찾을 수 없습니다');
      }

      if (checkResult.rows[0].is_default) {
        throw new Error('기본 서비스 템플릿은 삭제할 수 없습니다');
      }

      // [advice from AI] 사용 중인 테넌트 확인
      const usageQuery = `
        SELECT COUNT(*) as count 
        FROM operations_tenant_services 
        WHERE service_name = $1
      `;
      
      const usageResult = await client.query(usageQuery, [serviceName]);
      
      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error('현재 사용 중인 서비스 템플릿은 삭제할 수 없습니다');
      }

      const query = 'DELETE FROM service_templates WHERE service_name = $1 RETURNING *';
      const result = await client.query(query, [serviceName]);

      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 카테고리 및 통계 =====

  async getServiceCategories() {
    return {
      success: true,
      data: Object.entries(this.serviceCategories).map(([key, name]) => ({
        key,
        name,
        description: name
      }))
    };
  }

  async getServiceTypes() {
    return {
      success: true,
      data: Object.entries(this.serviceTypes).map(([key, name]) => ({
        key,
        name,
        description: name
      }))
    };
  }

  async getCategoryStats() {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM view_service_category_stats ORDER BY category';
      const result = await client.query(query);

      return { success: true, data: result.rows };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 서비스 의존성 관리 =====

  async addServiceDependency(serviceName, dependsOnServiceName, dependencyType, description) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO service_dependencies (service_id, depends_on_service_id, dependency_type, description)
        VALUES (
          (SELECT id FROM service_templates WHERE service_name = $1),
          (SELECT id FROM service_templates WHERE service_name = $2),
          $3, $4
        )
        RETURNING *
      `;

      const result = await client.query(query, [serviceName, dependsOnServiceName, dependencyType, description]);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  async removeServiceDependency(serviceName, dependsOnServiceName) {
    const client = await this.pool.connect();
    try {
      const query = `
        DELETE FROM service_dependencies 
        WHERE service_id = (SELECT id FROM service_templates WHERE service_name = $1)
        AND depends_on_service_id = (SELECT id FROM service_templates WHERE service_name = $2)
        RETURNING *
      `;

      const result = await client.query(query, [serviceName, dependsOnServiceName]);
      return { success: true, data: result.rows[0] };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 템플릿 복제 및 버전 관리 =====

  async cloneServiceTemplate(originalServiceName, newServiceName, modifications = {}) {
    const client = await this.pool.connect();
    try {
      // [advice from AI] 원본 템플릿 조회
      const originalResult = await this.getServiceTemplate(originalServiceName);
      const original = originalResult.data;

      // [advice from AI] 새 템플릿 데이터 생성
      const newTemplateData = {
        serviceName: newServiceName,
        displayName: modifications.displayName || `${original.display_name} (복사본)`,
        description: modifications.description || `${original.description} - 복사본`,
        category: modifications.category || 'custom',
        serviceType: modifications.serviceType || original.service_type,
        defaultCpu: modifications.defaultCpu || original.default_cpu,
        defaultMemoryGb: modifications.defaultMemoryGb || original.default_memory_gb,
        defaultGpu: modifications.defaultGpu || original.default_gpu,
        defaultStorageGb: modifications.defaultStorageGb || original.default_storage_gb,
        defaultReplicas: modifications.defaultReplicas || original.default_replicas,
        defaultImage: modifications.defaultImage || original.default_image?.replace(original.service_name, newServiceName),
        defaultTag: modifications.defaultTag || original.default_tag,
        defaultRegistry: modifications.defaultRegistry || original.default_registry,
        defaultPorts: modifications.defaultPorts || original.default_ports,
        advancedSettingsTemplate: modifications.advancedSettingsTemplate || original.advanced_settings_template,
        environmentVariablesTemplate: modifications.environmentVariablesTemplate || original.environment_variables_template,
        healthCheckTemplate: modifications.healthCheckTemplate || original.health_check_template,
        defaultMetrics: modifications.defaultMetrics || original.default_metrics,
        monitoringEndpoints: modifications.monitoringEndpoints || original.monitoring_endpoints,
        version: modifications.version || '1.0.0',
        createdBy: modifications.createdBy || 'user'
      };

      const result = await this.createServiceTemplate(newTemplateData);

      return { success: true, data: result.data };

    } finally {
      client.release();
    }
  }

  // [advice from AI] ===== 배포 마법사 연동 =====

  async getServicesForWizard(deploymentMode = 'auto-calculate') {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT 
          service_name,
          display_name,
          category,
          default_cpu,
          default_memory_gb,
          default_gpu,
          default_storage_gb,
          default_replicas,
          default_image,
          default_tag,
          advanced_settings_template,
          environment_variables_template
        FROM service_templates 
        WHERE status = 'active'
      `;

      if (deploymentMode === 'auto-calculate') {
        // [advice from AI] 자동 계산 모드: 기본 서비스 + 주요 커스텀 서비스
        query += ` AND (is_default = true OR category = 'core')`;
      }

      query += ' ORDER BY is_default DESC, category, service_name';

      const result = await client.query(query);

      return {
        success: true,
        data: {
          services: result.rows,
          total: result.rows.length,
          by_category: this.groupByCategory(result.rows)
        }
      };

    } finally {
      client.release();
    }
  }

  groupByCategory(services) {
    return services.reduce((acc, service) => {
      const category = service.category || 'custom';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {});
  }

  // [advice from AI] ===== 템플릿 검증 =====

  async validateServiceTemplate(templateData) {
    const errors = [];

    // [advice from AI] 필수 필드 검증
    if (!templateData.serviceName) errors.push('서비스 이름은 필수입니다');
    if (!templateData.displayName) errors.push('표시 이름은 필수입니다');
    if (!templateData.serviceType) errors.push('서비스 타입은 필수입니다');

    // [advice from AI] 이름 중복 검증
    if (templateData.serviceName) {
      const existing = await this.getServiceTemplate(templateData.serviceName).catch(() => null);
      if (existing) {
        errors.push('이미 존재하는 서비스 이름입니다');
      }
    }

    // [advice from AI] 리소스 범위 검증
    if (templateData.defaultCpu && (templateData.defaultCpu < 0.1 || templateData.defaultCpu > 32)) {
      errors.push('CPU는 0.1-32 Core 범위여야 합니다');
    }

    if (templateData.defaultMemoryGb && (templateData.defaultMemoryGb < 0.1 || templateData.defaultMemoryGb > 128)) {
      errors.push('메모리는 0.1-128 GB 범위여야 합니다');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // [advice from AI] ===== 연결 종료 =====
  async close() {
    await this.pool.end();
    console.log('🔒 서비스 템플릿 관리자 연결 종료');
  }
}

module.exports = ServiceTemplateManager;
