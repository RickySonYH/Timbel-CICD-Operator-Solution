# 🤝 Timbel CICD Operator - 컨트리뷰션 가이드

## 📋 목차
- [기여 방법](#기여-방법)
- [개발 환경 설정](#개발-환경-설정)
- [코드 스타일 가이드](#코드-스타일-가이드)
- [커밋 메시지 규칙](#커밋-메시지-규칙)
- [Pull Request 가이드](#pull-request-가이드)
- [이슈 리포팅](#이슈-리포팅)
- [코드 리뷰 프로세스](#코드-리뷰-프로세스)
- [릴리즈 프로세스](#릴리즈-프로세스)

---

## 🌟 기여 방법

### 기여할 수 있는 방법들

#### 1. 코드 기여
- 🐛 **버그 수정**: 발견된 버그를 수정하여 시스템 안정성 향상
- ✨ **새 기능 개발**: 사용자 요청이나 로드맵에 따른 새로운 기능 구현
- ⚡ **성능 개선**: 시스템 성능 최적화 및 리팩토링
- 🔒 **보안 강화**: 보안 취약점 수정 및 보안 기능 개선

#### 2. 문서 기여
- 📚 **문서 개선**: 사용자 매뉴얼, API 문서, 개발자 가이드 개선
- 🌐 **번역**: 다국어 지원을 위한 문서 번역
- 📝 **튜토리얼**: 사용법이나 개발 가이드 튜토리얼 작성

#### 3. 테스트 기여
- 🧪 **테스트 케이스 추가**: 단위 테스트, 통합 테스트 케이스 작성
- 🔍 **QA 테스팅**: 수동 테스트를 통한 버그 발견 및 리포팅
- 📊 **성능 테스트**: 부하 테스트 및 성능 벤치마킹

#### 4. 커뮤니티 기여
- 💬 **이슈 답변**: 다른 사용자의 질문에 답변
- 📢 **홍보**: 블로그 포스트, 발표, 소셜 미디어를 통한 프로젝트 홍보
- 🎯 **피드백**: 사용 경험 공유 및 개선 제안

---

## 🛠️ 개발 환경 설정

### 사전 요구사항
- **Node.js**: 18.0.0 이상
- **npm**: 9.0.0 이상
- **Docker**: 24.0.0 이상
- **Docker Compose**: 2.20.0 이상
- **Git**: 2.30.0 이상

### 프로젝트 설정

#### 1. 저장소 포크 및 클론
```bash
# GitHub에서 저장소 포크 후
git clone https://github.com/YOUR_USERNAME/timbel-cicd-operator.git
cd timbel-cicd-operator

# 원본 저장소를 upstream으로 추가
git remote add upstream https://github.com/timbel/timbel-cicd-operator.git
```

#### 2. 개발 환경 시작
```bash
# 환경 변수 설정
cp .env.template .env.development

# Docker 개발 환경 시작
docker-compose -f docker-compose.dev.yml up -d

# 의존성 설치
cd backend && npm install
cd ../frontend && npm install
```

#### 3. 개발 서버 실행
```bash
# 백엔드 개발 서버 (nodemon 사용)
cd backend && npm run dev

# 프론트엔드 개발 서버 (별도 터미널)
cd frontend && npm start
```

#### 4. 테스트 실행
```bash
# 백엔드 테스트
cd backend && npm test

# 프론트엔드 테스트
cd frontend && npm test

# 전체 테스트
npm run test:all
```

---

## 📝 코드 스타일 가이드

### JavaScript/TypeScript 스타일

#### 1. 네이밍 규칙
```javascript
// ✅ 좋은 예시
const userAccountData = getUserAccount();
const isUserAuthenticated = checkAuthStatus();
const calculateTotalPrice = (items) => { ... };

// 상수는 UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.timbel.net';

// 클래스는 PascalCase
class UserService {
  constructor() { ... }
}

// 파일명은 kebab-case
// user-service.js, project-card.tsx
```

#### 2. 함수 작성 규칙
```javascript
// ✅ 단일 책임 원칙
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ 순수 함수 선호
const calculateTax = (amount, rate) => {
  return amount * rate;
};

// ✅ 명확한 반환값
const fetchUserData = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

#### 3. 에러 처리
```javascript
// ✅ 적절한 에러 처리
const createProject = async (projectData) => {
  try {
    validateProjectData(projectData);
    const project = await saveProject(projectData);
    
    logger.info('프로젝트 생성 성공', { projectId: project.id });
    return { success: true, data: project };
    
  } catch (error) {
    logger.error('프로젝트 생성 실패', { error: error.message });
    
    if (error instanceof ValidationError) {
      return { success: false, error: 'VALIDATION_ERROR', message: error.message };
    }
    
    return { success: false, error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' };
  }
};
```

### React 컴포넌트 스타일

#### 1. 컴포넌트 구조
```typescript
// ✅ 표준 컴포넌트 구조
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import { Project } from '../types';

// Props 인터페이스 정의
interface ProjectCardProps {
  project: Project;
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  className?: string;
}

// 컴포넌트 구현
const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onEdit, 
  onDelete,
  className 
}) => {
  // 상태 선언
  const [loading, setLoading] = useState(false);

  // 이벤트 핸들러
  const handleEdit = useCallback(() => {
    onEdit(project.id);
  }, [project.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (confirm('정말 삭제하시겠습니까?')) {
      onDelete(project.id);
    }
  }, [project.id, onDelete]);

  // 렌더링
  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h6">{project.name}</Typography>
        <Typography variant="body2">{project.description}</Typography>
      </CardContent>
      <CardActions>
        <Button onClick={handleEdit}>편집</Button>
        <Button onClick={handleDelete} color="error">삭제</Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
```

#### 2. 훅 사용 규칙
```typescript
// ✅ 커스텀 훅 작성
const useProjectData = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/projects/${projectId}`);
        setProject(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  return { project, loading, error };
};
```

### CSS/Styling 가이드

#### 1. Material-UI 스타일링
```typescript
// ✅ sx prop 사용
<Box 
  sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 2,
    p: 2 
  }}
>
  <Typography variant="h5">제목</Typography>
</Box>

// ✅ 테마 사용
const theme = useTheme();
<Button 
  sx={{ 
    backgroundColor: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    }
  }}
>
  버튼
</Button>
```

---

## 📝 커밋 메시지 규칙

### 커밋 메시지 형식
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 타입 (Type)
- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서 변경
- **style**: 코드 스타일 변경 (기능에 영향 없음)
- **refactor**: 코드 리팩토링
- **test**: 테스트 코드 추가/수정
- **chore**: 빌드 프로세스 또는 도구 변경

### 스코프 (Scope)
- **auth**: 인증 관련
- **api**: API 관련
- **ui**: UI 컴포넌트
- **db**: 데이터베이스
- **ci**: CI/CD 관련
- **docs**: 문서

### 예시
```bash
# ✅ 좋은 커밋 메시지
feat(auth): JWT 토큰 갱신 기능 추가

사용자의 액세스 토큰이 만료되기 전에 자동으로 갱신하는 기능을 구현했습니다.
- 토큰 만료 5분 전 자동 갱신
- 갱신 실패 시 로그아웃 처리
- 갱신 중 API 호출 대기 처리

Closes #123

fix(ui): 프로젝트 카드 레이아웃 깨짐 수정

모바일 화면에서 프로젝트 카드가 올바르게 표시되지 않는 문제를 수정했습니다.

docs: API 문서 업데이트

새로 추가된 인증 엔드포인트에 대한 Swagger 문서를 추가했습니다.
```

---

## 🔀 Pull Request 가이드

### PR 작성 전 체크리스트

#### 코드 품질 확인
```bash
# 린팅 검사
npm run lint

# 테스트 실행
npm test

# 빌드 테스트
npm run build

# 타입 검사 (TypeScript)
npm run type-check
```

### PR 템플릿
```markdown
## 📋 변경 사항 요약
<!-- 무엇을 변경했는지 간단히 설명 -->

## 🎯 변경 이유
<!-- 왜 이 변경이 필요한지 설명 -->

## 🔧 구현 내용
<!-- 어떻게 구현했는지 상세히 설명 -->
- [ ] 기능 A 구현
- [ ] 기능 B 수정
- [ ] 테스트 케이스 추가

## 🧪 테스트 방법
<!-- 어떻게 테스트할 수 있는지 설명 -->
1. 로그인 페이지 접속
2. 유효한 계정으로 로그인
3. 대시보드에서 새 기능 확인

## 📸 스크린샷 (UI 변경 시)
<!-- Before/After 스크린샷 첨부 -->

## ✅ 체크리스트
- [ ] 코드 리뷰 완료
- [ ] 테스트 작성 및 통과
- [ ] 문서 업데이트
- [ ] 브레이킹 체인지 확인
- [ ] 성능 영향 검토

## 🔗 관련 이슈
Closes #123
Related to #456

## 📝 추가 정보
<!-- 리뷰어가 알아야 할 추가 정보 -->
```

### PR 크기 가이드라인
- **Small PR** (< 100 lines): 즉시 리뷰 가능
- **Medium PR** (100-500 lines): 1-2일 내 리뷰
- **Large PR** (> 500 lines): 여러 개의 작은 PR로 분할 권장

---

## 🐛 이슈 리포팅

### 버그 리포트 템플릿
```markdown
## 🐛 버그 설명
<!-- 발생한 버그에 대한 명확하고 간결한 설명 -->

## 🔄 재현 단계
1. '...' 페이지로 이동
2. '...' 버튼 클릭
3. '...' 입력
4. 에러 발생

## 💭 예상 결과
<!-- 어떤 결과를 예상했는지 설명 -->

## 📸 실제 결과
<!-- 실제로 어떤 일이 일어났는지 설명 -->
<!-- 가능하면 스크린샷 첨부 -->

## 🖥️ 환경 정보
- OS: [예: macOS 13.0]
- 브라우저: [예: Chrome 91.0]
- 버전: [예: v1.2.3]

## 📋 추가 정보
<!-- 추가적인 컨텍스트나 정보 -->
```

### 기능 요청 템플릿
```markdown
## ✨ 기능 요청
<!-- 원하는 기능에 대한 명확하고 간결한 설명 -->

## 🎯 문제 상황
<!-- 이 기능이 해결할 문제나 개선할 점 -->

## 💡 제안하는 해결책
<!-- 어떤 방식으로 구현되기를 원하는지 설명 -->

## 🔄 대안
<!-- 고려해본 다른 대안들 -->

## 📋 추가 정보
<!-- 추가적인 컨텍스트나 스크린샷 -->
```

---

## 👀 코드 리뷰 프로세스

### 리뷰어 가이드라인

#### 1. 리뷰 우선순위
1. **기능성**: 코드가 의도한 대로 동작하는가?
2. **보안성**: 보안 취약점이 없는가?
3. **성능**: 성능에 부정적인 영향이 없는가?
4. **가독성**: 코드가 이해하기 쉬운가?
5. **일관성**: 프로젝트의 코딩 스타일과 일치하는가?

#### 2. 리뷰 댓글 작성법
```markdown
<!-- ✅ 좋은 리뷰 댓글 -->
**제안**: 이 함수는 너무 많은 책임을 가지고 있는 것 같습니다. 
`validateUser`와 `saveUser` 로직을 분리하는 것이 어떨까요?

**질문**: 이 조건문에서 `null` 체크가 필요한 이유가 있나요?

**칭찬**: 에러 처리가 매우 잘 되어 있네요! 👍

**중요**: 이 코드는 SQL 인젝션 취약점이 있습니다. 
매개변수화된 쿼리를 사용해주세요.
```

#### 3. 리뷰 승인 기준
- ✅ **Approve**: 코드가 완벽하거나 minor한 개선사항만 있음
- 🔄 **Request Changes**: 반드시 수정이 필요한 문제가 있음
- 💬 **Comment**: 의견 제시나 질문만 있음

### 작성자 가이드라인

#### 1. PR 작성 시 주의사항
- 변경사항을 명확하게 설명
- 테스트 방법 제공
- 관련 이슈 링크
- 스크린샷 첨부 (UI 변경 시)

#### 2. 리뷰 피드백 대응
- 모든 댓글에 응답
- 수정 사항은 새로운 커밋으로 추가
- 논의가 필요한 부분은 적극적으로 토론

---

## 🚀 릴리즈 프로세스

### 버전 관리 (Semantic Versioning)
```
MAJOR.MINOR.PATCH

MAJOR: 호환되지 않는 API 변경
MINOR: 하위 호환성을 유지하는 기능 추가
PATCH: 하위 호환성을 유지하는 버그 수정
```

### 릴리즈 단계

#### 1. 개발 단계
```bash
# 기능 브랜치에서 개발
git checkout -b feature/new-feature
# 개발 및 테스트
git commit -m "feat: 새로운 기능 추가"
git push origin feature/new-feature
# PR 생성 및 리뷰
```

#### 2. 스테이징 단계
```bash
# develop 브랜치에 머지
git checkout develop
git merge feature/new-feature
# 스테이징 환경에서 테스트
```

#### 3. 릴리즈 준비
```bash
# 릴리즈 브랜치 생성
git checkout -b release/v1.2.0
# 버전 업데이트
npm version minor
# 릴리즈 노트 작성
```

#### 4. 프로덕션 릴리즈
```bash
# main 브랜치에 머지
git checkout main
git merge release/v1.2.0
# 태그 생성
git tag v1.2.0
git push origin main --tags
```

### 릴리즈 노트 템플릿
```markdown
# Release v1.2.0

## 🎉 새로운 기능
- JWT 토큰 자동 갱신 기능 추가
- 프로젝트 대시보드 개선
- 다국어 지원 (한국어, 영어)

## 🐛 버그 수정
- 모바일 화면에서 레이아웃 깨짐 수정
- API 응답 시간 개선
- 메모리 누수 문제 해결

## ⚡ 성능 개선
- 데이터베이스 쿼리 최적화
- 프론트엔드 번들 크기 20% 감소
- API 응답 시간 30% 개선

## 🔧 기술적 변경사항
- Node.js 18로 업그레이드
- PostgreSQL 15로 업그레이드
- 새로운 CI/CD 파이프라인 적용

## 📋 Breaking Changes
- `/api/v1/auth` 엔드포인트가 `/api/auth`로 변경
- 사용자 권한 시스템 개편 (마이그레이션 필요)

## 🔗 링크
- [전체 변경사항](https://github.com/timbel/timbel-cicd-operator/compare/v1.1.0...v1.2.0)
- [마이그레이션 가이드](./docs/MIGRATION.md)
```

---

## 📞 커뮤니티 및 지원

### 소통 채널
- **GitHub Issues**: 버그 리포트, 기능 요청
- **GitHub Discussions**: 일반적인 질문, 아이디어 공유
- **Slack**: 실시간 개발 논의 (#timbel-dev)
- **이메일**: dev@timbel.net

### 기여자 인정
- **Contributors 파일**: 모든 기여자를 README에 표시
- **릴리즈 노트**: 주요 기여자 언급
- **기여자 뱃지**: GitHub 프로필에 표시될 수 있는 뱃지 제공

### 행동 강령
우리는 모든 참여자가 서로를 존중하고 포용적인 환경을 만들어가기를 기대합니다:

- 🤝 **존중**: 다양한 의견과 경험을 존중
- 💬 **건설적 소통**: 비판보다는 개선 제안
- 🎯 **목표 지향**: 프로젝트 목표에 부합하는 기여
- 📚 **학습 지향**: 실수를 통한 학습 문화
- 🌟 **품질 추구**: 높은 품질의 코드와 문서

---

## 🙏 감사 인사

Timbel CICD Operator 프로젝트에 관심을 가져주시고 기여해주시는 모든 분들께 진심으로 감사드립니다. 여러분의 기여가 이 프로젝트를 더욱 훌륭하게 만들어갑니다.

### 주요 기여자
- **Core Team**: [@dev-team](https://github.com/timbel/dev-team)
- **Contributors**: 모든 기여자 목록은 [여기](./CONTRIBUTORS.md)에서 확인할 수 있습니다.

---

**📅 문서 버전**: v1.0  
**📅 최종 수정일**: 2024-01-01  
**👤 작성자**: Timbel Development Team  
**📧 문의**: dev@timbel.net

> 💡 **참고**: 이 가이드는 프로젝트의 발전에 따라 지속적으로 업데이트됩니다. 최신 버전은 항상 GitHub 저장소에서 확인해주세요.
