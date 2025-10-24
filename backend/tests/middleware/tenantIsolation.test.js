// [advice from AI] Tenant Isolation 단위 테스트
// 멀티 테넌시 미들웨어 테스트

const tenantIsolation = require('../../src/middleware/tenantIsolation');

describe('TenantIsolation Middleware', () => {
  
  describe('extractTenantId', () => {
    it('should extract tenant ID from header', () => {
      const mockReq = {
        headers: { 'x-tenant-id': 'tenant-123' },
        query: {},
        user: {},
        hostname: 'localhost'
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = tenantIsolation.extractTenantId();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.tenantId).toBe('tenant-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from query parameter', () => {
      const mockReq = {
        headers: {},
        query: { tenantId: 'tenant-456' },
        user: {},
        hostname: 'localhost'
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = tenantIsolation.extractTenantId();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.tenantId).toBe('tenant-456');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tenant ID from user object', () => {
      const mockReq = {
        headers: {},
        query: {},
        user: { tenantId: 'tenant-789' },
        hostname: 'localhost'
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = tenantIsolation.extractTenantId();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.tenantId).toBe('tenant-789');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireTenant', () => {
    it('should pass when tenant ID exists', () => {
      const mockReq = { tenantId: 'tenant-123' };
      const mockRes = {};
      const mockNext = jest.fn();

      const middleware = tenantIsolation.requireTenant();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 when tenant ID is missing', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = tenantIsolation.requireTenant();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Bad Request'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

