// [advice from AI] 역할별 계정 시드 스크립트
// PO-PE-QA-운영팀 구조의 역할별 계정을 데이터베이스에 등록

import { Database } from '../utils/database';
import { SecurityUtils } from '../utils/security';
import { logger } from '../utils/logger';

// [advice from AI] 역할별 계정 데이터
const ROLE_USERS = [
  {
    id: 'exec-001',
    username: 'executive',
    email: 'executive@timbel.com',
    fullName: '최고 관리자',
    permissionLevel: 0,
    roleType: 'executive',
    password: '1q2w3e4r',
    department: '경영진',
    position: '최고관리자'
  },
  {
    id: 'po-001',
    username: 'pouser',
    email: 'po@timbel.com',
    fullName: 'PO 사용자',
    permissionLevel: 1,
    roleType: 'po',
    password: '1q2w3e4r',
    department: '프로젝트관리팀',
    position: '프로젝트 오너'
  },
  {
    id: 'pe-001',
    username: 'peuser',
    email: 'pe@timbel.com',
    fullName: 'PE 사용자',
    permissionLevel: 2,
    roleType: 'pe',
    password: '1q2w3e4r',
    department: '개발팀',
    position: '프로젝트 엔지니어'
  },
  {
    id: 'qa-001',
    username: 'qauser',
    email: 'qa@timbel.com',
    fullName: 'QA 사용자',
    permissionLevel: 3,
    roleType: 'qa',
    password: '1q2w3e4r',
    department: '품질관리팀',
    position: 'QA/QC'
  },
  {
    id: 'op-001',
    username: 'opuser',
    email: 'operations@timbel.com',
    fullName: '운영팀 사용자',
    permissionLevel: 4,
    roleType: 'operations',
    password: '1q2w3e4r',
    department: '운영팀',
    position: '운영 관리자'
  }
];

async function seedRoleUsers() {
  try {
    logger.info('역할별 계정 시드 시작...');

    for (const userData of ROLE_USERS) {
      // [advice from AI] 기존 사용자 확인
      const existingUser = await Database.query(`
        SELECT id FROM timbel_users WHERE id = $1 OR username = $2 OR email = $3
      `, [userData.id, userData.username, userData.email]);

      if (existingUser.rows.length > 0) {
        logger.info(`사용자 ${userData.username} 이미 존재함, 건너뜀`);
        continue;
      }

      // [advice from AI] 비밀번호 해싱
      const passwordHash = await SecurityUtils.hashPassword(userData.password);

      // [advice from AI] 사용자 생성
      await Database.query(`
        INSERT INTO timbel_users (
          id, username, email, password_hash, full_name,
          department, position, permission_level, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        userData.id,
        userData.username,
        userData.email,
        passwordHash,
        userData.fullName,
        userData.department,
        userData.position,
        userData.permissionLevel,
        'active'
      ]);

      logger.info(`역할별 계정 생성 완료: ${userData.username} (${userData.roleType})`);
    }

    logger.info('역할별 계정 시드 완료!');
  } catch (error) {
    logger.error('역할별 계정 시드 실패:', error);
    throw error;
  }
}

// [advice from AI] 스크립트 실행
if (require.main === module) {
  seedRoleUsers()
    .then(() => {
      logger.info('시드 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('시드 스크립트 실패:', error);
      process.exit(1);
    });
}

export { seedRoleUsers };
