# 프로젝트 워크플로우 데이터 구조 명세서

## 1. 전체 워크플로우 구조

### 1.1 정방향 워크플로우 (Forward Workflow)

```
프로젝트 생성 → PO 승인 → PE 할당 → QA 검증요청 → QA 승인 → PO 개발 완료 승인 및 지식 자원 등록 결정 → 배포 요청 → 운영팀 배포 승인 → 운영팀 배포 수행 → 시스템 운영
```

#### 단계별 상세 정보

| 단계 | 담당자 | 액션 | 관련 테이블 | 상태 변경 | 추가 데이터 |
|------|--------|------|-------------|-----------|-------------|
| 1 | PO/Admin | 프로젝트 생성 | `projects` | `draft` → `pending_approval` | 기본 프로젝트 정보, 메타데이터 |
| 2 | PO | PO 승인 | `project_approvals` | `pending_approval` → `po_approved` | 승인 의견, 작업 계획 |
| 3 | PO | PE 할당 | `project_work_assignments` | `po_approved` → `pe_assigned` | PE 배정, 작업 그룹 생성 |
| 4 | PE | QA 검증요청 | `qc_qa_requests` | `pe_assigned` → `qa_requested` | 완료 보고서, 검증 요청 |
| 5 | QA | QA 승인 | `qc_qa_requests` | `qa_requested` → `qa_approved` | QA 피드백, 품질 점수 |
| 6 | PO | 개발 완료 승인 | `project_completion_approvals` | `qa_approved` → `po_final_approved` | 최종 승인, 지식자원 등록 결정 |
| 7 | PO | 배포 요청 | `system_registrations` | `po_final_approved` → `deployment_requested` | 배포 요구사항, 환경 설정 |
| 8 | Operations | 배포 승인 | `deployment_approvals` | `deployment_requested` → `deployment_approved` | 인프라 검토, 배포 계획 |
| 9 | Operations | 배포 수행 | `deployments` | `deployment_approved` → `deployed` | 배포 로그, 모니터링 설정 |
| 10 | Operations | 시스템 운영 | `systems` | `deployed` → `operational` | 운영 메트릭, 성능 데이터 |

### 1.2 역방향 제어 워크플로우 (Reverse Control Workflow)

#### 중지/취소 권한 매트릭스

| 현재 단계 | 최고운영자 | PO | PE | QA | Operations |
|-----------|------------|----|----|----|-----------| 
| 프로젝트 생성 | ✅ 삭제 | ✅ 수정/삭제 | ❌ | ❌ | ❌ |
| PO 승인 대기 | ✅ 강제 승인/거부 | ✅ 승인/거부 | ❌ | ❌ | ❌ |
| PE 할당 | ✅ 강제 중지 | ✅ PE 재할당/중지 | ⚠️ 작업 포기 요청 | ❌ | ❌ |
| QA 검증 중 | ✅ 강제 중지 | ✅ QA 재요청/중지 | ⚠️ 수정 후 재제출 | ✅ 반려 | ❌ |
| QA 승인 후 | ✅ 강제 중지 | ✅ 최종 승인/보류 | ❌ | ⚠️ 승인 철회 | ❌ |
| 배포 요청 후 | ✅ 강제 중지 | ⚠️ 요청 철회 | ❌ | ❌ | ✅ 배포 승인/거부 |
| 배포 승인 후 | ✅ 긴급 중지 | ❌ | ❌ | ❌ | ✅ 배포 중지/연기 |
| 배포 수행 중 | ✅ 긴급 중지 | ❌ | ❌ | ❌ | ✅ 롤백/중지 |
| 시스템 운영 | ✅ 서비스 중지 | ⚠️ 서비스 요청 | ❌ | ❌ | ✅ 유지보수 모드 |

**범례:**
- ✅ 전체 권한
- ⚠️ 제한적 권한 (승인 필요)
- ❌ 권한 없음

## 2. 데이터베이스 테이블 구조

### 2.1 핵심 워크플로우 테이블

#### `projects` - 프로젝트 기본 정보
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    domain_id UUID REFERENCES domains(id),
    project_overview TEXT,
    target_system_name VARCHAR,
    urgency_level VARCHAR DEFAULT 'medium',
    deadline DATE,
    project_status VARCHAR DEFAULT 'draft', -- draft, pending_approval, po_approved, pe_assigned, qa_requested, qa_approved, po_final_approved, deployment_requested, deployment_approved, deployed, operational, cancelled, suspended
    approval_status VARCHAR DEFAULT 'pending',
    is_urgent_development BOOLEAN DEFAULT FALSE,
    urgent_reason TEXT,
    expected_completion_hours INTEGER,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `project_status_history` - 상태 변경 이력 (새로 추가 필요)
```sql
CREATE TABLE project_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    from_status VARCHAR,
    to_status VARCHAR,
    changed_by UUID REFERENCES timbel_users(id),
    change_reason TEXT,
    change_type VARCHAR, -- normal, forced, emergency, rollback
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `project_control_actions` - 프로젝트 제어 액션 (새로 추가 필요)
```sql
CREATE TABLE project_control_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    action_type VARCHAR NOT NULL, -- suspend, cancel, force_approve, force_reject, emergency_stop, rollback
    initiated_by UUID REFERENCES timbel_users(id),
    target_stage VARCHAR, -- 어느 단계에서 액션을 취했는지
    reason TEXT NOT NULL,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES timbel_users(id),
    approved_at TIMESTAMP,
    executed_at TIMESTAMP,
    status VARCHAR DEFAULT 'pending', -- pending, approved, rejected, executed, failed
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 단계별 상세 테이블

