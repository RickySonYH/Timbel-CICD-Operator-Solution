// [advice from AI] 간단하고 견고한 User 모델

import { Database } from '../utils/database';
import { AuthUser } from '../types/auth';

export interface DBUser {
  id: string;
  company_id?: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  department?: string;
  position?: string;
  permission_level: number;
  org_structure_id?: string;
  leadership_type?: string;
  work_permissions: any;
  team_assignment: any;
  approval_info: any;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

export class UserModel {
  // [advice from AI] 이메일 또는 사용자명으로 사용자 찾기
  static async findByLoginId(loginId: string): Promise<DBUser | null> {
    const result = await Database.query(`
      SELECT u.*, c.name as company_name, o.name as org_name
      FROM timbel_users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN timbel_organization o ON u.org_structure_id = o.id
      WHERE u.email = $1 OR u.username = $1
      LIMIT 1
    `, [loginId]);

    return result.rows[0] || null;
  }

  // [advice from AI] ID로 사용자 찾기
  static async findById(id: string): Promise<DBUser | null> {
    const result = await Database.query(`
      SELECT u.*, c.name as company_name, o.name as org_name
      FROM timbel_users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN timbel_organization o ON u.org_structure_id = o.id
      WHERE u.id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  // [advice from AI] 사용자 생성
  static async create(userData: {
    company_id?: string;
    username: string;
    email: string;
    password_hash: string;
    full_name: string;
    department?: string;
    position?: string;
    permission_level: number;
    org_structure_id?: string;
    leadership_type?: string;
    status: string;
  }): Promise<DBUser> {
    const result = await Database.query(`
      INSERT INTO timbel_users (
        company_id, username, email, password_hash, full_name,
        department, position, permission_level, org_structure_id,
        leadership_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      userData.company_id,
      userData.username,
      userData.email,
      userData.password_hash,
      userData.full_name,
      userData.department,
      userData.position,
      userData.permission_level,
      userData.org_structure_id,
      userData.leadership_type,
      userData.status
    ]);

    return result.rows[0];
  }

  // [advice from AI] 마지막 로그인 시간 업데이트
  static async updateLastLogin(id: string): Promise<void> {
    await Database.query(`
      UPDATE timbel_users 
      SET last_login_at = NOW()
      WHERE id = $1
    `, [id]);
  }

  // [advice from AI] 사용자 상태 업데이트
  static async updateStatus(id: string, status: string): Promise<void> {
    await Database.query(`
      UPDATE timbel_users 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, id]);
  }

  // [advice from AI] DB 사용자를 AuthUser로 변환
  static toAuthUser(dbUser: DBUser): AuthUser {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      fullName: dbUser.full_name,
      permissionLevel: dbUser.permission_level,
      leadershipType: dbUser.leadership_type || undefined,
      organization: dbUser.org_structure_id ? {
        id: dbUser.org_structure_id,
        name: (dbUser as any).org_name || '',
        permissionLevel: dbUser.permission_level
      } : undefined
    };
  }
}
