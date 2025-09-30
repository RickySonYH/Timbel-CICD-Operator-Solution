-- [advice from AI] Timbel 플랫폼 데이터베이스 초기화 스크립트
-- 개발계획서의 스키마 설계를 기반으로 구성

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "vector"; -- 벡터 검색을 위한 확장 (추후 설치)

-- 개발 환경 설정
SET timezone = 'Asia/Seoul';

-- 기본 데이터베이스 설정
COMMENT ON DATABASE timbel_knowledge IS 'Timbel 지식자원 플랫폼 데이터베이스';

-- 기본 스키마 생성
CREATE SCHEMA IF NOT EXISTS timbel_catalog;
CREATE SCHEMA IF NOT EXISTS timbel_auth;
CREATE SCHEMA IF NOT EXISTS timbel_analytics;

COMMENT ON SCHEMA timbel_catalog IS '카탈로그 시스템 (Domain → System → Component)';
COMMENT ON SCHEMA timbel_auth IS '인증 및 조직 관리 시스템';  
COMMENT ON SCHEMA timbel_analytics IS '성과 분석 및 ROI 추적 시스템';

-- 개발 환경 초기 사용자 생성 (실제 운영 시 제거 필요)
-- 관리자 계정: admin@timbel.com / admin123
-- 개발자 계정: dev@timbel.com / dev123

GRANT ALL PRIVILEGES ON SCHEMA timbel_catalog TO timbel_user;
GRANT ALL PRIVILEGES ON SCHEMA timbel_auth TO timbel_user;
GRANT ALL PRIVILEGES ON SCHEMA timbel_analytics TO timbel_user;
