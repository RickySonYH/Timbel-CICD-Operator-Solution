// [advice from AI] 데이터베이스 백업/복원 API 라우트

const express = require('express');
const router = express.Router();
const { getDatabaseBackupService } = require('../services/databaseBackupService');

const backupService = getDatabaseBackupService();

/**
 * @route   POST /api/backup/databases
 * @desc    전체 데이터베이스 백업
 * @access  Private (Admin)
 */
router.post('/databases', async (req, res) => {
  try {
    const options = {
      compress: req.body.compress !== false
    };
    
    console.log('💾 전체 데이터베이스 백업 요청');
    
    const result = await backupService.backupAllDatabases(options);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? '백업이 완료되었습니다' : '백업 중 오류가 발생했습니다'
    });
    
  } catch (error) {
    console.error('❌ 백업 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/backup/database/:dbName
 * @desc    특정 데이터베이스 백업
 * @access  Private (Admin)
 */
router.post('/database/:dbName', async (req, res) => {
  try {
    const { dbName } = req.params;
    const options = {
      compress: req.body.compress !== false
    };
    
    const dbConfig = backupService.getDatabaseConfig(dbName);
    
    if (!dbConfig) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '데이터베이스를 찾을 수 없습니다'
      });
    }
    
    console.log(`💾 데이터베이스 백업 요청: ${dbName}`);
    
    const result = await backupService.backupDatabase(dbConfig, options);
    
    res.json({
      success: result.success,
      data: result.backup,
      message: result.success ? '백업이 완료되었습니다' : '백업 실패'
    });
    
  } catch (error) {
    console.error('❌ 백업 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/backup/list
 * @desc    백업 목록 조회
 * @access  Private (Admin)
 */
router.get('/list', async (req, res) => {
  try {
    const { database } = req.query;
    
    const result = await backupService.listBackups(database);
    
    res.json({
      success: result.success,
      data: result.backups,
      count: result.count
    });
    
  } catch (error) {
    console.error('❌ 백업 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/backup/restore/:dbName
 * @desc    데이터베이스 복원
 * @access  Private (Admin)
 */
router.post('/restore/:dbName', async (req, res) => {
  try {
    const { dbName } = req.params;
    const { backup_filepath } = req.body;
    
    if (!backup_filepath) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'backup_filepath가 필요합니다'
      });
    }
    
    const dbConfig = backupService.getDatabaseConfig(dbName);
    
    if (!dbConfig) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '데이터베이스를 찾을 수 없습니다'
      });
    }
    
    console.log(`🔄 데이터베이스 복원 요청: ${dbName}`);
    console.warn('⚠️ 주의: 데이터베이스 복원은 기존 데이터를 덮어씁니다!');
    
    const result = await backupService.restoreDatabase(dbConfig, backup_filepath);
    
    res.json({
      success: result.success,
      message: result.success ? '복원이 완료되었습니다' : '복원 실패',
      data: result
    });
    
  } catch (error) {
    console.error('❌ 복원 API 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/backup/cleanup
 * @desc    오래된 백업 파일 정리
 * @access  Private (Admin)
 */
router.delete('/cleanup', async (req, res) => {
  try {
    console.log('🧹 백업 파일 정리 요청');
    
    const result = await backupService.cleanupOldBackups();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success 
        ? `${result.deleted_count}개의 백업 파일이 삭제되었습니다 (${result.deleted_size_mb} MB)` 
        : '백업 파일 정리 실패'
    });
    
  } catch (error) {
    console.error('❌ 백업 정리 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/backup/statistics
 * @desc    백업 통계
 * @access  Private (Admin)
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = await backupService.getBackupStatistics();
    
    res.json({
      success: result.success,
      data: result.statistics
    });
    
  } catch (error) {
    console.error('❌ 백업 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/backup/config
 * @desc    백업 설정 조회
 * @access  Private (Admin)
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        backup_dir: backupService.backupDir,
        retention_days: backupService.retentionDays,
        enable_auto_backup: backupService.enableAutoBackup,
        databases: backupService.databases.map(db => ({
          name: db.name,
          priority: db.priority
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ 백업 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;

