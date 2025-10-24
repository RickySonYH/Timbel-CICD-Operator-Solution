// [advice from AI] 멀티 테넌시 격리 미들웨어
// 테넌트별 데이터 격리 및 권한 검증

class TenantIsolationMiddleware {
  /**
   * 요청에서 테넌트 ID 추출
   */
  extractTenantId() {
    return (req, res, next) => {
      let tenantId = null;

      // 1. 헤더에서 추출
      if (req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
      }
      
      // 2. 쿼리 파라미터에서 추출
      else if (req.query.tenantId) {
        tenantId = req.query.tenantId;
      }
      
      // 3. JWT 토큰에서 추출
      else if (req.user && req.user.tenantId) {
        tenantId = req.user.tenantId;
      }
      
      // 4. 서브도메인에서 추출 (예: tenant1.api.example.com)
      else if (req.hostname) {
        const subdomain = req.hostname.split('.')[0];
        if (subdomain && subdomain !== 'api' && subdomain !== 'www') {
          tenantId = subdomain;
        }
      }

      // 테넌트 ID 설정
      req.tenantId = tenantId;
      
      next();
    };
  }

  /**
   * 테넌트 ID 필수 검증
   */
  requireTenant() {
    return (req, res, next) => {
      if (!req.tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Tenant ID is required'
        });
      }

      next();
    };
  }

  /**
   * 테넌트 접근 권한 검증
   */
  verifyTenantAccess() {
    return async (req, res, next) => {
      try {
        const { tenantId } = req;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'User authentication required'
          });
        }

        // 테넌트 사용자 권한 확인
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.AUTH_DB_HOST || 'postgres',
          port: process.env.AUTH_DB_PORT || 5432,
          database: process.env.AUTH_DB_NAME || 'timbel_auth',
          user: process.env.AUTH_DB_USER || 'timbel_user',
          password: process.env.AUTH_DB_PASSWORD || 'timbel_password',
        });

        const result = await pool.query(
          `SELECT role FROM tenant_users WHERE tenant_id = $1 AND user_id = $2`,
          [tenantId, userId]
        );

        if (result.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Access to this tenant is denied'
          });
        }

        // 사용자의 테넌트 역할 설정
        req.tenantRole = result.rows[0].role;

        next();
      } catch (error) {
        console.error('❌ 테넌트 접근 권한 검증 실패:', error);
        next(error);
      }
    };
  }

  /**
   * 테넌트 역할 권한 검증
   */
  requireTenantRole(allowedRoles) {
    return (req, res, next) => {
      const userRole = req.tenantRole;

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `This action requires one of the following tenant roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    };
  }

  /**
   * 리소스 사용량 체크
   */
  checkResourceQuota(resourceType) {
    return async (req, res, next) => {
      try {
        const { tenantId } = req;

        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.AUTH_DB_HOST || 'postgres',
          port: process.env.AUTH_DB_PORT || 5432,
          database: process.env.AUTH_DB_NAME || 'timbel_auth',
          user: process.env.AUTH_DB_USER || 'timbel_user',
          password: process.env.AUTH_DB_PASSWORD || 'timbel_password',
        });

        // 테넌트 정보 조회
        const tenantResult = await pool.query(
          `SELECT * FROM tenants WHERE id = $1`,
          [tenantId]
        );

        if (tenantResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Tenant not found'
          });
        }

        const tenant = tenantResult.rows[0];

        // 리소스별 할당량 체크
        const quotaChecks = {
          users: tenant.max_users,
          projects: tenant.max_projects,
          deployments: tenant.max_deployments_per_day,
          storage: tenant.max_storage_gb
        };

        if (quotaChecks[resourceType] !== undefined) {
          // 현재 사용량 조회
          const usageResult = await pool.query(
            `SELECT COUNT(*) as current_usage FROM ${resourceType} WHERE tenant_id = $1`,
            [tenantId]
          );

          const currentUsage = parseInt(usageResult.rows[0]?.current_usage || 0);
          const maxAllowed = quotaChecks[resourceType];

          if (currentUsage >= maxAllowed) {
            return res.status(429).json({
              success: false,
              error: 'Quota Exceeded',
              message: `Resource quota exceeded for ${resourceType}. Current: ${currentUsage}, Max: ${maxAllowed}`
            });
          }

          // 리소스 사용량 정보 추가
          req.resourceQuota = {
            type: resourceType,
            current: currentUsage,
            max: maxAllowed,
            available: maxAllowed - currentUsage
          };
        }

        next();
      } catch (error) {
        console.error('❌ 리소스 할당량 체크 실패:', error);
        // Graceful degradation
        next();
      }
    };
  }
}

module.exports = new TenantIsolationMiddleware();

