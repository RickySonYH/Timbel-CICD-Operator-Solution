// [advice from AI] 보안 취약점 자동 스캔 서비스 (Trivy)
// Docker 이미지 및 코드 저장소 보안 스캔

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const execPromise = util.promisify(exec);

class SecurityScanner {
  constructor() {
    this.trivyPath = process.env.TRIVY_PATH || 'trivy';
    this.scanResultsDir = process.env.SCAN_RESULTS_DIR || '/tmp/trivy-results';
  }

  /**
   * Trivy 설치 확인
   */
  async checkTrivyInstalled() {
    try {
      const { stdout } = await execPromise(`${this.trivyPath} --version`);
      console.log('✅ Trivy 설치 확인:', stdout.trim());
      return true;
    } catch (error) {
      console.warn('⚠️  Trivy가 설치되지 않았습니다. 설치 안내를 제공합니다.');
      return false;
    }
  }

  /**
   * Docker 이미지 스캔
   */
  async scanImage(imageName, options = {}) {
    const {
      severity = 'HIGH,CRITICAL',
      format = 'json',
      exitCode = false,
      timeout = 300000 // 5분
    } = options;

    try {
      console.log(`🔍 이미지 스캔 시작: ${imageName}`);

      const scanId = `scan-${Date.now()}`;
      const resultFile = path.join(this.scanResultsDir, `${scanId}.json`);

      // 결과 디렉토리 생성
      await fs.mkdir(this.scanResultsDir, { recursive: true });

      // Trivy 스캔 실행
      const command = `${this.trivyPath} image \
        --severity ${severity} \
        --format ${format} \
        --output ${resultFile} \
        ${exitCode ? '--exit-code 1' : ''} \
        ${imageName}`;

      let scanResult;
      try {
        const { stdout, stderr } = await execPromise(command, { timeout });
        scanResult = { stdout, stderr, exitCode: 0 };
      } catch (error) {
        // Exit code가 0이 아닌 경우 (취약점 발견)
        scanResult = {
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          exitCode: error.code || 1
        };
      }

      // 결과 파일 읽기
      let vulnerabilities = [];
      try {
        const resultContent = await fs.readFile(resultFile, 'utf8');
        const parsedResult = JSON.parse(resultContent);
        vulnerabilities = this.parseVulnerabilities(parsedResult);
      } catch (error) {
        console.warn('⚠️  결과 파일 파싱 실패:', error.message);
      }

      const summary = this.generateSummary(vulnerabilities);

      console.log(`✅ 스캔 완료: ${imageName} (취약점: ${summary.total}개)`);

      return {
        scanId,
        imageName,
        scannedAt: new Date().toISOString(),
        summary,
        vulnerabilities,
        resultFile,
        exitCode: scanResult.exitCode
      };
    } catch (error) {
      console.error(`❌ 이미지 스캔 실패: ${imageName}`, error);
      throw new Error(`이미지 스캔 실패: ${error.message}`);
    }
  }

  /**
   * 파일시스템 스캔
   */
  async scanFilesystem(targetPath, options = {}) {
    const {
      severity = 'HIGH,CRITICAL',
      format = 'json',
      scanners = 'vuln,config,secret'
    } = options;

    try {
      console.log(`🔍 파일시스템 스캔 시작: ${targetPath}`);

      const scanId = `fs-scan-${Date.now()}`;
      const resultFile = path.join(this.scanResultsDir, `${scanId}.json`);

      await fs.mkdir(this.scanResultsDir, { recursive: true });

      const command = `${this.trivyPath} fs \
        --severity ${severity} \
        --format ${format} \
        --scanners ${scanners} \
        --output ${resultFile} \
        ${targetPath}`;

      await execPromise(command, { timeout: 300000 });

      const resultContent = await fs.readFile(resultFile, 'utf8');
      const parsedResult = JSON.parse(resultContent);
      const vulnerabilities = this.parseVulnerabilities(parsedResult);
      const summary = this.generateSummary(vulnerabilities);

      console.log(`✅ 파일시스템 스캔 완료: ${targetPath}`);

      return {
        scanId,
        targetPath,
        scannedAt: new Date().toISOString(),
        summary,
        vulnerabilities,
        resultFile
      };
    } catch (error) {
      console.error(`❌ 파일시스템 스캔 실패: ${targetPath}`, error);
      throw new Error(`파일시스템 스캔 실패: ${error.message}`);
    }
  }

