// [advice from AI] 데이터베이스 백업/복원 서비스
// PostgreSQL 자동 백업 및 복원 관리

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const execPromise = util.promisify(exec);

class DatabaseBackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/tmp/db-backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
    this.enableAutoBackup = process.env.ENABLE_AUTO_BACKUP !== 'false';
    
    // 데이터베이스 설정
    this.databases = [
      {
        name: 'timbel_cicd_operator',
        host: process.env.OPERATIONS_DB_HOST || 'postgres',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'timbel_user',
        password: process.env.DB_PASSWORD || 'timbel2024!',
        priority: 'high'
      },
      {
        name: 'timbel_knowledge',
        host: process.env.KNOWLEDGE_DB_HOST || 'postgres',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'timbel_user',
        password: process.env.DB_PASSWORD || 'timbel2024!',
        priority: 'high'
      }
    ];
    
    console.log('💾 DatabaseBackupService 초기화 완료');
    console.log(`   백업 디렉토리: ${this.backupDir}`);
    console.log(`   보관 기간: ${this.retentionDays}일`);
    console.log(`   자동 백업: ${this.enableAutoBackup ? '활성화' : '비활성화'}`);
  }

  /**
   * 백업 디렉토리 초기화
   */
  async initializeBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 백업 디렉토리 생성: ${this.backupDir}`);
      return { success: true };
    } catch (error) {
      console.error('❌ 백업 디렉토리 생성 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 데이터베이스 백업 실행
   */
  async backupDatabase(dbConfig, options = {}) {
    try {
      await this.initializeBackupDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${dbConfig.name}_${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);
      const compressedFilepath = `${filepath}.gz`;
      
      console.log(`💾 데이터베이스 백업 시작: ${dbConfig.name}`);
      
      // pg_dump 명령 실행
      const pgDumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.name} -F p -f ${filepath}`;
      
      await execPromise(pgDumpCommand, {
        timeout: 600000, // 10분
        maxBuffer: 1024 * 1024 * 100 // 100MB
      });
      
      console.log(`✅ 백업 파일 생성 완료: ${filename}`);
      
      // 압축
      if (options.compress !== false) {
        await execPromise(`gzip ${filepath}`);
        console.log(`✅ 백업 파일 압축 완료: ${filename}.gz`);
      }
      
      // 백업 파일 정보 조회
      const stats = await fs.stat(options.compress !== false ? compressedFilepath : filepath);
      
      const backupInfo = {
        database: dbConfig.name,
        filename: options.compress !== false ? `${filename}.gz` : filename,
        filepath: options.compress !== false ? compressedFilepath : filepath,
        size: stats.size,
        size_mb: (stats.size / (1024 * 1024)).toFixed(2),
        created_at: new Date().toISOString(),
        compressed: options.compress !== false
      };
      
      // 백업 메타데이터 저장
      await this.saveBackupMetadata(backupInfo);
      
      console.log(`💾 백업 완료: ${dbConfig.name} (${backupInfo.size_mb} MB)`);
      
      return {
        success: true,
        backup: backupInfo
      };
      
    } catch (error) {
      console.error(`❌ 데이터베이스 백업 실패 (${dbConfig.name}):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 모든 데이터베이스 백업
   */
  async backupAllDatabases(options = {}) {
    try {
      console.log('💾 전체 데이터베이스 백업 시작...');
      
      const results = [];
      
      for (const dbConfig of this.databases) {
        const result = await this.backupDatabase(dbConfig, options);
        results.push({
          database: dbConfig.name,
          ...result
        });
      }
      
      // 통계
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`✅ 전체 백업 완료: ${successful}개 성공, ${failed}개 실패`);
      
      return {
        success: failed === 0,
        total: results.length,
        successful,
        failed,
        results
      };
      
    } catch (error) {
      console.error('❌ 전체 백업 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 데이터베이스 복원
   */
  async restoreDatabase(dbConfig, backupFilepath) {
    try {
      console.log(`🔄 데이터베이스 복원 시작: ${dbConfig.name}`);
      
      // 파일 존재 확인
      await fs.access(backupFilepath);
      
      // 압축 파일인 경우 압축 해제
      let sqlFilepath = backupFilepath;
      if (backupFilepath.endsWith('.gz')) {
        console.log('📦 백업 파일 압축 해제 중...');
        const uncompressedPath = backupFilepath.replace('.gz', '');
        await execPromise(`gunzip -c ${backupFilepath} > ${uncompressedPath}`);
        sqlFilepath = uncompressedPath;
      }
      
      // psql을 사용한 복원
      const restoreCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.name} -f ${sqlFilepath}`;
      
      await execPromise(restoreCommand, {
        timeout: 600000, // 10분
        maxBuffer: 1024 * 1024 * 100 // 100MB
      });
      
      // 압축 해제한 임시 파일 삭제
      if (sqlFilepath !== backupFilepath) {
        await fs.unlink(sqlFilepath).catch(() => {});
      }
      
      console.log(`✅ 데이터베이스 복원 완료: ${dbConfig.name}`);
      
      return {
        success: true,
        message: '데이터베이스 복원 완료'
      };
      
    } catch (error) {
      console.error(`❌ 데이터베이스 복원 실패 (${dbConfig.name}):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 백업 목록 조회
   */
  async listBackups(databaseName = null) {
    try {
      await this.initializeBackupDirectory();
      
      const files = await fs.readdir(this.backupDir);
      
      const backups = await Promise.all(
        files
          .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
          .filter(file => !databaseName || file.startsWith(databaseName))
          .map(async (file) => {
            const filepath = path.join(this.backupDir, file);
            const stats = await fs.stat(filepath);
            
            return {
              filename: file,
              filepath: filepath,
              database: file.split('_')[0],
              size: stats.size,
              size_mb: (stats.size / (1024 * 1024)).toFixed(2),
              created_at: stats.birthtime.toISOString(),
              compressed: file.endsWith('.gz')
            };
          })
      );
      
      // 날짜순 정렬 (최신순)
      backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return {
        success: true,
        backups,
        count: backups.length
      };
      
    } catch (error) {
      console.error('❌ 백업 목록 조회 실패:', error);
      return {
        success: false,
        error: error.message,
        backups: []
      };
    }
  }

  /**
   * 오래된 백업 파일 삭제
   */
  async cleanupOldBackups() {
    try {
      console.log(`🧹 오래된 백업 파일 정리 중... (보관 기간: ${this.retentionDays}일)`);
      
      const files = await fs.readdir(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      let deletedCount = 0;
      let deletedSize = 0;
      
      for (const file of files) {
        if (!file.endsWith('.sql') && !file.endsWith('.sql.gz')) {
          continue;
        }
        
        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
          deletedSize += stats.size;
          console.log(`🗑️ 삭제: ${file}`);
        }
      }
      
      console.log(`✅ 백업 파일 정리 완료: ${deletedCount}개 삭제 (${(deletedSize / (1024 * 1024)).toFixed(2)} MB)`);
      
      return {
        success: true,
        deleted_count: deletedCount,
        deleted_size_mb: (deletedSize / (1024 * 1024)).toFixed(2)
      };
      
    } catch (error) {
      console.error('❌ 백업 파일 정리 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 백업 메타데이터 저장
   */
  async saveBackupMetadata(backupInfo) {
    try {
      const metadataPath = path.join(this.backupDir, 'backups-metadata.json');
      
      let metadata = [];
      try {
        const content = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(content);
      } catch {
        // 파일이 없으면 새로 생성
      }
      
      metadata.push(backupInfo);
      
      // 최근 100개만 유지
      if (metadata.length > 100) {
        metadata = metadata.slice(-100);
      }
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
    } catch (error) {
      console.error('❌ 백업 메타데이터 저장 실패:', error);
    }
  }

  /**
   * 백업 통계
   */
  async getBackupStatistics() {
    try {
      const result = await this.listBackups();
      
      if (!result.success) {
        return result;
      }
      
      const backups = result.backups;
      
      // 데이터베이스별 통계
      const byDatabase = {};
      let totalSize = 0;
      
      for (const backup of backups) {
        if (!byDatabase[backup.database]) {
          byDatabase[backup.database] = {
            count: 0,
            total_size_mb: 0,
            latest_backup: null
          };
        }
        
        byDatabase[backup.database].count++;
        byDatabase[backup.database].total_size_mb += parseFloat(backup.size_mb);
        totalSize += backup.size;
        
        if (!byDatabase[backup.database].latest_backup || 
            new Date(backup.created_at) > new Date(byDatabase[backup.database].latest_backup)) {
          byDatabase[backup.database].latest_backup = backup.created_at;
        }
      }
      
      return {
        success: true,
        statistics: {
          total_backups: backups.length,
          total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
          by_database: byDatabase,
          oldest_backup: backups[backups.length - 1]?.created_at || null,
          newest_backup: backups[0]?.created_at || null
        }
      };
      
    } catch (error) {
      console.error('❌ 백업 통계 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 백업 스케줄러 시작
   */
  startScheduler() {
    if (!this.enableAutoBackup) {
      console.log('⏸️ 자동 백업이 비활성화되어 있습니다');
      return;
    }
    
    const cron = require('node-cron');
    
    // 매일 새벽 2시에 자동 백업
    this.backupSchedule = cron.schedule('0 2 * * *', async () => {
      console.log('⏰ 스케줄된 자동 백업 시작...');
      await this.backupAllDatabases();
      await this.cleanupOldBackups();
    });
    
    // 매주 일요일 새벽 3시에 오래된 백업 정리
    this.cleanupSchedule = cron.schedule('0 3 * * 0', async () => {
      console.log('⏰ 스케줄된 백업 정리 시작...');
      await this.cleanupOldBackups();
    });
    
    console.log('✅ 백업 스케줄러 시작됨');
    console.log('   - 자동 백업: 매일 02:00');
    console.log('   - 백업 정리: 매주 일요일 03:00');
  }

  /**
   * 백업 스케줄러 중지
   */
  stopScheduler() {
    if (this.backupSchedule) {
      this.backupSchedule.stop();
    }
    if (this.cleanupSchedule) {
      this.cleanupSchedule.stop();
    }
    console.log('⏸️ 백업 스케줄러 중지됨');
  }

  /**
   * 데이터베이스 설정 조회
   */
  getDatabaseConfig(databaseName) {
    return this.databases.find(db => db.name === databaseName);
  }
}

// Singleton 인스턴스
let databaseBackupServiceInstance = null;

function getDatabaseBackupService() {
  if (!databaseBackupServiceInstance) {
    databaseBackupServiceInstance = new DatabaseBackupService();
  }
  return databaseBackupServiceInstance;
}

module.exports = {
  DatabaseBackupService,
  getDatabaseBackupService
};

