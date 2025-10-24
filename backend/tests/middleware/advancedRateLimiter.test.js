// [advice from AI] Advanced Rate Limiter 단위 테스트
// Rate Limiting 미들웨어 테스트

const rateLimiter = require('../../src/middleware/advancedRateLimiter');

describe('AdvancedRateLimiter Middleware', () => {
  
  describe('getIdentifier', () => {
    it('should extract user identifier from request', () => {
      const mockReq = {
        user: { id: 'user-123' },
        ip: '192.168.1.1'
      };

      const identifier = rateLimiter.getIdentifier(mockReq);
      expect(identifier).toBe('user:user-123');
    });

    it('should use IP when user is not authenticated', () => {
      const mockReq = {
        ip: '192.168.1.1'
      };

      const identifier = rateLimiter.getIdentifier(mockReq);
      expect(identifier).toBe('ip:192.168.1.1');
    });
  });

  describe('getLimit', () => {
    it('should return correct limit for admin role', () => {
      const mockReq = {
        user: { role: 'admin' }
      };

      const limit = rateLimiter.getLimit(mockReq);
      expect(limit).toBe(1000);
    });

    it('should return IP limit for unauthenticated users', () => {
      const mockReq = {};

      const limit = rateLimiter.getLimit(mockReq);
      expect(limit).toBe(20);
    });

    it('should return default limit for unknown roles', () => {
      const mockReq = {
        user: { role: 'unknown' }
      };

      const limit = rateLimiter.getLimit(mockReq);
      expect(limit).toBe(60);
    });
  });

  describe('roleLimits', () => {
    it('should have correct role limits defined', () => {
      expect(rateLimiter.roleLimits.admin).toBe(1000);
      expect(rateLimiter.roleLimits.operations).toBe(300);
      expect(rateLimiter.roleLimits.developer).toBe(100);
      expect(rateLimiter.roleLimits.viewer).toBe(30);
      expect(rateLimiter.roleLimits.default).toBe(60);
    });
  });
});