#### `project_approvals` - PO 승인
```sql
CREATE TABLE project_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    approver_id UUID REFERENCES timbel_users(id),
    approval_action VARCHAR, -- approved, rejected, conditional
    approval_comment TEXT,
    conditions TEXT, -- 조건부 승인인 경우
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `project_work_assignments` - PE 할당
```sql
CREATE TABLE project_work_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    work_group_id UUID REFERENCES work_groups(id),
    assigned_pe_id UUID REFERENCES timbel_users(id),
    assignment_date TIMESTAMP DEFAULT NOW(),
    estimated_hours INTEGER,
    assignment_notes TEXT,
    status VARCHAR DEFAULT 'assigned', -- assigned, in_progress, completed, abandoned
    completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `project_completion_approvals` - PO 최종 승인 (새로 추가 필요)
```sql
CREATE TABLE project_completion_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    approver_id UUID REFERENCES timbel_users(id),
    knowledge_resource_decision VARCHAR, -- register, skip, later
    knowledge_resource_category VARCHAR,
    final_approval_comment TEXT,
    business_value_assessment TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `deployment_approvals` - 운영팀 배포 승인 (새로 추가 필요)
```sql
CREATE TABLE deployment_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_registration_id UUID REFERENCES system_registrations(id),
    approver_id UUID REFERENCES timbel_users(id),
    infrastructure_review TEXT,
    resource_allocation_plan TEXT,
    deployment_schedule TIMESTAMP,
    risk_assessment TEXT,
    rollback_plan TEXT,
    approval_status VARCHAR DEFAULT 'pending', -- pending, approved, rejected, conditional
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `deployments` - 실제 배포 수행 (새로 추가 필요)
```sql
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_approval_id UUID REFERENCES deployment_approvals(id),
    deployed_by UUID REFERENCES timbel_users(id),
    deployment_environment VARCHAR,
    deployment_method VARCHAR, -- manual, automated, blue_green, rolling
    deployment_logs TEXT,
    infrastructure_config JSONB,
    monitoring_setup JSONB,
    deployment_status VARCHAR DEFAULT 'in_progress', -- in_progress, completed, failed, rolled_back
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 3. 권한 제어 시스템

### 3.1 역할 기반 권한 (RBAC)

#### 역할 정의
- **최고운영자 (Executive)**: 모든 단계에서 강제 제어 가능
- **PO (Product Owner)**: 자신이 담당하는 프로젝트의 승인/중지 권한
- **PE (Project Engineer)**: 할당된 작업의 포기/재요청 권한
- **QA**: 품질 검증 승인/반려 권한
- **Operations**: 배포 관련 모든 권한

### 3.2 제어 액션 유형

#### 일반 제어 액션
- **suspend**: 일시 중지 (재개 가능)
- **cancel**: 완전 취소 (복구 불가)
- **reassign**: 담당자 재할당
- **rollback**: 이전 단계로 되돌리기

#### 강제 제어 액션 (최고운영자 전용)
- **force_approve**: 강제 승인
- **force_reject**: 강제 거부
- **emergency_stop**: 긴급 중지
- **override**: 권한 무시하고 상태 변경

### 3.3 승인 체계

#### 단계별 승인 필요 액션
1. **PE 작업 포기**: PO 승인 필요
2. **QA 승인 철회**: PO 승인 필요
3. **배포 요청 철회**: Operations 승인 필요
4. **긴급 배포 중지**: 최고운영자 승인 필요

## 4. 데이터 누적 패턴

### 4.1 정방향 데이터 흐름

```
projects (기본 정보)
    ↓
project_approvals (PO 승인)
    ↓
work_groups + project_work_assignments (PE 할당)
    ↓
project_completion_reports (PE 완료)
    ↓
qc_qa_requests (QA 검증)
    ↓
project_completion_approvals (PO 최종 승인)
    ↓
system_registrations (배포 요청)
    ↓
deployment_approvals (운영팀 승인)
    ↓
deployments (배포 수행)
    ↓
systems (시스템 운영)
```

### 4.2 제어 데이터 흐름

```
project_control_actions (제어 요청)
    ↓
project_status_history (상태 변경 이력)
    ↓
projects.project_status (상태 업데이트)
```

## 5. 구현 우선순위

### Phase 1: 기본 워크플로우
- [ ] 누락된 테이블 생성 (`project_status_history`, `project_control_actions`, `project_completion_approvals`, `deployment_approvals`, `deployments`)
- [ ] 기존 테이블 스키마 보완
- [ ] 기본 워크플로우 API 구현

### Phase 2: 권한 제어 시스템
- [ ] 역할 기반 권한 체크 미들웨어
- [ ] 제어 액션 API 구현
- [ ] 승인 워크플로우 구현

### Phase 3: 고급 기능
- [ ] 자동 알림 시스템
- [ ] 워크플로우 시각화
- [ ] 성능 메트릭 수집

## 6. 테스트 시나리오

### 6.1 정상 워크플로우 테스트
1. 프로젝트 생성 → PO 승인 → PE 할당 → QA 검증 → 배포 → 운영

### 6.2 제어 워크플로우 테스트
1. PE 할당 후 PO가 프로젝트 중지
2. QA 검증 중 QA가 반려
3. 배포 중 운영팀이 긴급 중지
4. 최고운영자가 강제 승인

### 6.3 권한 테스트
1. 권한 없는 사용자의 제어 시도 차단
2. 승인 필요 액션의 승인 프로세스
3. 강제 제어 액션의 로깅 및 추적

---

**작성일**: 2025-09-29  
**버전**: 1.0  
**작성자**: AI Assistant  
**검토 필요**: 데이터베이스 스키마 검증, API 설계 검토
