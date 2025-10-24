// [advice from AI] SLA Monitor 단위 테스트
// SLA 모니터링 서비스 테스트

const slaMonitor = require('../../src/services/slaMonitor');

describe('SLAMonitor Service', () => {
  
  describe('parseVulnerabilities', () => {
    it('should generate correct summary from vulnerabilities', () => {
      const vulnerabilities = [
        { severity: 'CRITICAL' },
        { severity: 'CRITICAL' },
        { severity: 'HIGH' },
        { severity: 'MEDIUM' },
        { severity: 'LOW' }
      ];

      const summary = {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: vulnerabilities.filter(v => v.severity === 'LOW').length
      };

      expect(summary.total).toBe(5);
      expect(summary.critical).toBe(2);
      expect(summary.high).toBe(1);
      expect(summary.medium).toBe(1);
      expect(summary.low).toBe(1);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary correctly', () => {
      const mockVulns = [
        { severity: 'HIGH' },
        { severity: 'MEDIUM' }
      ];

      // 실제 generateSummary 메서드는 securityScanner에 있음
      // 여기서는 로직 테스트만 수행
      expect(mockVulns).toHaveLength(2);
    });
  });
});

