// [advice from AI] 보안 스캔 API
// Trivy를 이용한 이미지 및 저장소 스캔

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const securityScanner = require('../services/securityScanner');

/**
 * GET /api/security/scan/status
 * Trivy 설치 상태 확인
 */
router.get('/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const installed = await securityScanner.checkTrivyInstalled();

    res.json({
      success: true,
      data: {
        trivyInstalled: installed,
        message: installed 
          ? 'Trivy가 정상적으로 설치되어 있습니다' 
          : 'Trivy를 설치해주세요: https://aquasecurity.github.io/trivy/latest/getting-started/installation/'
      }
    });
  } catch (error) {
    console.error('❌ Trivy 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/security/scan/image
 * Docker 이미지 스캔
 */
router.post('/image', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'developer']), async (req, res) => {
  try {
    const { imageName, severity, exitCode } = req.body;

    if (!imageName) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'imageName은 필수입니다'
      });
    }

    const result = await securityScanner.scanImage(imageName, {
      severity,
      exitCode
    });

    res.json({
      success: true,
      data: result,
      message: `이미지 스캔 완료: ${result.summary.total}개의 취약점 발견`
    });
  } catch (error) {
    console.error('❌ 이미지 스캔 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/security/scan/filesystem
 * 파일시스템 스캔
 */
router.post('/filesystem', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { targetPath, severity, scanners } = req.body;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'targetPath는 필수입니다'
      });
    }

    const result = await securityScanner.scanFilesystem(targetPath, {
      severity,
      scanners
    });

    res.json({
      success: true,
      data: result,
      message: `파일시스템 스캔 완료: ${result.summary.total}개의 취약점 발견`
    });
  } catch (error) {
    console.error('❌ 파일시스템 스캔 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/security/scan/repository
 * Git 저장소 스캔
 */
router.post('/repository', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'developer']), async (req, res) => {
  try {
    const { repoUrl, severity, branch } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'repoUrl은 필수입니다'
      });
    }

    const result = await securityScanner.scanRepository(repoUrl, {
      severity,
      branch
    });

    res.json({
      success: true,
      data: result,
      message: `저장소 스캔 완료: ${result.summary.total}개의 취약점 발견`
    });
  } catch (error) {
    console.error('❌ 저장소 스캔 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/security/scan/results
 * 스캔 결과 목록 조회
 */
router.get('/results', jwtAuth.verifyToken, async (req, res) => {
  try {
    const results = await securityScanner.listScanResults();

    res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    console.error('❌ 스캔 결과 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/security/scan/results/:scanId
 * 특정 스캔 결과 조회
 */
router.get('/results/:scanId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { scanId } = req.params;

    const result = await securityScanner.getScanResult(scanId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ 스캔 결과 조회 실패:', error);
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: error.message
    });
  }
});

/**
 * POST /api/security/scan/update-db
 * Trivy 데이터베이스 업데이트
 */
router.post('/update-db', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const success = await securityScanner.updateDatabase();

    res.json({
      success,
      message: success 
        ? 'Trivy 데이터베이스가 업데이트되었습니다' 
        : 'Trivy 데이터베이스 업데이트에 실패했습니다'
    });
  } catch (error) {
    console.error('❌ 데이터베이스 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/security/scan/clean
 * 오래된 스캔 결과 정리
 */
router.delete('/clean', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { daysOld = 30 } = req.query;

    const deletedCount = await securityScanner.cleanOldResults(parseInt(daysOld));

    res.json({
      success: true,
      data: { deletedCount },
      message: `${deletedCount}개의 오래된 스캔 결과가 삭제되었습니다`
    });
  } catch (error) {
    console.error('❌ 스캔 결과 정리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

