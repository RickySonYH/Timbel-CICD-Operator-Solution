// [advice from AI] API 버전 관리 미들웨어
// URL 기반 버전 관리 (v1, v2)

class APIVersioning {
  /**
   * API 버전 추출 미들웨어
   */
  extractVersion() {
    return (req, res, next) => {
      // URL에서 버전 추출: /api/v1/users, /api/v2/users
      const versionMatch = req.path.match(/^\/api\/v(\d+)\//);
      
      if (versionMatch) {
        req.apiVersion = `v${versionMatch[1]}`;
      } else {
        // 버전이 없으면 기본값 v1
        req.apiVersion = 'v1';
      }

      // 헤더에서 버전 확인 (우선순위)
      const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
      if (headerVersion) {
        req.apiVersion = headerVersion;
      }

      next();
    };
  }

  /**
   * 특정 버전 요구 미들웨어
   */
  requireVersion(allowedVersions) {
    return (req, res, next) => {
      if (!allowedVersions.includes(req.apiVersion)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid API Version',
          message: `This endpoint supports: ${allowedVersions.join(', ')}`,
          currentVersion: req.apiVersion
        });
      }

      next();
    };
  }

  /**
   * 버전별 라우터 매핑
   */
  versionRouter(versionRoutes) {
    return (req, res, next) => {
      const version = req.apiVersion;
      const route = versionRoutes[version];

      if (route) {
        return route(req, res, next);
      }

      // 버전이 없으면 최신 버전 사용
      const latestVersion = Object.keys(versionRoutes).sort().reverse()[0];
      const latestRoute = versionRoutes[latestVersion];

      if (latestRoute) {
        req.apiVersion = latestVersion;
        return latestRoute(req, res, next);
      }

      next();
    };
  }

  /**
   * 버전 지원 종료 경고
   */
  deprecationWarning(version, sunsetDate) {
    return (req, res, next) => {
      if (req.apiVersion === version) {
        res.setHeader('Sunset', sunsetDate);
        res.setHeader('Deprecation', 'true');
        res.setHeader('Link', '<https://api.docs.timbel.io/migration>; rel="deprecation"');
      }

      next();
    };
  }
}

module.exports = new APIVersioning();

