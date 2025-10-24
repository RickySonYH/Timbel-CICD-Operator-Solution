// [advice from AI] Security Scanner 단위 테스트
// 보안 스캔 서비스 테스트

const securityScanner = require('../../src/services/securityScanner');

describe('SecurityScanner Service', () => {
  
  describe('parseVulnerabilities', () => {
    it('should parse vulnerabilities correctly', () => {
      const mockScanResult = {
        Results: [
          {
            Target: 'test-image:latest',
            Vulnerabilities: [
              {
                VulnerabilityID: 'CVE-2024-1234',
                PkgName: 'test-package',
                InstalledVersion: '1.0.0',
                FixedVersion: '1.0.1',
                Severity: 'HIGH',
                Title: 'Test Vulnerability',
                Description: 'Test description'
              }
            ]
          }
        ]
      };

      const vulnerabilities = securityScanner.parseVulnerabilities(mockScanResult);

      expect(vulnerabilities).toHaveLength(1);
      expect(vulnerabilities[0].id).toBe('CVE-2024-1234');
      expect(vulnerabilities[0].severity).toBe('HIGH');
    });

    it('should return empty array for no results', () => {
      const mockScanResult = {};
      const vulnerabilities = securityScanner.parseVulnerabilities(mockScanResult);
      expect(vulnerabilities).toEqual([]);
    });
  });

  describe('generateSummary', () => {
    it('should generate correct vulnerability summary', () => {
      const vulnerabilities = [
        { severity: 'CRITICAL' },
        { severity: 'HIGH' },
        { severity: 'HIGH' },
        { severity: 'MEDIUM' }
      ];

      const summary = securityScanner.generateSummary(vulnerabilities);

      expect(summary.total).toBe(4);
      expect(summary.critical).toBe(1);
      expect(summary.high).toBe(2);
      expect(summary.medium).toBe(1);
      expect(summary.low).toBe(0);
    });
  });

  describe('checkTrivyInstalled', () => {
    it('should check if Trivy is installed', async () => {
      const result = await securityScanner.checkTrivyInstalled();
      expect(typeof result).toBe('boolean');
    });
  });
});

