// [advice from AI] 설계서 기반 권한 및 업무 정의

// 설계서의 3단계 리더십 체계
export enum PermissionLevel {
  ADMINISTRATOR = 0,  // 최상위 관리자 - 모든 권한
  LEADER = 1,         // 리더급 - 팀/프로젝트 관리
  MEMBER = 2          // 팀원급 - 개발/실행 업무
}

// 설계서의 리더십 타입
export enum LeadershipType {
  SUPER_ADMIN = 'super_admin',        // 최고 관리자
  TECH_LEAD = 'tech_lead',           // 기술 리더
  BUSINESS_LEAD = 'business_lead',   // 비즈니스 리더  
  QA_LEAD = 'qa_lead'                // 품질 보증 리더
}

// 업무별 세부 권한 정의
export interface WorkPermissions {
  // 카탈로그 관리 권한
  catalog: {
    read: boolean;           // 조회
    create: boolean;         // 생성
    update: boolean;         // 수정
    delete: boolean;         // 삭제
    manageRelations: boolean; // 관계 관리
  };
  
  // AI 바이브 코딩 권한
  vibeCoding: {
    generate: boolean;       // 코드 생성
    analyze: boolean;        // 코드 분석
    optimize: boolean;       // 최적화
    publish: boolean;        // 컴포넌트 발행
  };
  
  // 조직 관리 권한
  organization: {
    viewAll: boolean;        // 전체 조직 조회
    create: boolean;         // 조직 생성
    modify: boolean;         // 조직 수정
    delete: boolean;         // 조직 삭제
    assignUsers: boolean;    // 사용자 배정
  };
  
  // 사용자 관리 권한
  userManagement: {
    viewAll: boolean;        // 전체 사용자 조회
    approve: boolean;        // 가입 승인
    reject: boolean;         // 가입 거부
    modifyPermissions: boolean; // 권한 수정
    deactivate: boolean;     // 계정 비활성화
  };
  
  // ECP-AI K8s 배포 권한
  deployment: {
    view: boolean;           // 배포 현황 조회
    deploy: boolean;         // 배포 실행
    configure: boolean;      // 배포 설정
    monitor: boolean;        // 모니터링
  };
  
  // 성과 분석 권한
  analytics: {
    viewBasic: boolean;      // 기본 통계 조회
    viewAdvanced: boolean;   // 고급 분석 조회
    exportData: boolean;     // 데이터 내보내기
    configure: boolean;      // 분석 설정
  };
}

// 기본 권한 템플릿
export const DEFAULT_PERMISSIONS: Record<PermissionLevel, WorkPermissions> = {
  [PermissionLevel.ADMINISTRATOR]: {
    catalog: { read: true, create: true, update: true, delete: true, manageRelations: true },
    vibeCoding: { generate: true, analyze: true, optimize: true, publish: true },
    organization: { viewAll: true, create: true, modify: true, delete: true, assignUsers: true },
    userManagement: { viewAll: true, approve: true, reject: true, modifyPermissions: true, deactivate: true },
    deployment: { view: true, deploy: true, configure: true, monitor: true },
    analytics: { viewBasic: true, viewAdvanced: true, exportData: true, configure: true }
  },
  
  [PermissionLevel.LEADER]: {
    catalog: { read: true, create: true, update: true, delete: false, manageRelations: true },
    vibeCoding: { generate: true, analyze: true, optimize: true, publish: false },
    organization: { viewAll: false, create: false, modify: false, delete: false, assignUsers: true },
    userManagement: { viewAll: false, approve: false, reject: false, modifyPermissions: false, deactivate: false },
    deployment: { view: true, deploy: true, configure: false, monitor: true },
    analytics: { viewBasic: true, viewAdvanced: true, exportData: false, configure: false }
  },
  
  [PermissionLevel.MEMBER]: {
    catalog: { read: true, create: false, update: false, delete: false, manageRelations: false },
    vibeCoding: { generate: true, analyze: true, optimize: false, publish: false },
    organization: { viewAll: false, create: false, modify: false, delete: false, assignUsers: false },
    userManagement: { viewAll: false, approve: false, reject: false, modifyPermissions: false, deactivate: false },
    deployment: { view: true, deploy: false, configure: false, monitor: false },
    analytics: { viewBasic: true, viewAdvanced: false, exportData: false, configure: false }
  }
};

// 팀벨 메인 회사 정보
export const TIMBEL_COMPANY = {
  name: '팀벨',
  businessName: '(주)팀벨 Timeless Label',
  address: '서울 강남구 강남대로 94길 66, 신동빌딩 3-5층',
  phone: '02-584-8181',
  email: 'sales@timbel.net',
  businessNumber: '206-81-58545'
};

// 기본 부서 목록 (팀벨 기준)
export const DEFAULT_DEPARTMENTS = [
  '경영진',
  '기술개발팀',
  '비즈니스개발팀', 
  '품질보증팀',
  '마케팅팀',
  '영업팀',
  '고객지원팀',
  '기타'
];

// 기본 직책 목록
export const DEFAULT_POSITIONS = [
  'CEO/대표',
  'CTO/기술이사',
  'VP/부사장',
  '팀장/리더',
  '시니어 개발자',
  '개발자',
  '주니어 개발자',
  '기획자',
  '디자이너',
  '마케터',
  '영업담당자',
  '기타'
];