  /**
   * Git 저장소 스캔
   */
  async scanRepository(repoUrl, options = {}) {
    const {
      severity = 'HIGH,CRITICAL',
      branch = 'main'
    } = options;

    try {
      console.log(`🔍 저장소 스캔 시작: ${repoUrl}`);

      const scanId = `repo-scan-${Date.now()}`;
      const resultFile = path.join(this.scanResultsDir, `${scanId}.json`);

      await fs.mkdir(this.scanResultsDir, { recursive: true });

      const command = `${this.trivyPath} repo \
        --severity ${severity} \
        --format json \
        --output ${resultFile} \
        --branch ${branch} \
        ${repoUrl}`;

      await execPromise(command, { timeout: 600000 }); // 10분

      const resultContent = await fs.readFile(resultFile, 'utf8');
      const parsedResult = JSON.parse(resultContent);
      const vulnerabilities = this.parseVulnerabilities(parsedResult);
      const summary = this.generateSummary(vulnerabilities);

      console.log(`✅ 저장소 스캔 완료: ${repoUrl}`);

      return {
        scanId,
        repoUrl,
        branch,
        scannedAt: new Date().toISOString(),
        summary,
        vulnerabilities,
        resultFile
      };
    } catch (error) {
      console.error(`❌ 저장소 스캔 실패: ${repoUrl}`, error);
      throw new Error(`저장소 스캔 실패: ${error.message}`);
    }
  }

  /**
   * 취약점 데이터 파싱
   */
  parseVulnerabilities(scanResult) {
    const vulnerabilities = [];

    if (!scanResult.Results) {
      return vulnerabilities;
    }

    for (const result of scanResult.Results) {
      if (!result.Vulnerabilities) continue;

      for (const vuln of result.Vulnerabilities) {
        vulnerabilities.push({
          id: vuln.VulnerabilityID,
          packageName: vuln.PkgName,
          installedVersion: vuln.InstalledVersion,
          fixedVersion: vuln.FixedVersion || 'N/A',
          severity: vuln.Severity,
          title: vuln.Title || '',
          description: vuln.Description || '',
          references: vuln.References || [],
          publishedDate: vuln.PublishedDate,
          lastModifiedDate: vuln.LastModifiedDate,
          cvss: vuln.CVSS || {},
          target: result.Target
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * 취약점 요약 생성
   */
  generateSummary(vulnerabilities) {
    const summary = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0
    };

    for (const vuln of vulnerabilities) {
      const severity = vuln.severity.toUpperCase();
      if (severity === 'CRITICAL') summary.critical++;
      else if (severity === 'HIGH') summary.high++;
      else if (severity === 'MEDIUM') summary.medium++;
      else if (severity === 'LOW') summary.low++;
      else summary.unknown++;
    }

    return summary;
  }

  /**
   * 스캔 결과 조회
   */
  async getScanResult(scanId) {
    try {
      const resultFile = path.join(this.scanResultsDir, `${scanId}.json`);
      const content = await fs.readFile(resultFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`스캔 결과를 찾을 수 없습니다: ${scanId}`);
    }
  }

  /**
   * 스캔 결과 목록 조회
   */
  async listScanResults() {
    try {
      await fs.mkdir(this.scanResultsDir, { recursive: true });
      const files = await fs.readdir(this.scanResultsDir);
      
      const results = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(path.join(this.scanResultsDir, file));
          results.push({
            scanId: file.replace('.json', ''),
            createdAt: stats.mtime,
            size: stats.size
          });
        }
      }

      return results.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('❌ 스캔 결과 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 오래된 스캔 결과 정리
   */
  async cleanOldResults(daysOld = 30) {
    try {
      const files = await fs.readdir(this.scanResultsDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.scanResultsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      console.log(`✅ ${deletedCount}개의 오래된 스캔 결과 삭제`);
      return deletedCount;
    } catch (error) {
      console.error('❌ 스캔 결과 정리 실패:', error);
      return 0;
    }
  }

  /**
   * Trivy 데이터베이스 업데이트
   */
  async updateDatabase() {
    try {
      console.log('🔄 Trivy 데이터베이스 업데이트 중...');
      await execPromise(`${this.trivyPath} image --download-db-only`);
      console.log('✅ Trivy 데이터베이스 업데이트 완료');
      return true;
    } catch (error) {
      console.error('❌ Trivy 데이터베이스 업데이트 실패:', error);
      return false;
    }
  }
}

module.exports = new SecurityScanner();

