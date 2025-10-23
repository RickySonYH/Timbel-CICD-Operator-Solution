# 👨‍💻 Timbel CICD Operator - 개발자 가이드

## 📋 목차
- [개발 환경 설정](#개발-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [코딩 표준](#코딩-표준)
- [API 개발 가이드](#api-개발-가이드)
- [프론트엔드 개발](#프론트엔드-개발)
- [데이터베이스 작업](#데이터베이스-작업)
- [테스트 작성](#테스트-작성)
- [디버깅 및 로깅](#디버깅-및-로깅)
- [성능 최적화](#성능-최적화)
- [보안 고려사항](#보안-고려사항)

---

## 🛠️ 개발 환경 설정

### 필수 도구 설치

#### 1. Node.js 및 npm
```bash
# Node.js 18+ 설치 (nvm 사용 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 버전 확인
node --version  # v18.x.x
npm --version   # 9.x.x
```

#### 2. Docker 및 Docker Compose
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 버전 확인
docker --version         # 24.0+
docker-compose --version # 2.20+
```

#### 3. 개발 도구
```bash
# Git 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# 추천 VS Code 확장
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension ms-python.python
code --install-extension ms-vscode.docker
```

### 프로젝트 클론 및 설정

#### 1. 저장소 클론
```bash
git clone https://github.com/timbel/timbel-cicd-operator.git
cd timbel-cicd-operator

# 개발 브랜치 생성
git checkout -b feature/your-feature-name
```

#### 2. 환경 변수 설정
```bash
# 환경 변수 파일 생성
cp .env.template .env.development

# 개발용 설정 편집
nano .env.development
```

#### 3. 의존성 설치
```bash
# 백엔드 의존성 설치
cd backend
npm install

# 프론트엔드 의존성 설치
cd ../frontend
npm install

# 루트로 돌아가기
cd ..
```

#### 4. 개발 환경 실행
```bash
# Docker Compose로 개발 환경 시작
docker-compose -f docker-compose.dev.yml up -d

# 로그 확인
docker-compose -f docker-compose.dev.yml logs -f
```

---

## 📁 프로젝트 구조

### 전체 구조
```
timbel-cicd-operator/
├── 📁 backend/                 # Node.js 백엔드
│   ├── 📁 src/
│   │   ├── 📁 config/          # 설정 파일
│   │   ├── 📁 controllers/     # 컨트롤러 (사용하지 않음, 라우터 직접 사용)
│   │   ├── 📁 middleware/      # 미들웨어
│   │   ├── 📁 models/          # 데이터 모델 (사용하지 않음, SQL 직접 사용)
│   │   ├── 📁 routes/          # API 라우트
│   │   ├── 📁 services/        # 비즈니스 로직
│   │   ├── 📁 utils/           # 유틸리티 함수
│   │   └── 📄 index.js         # 메인 서버 파일
│   ├── 📁 tests/               # 테스트 파일
│   ├── 📁 uploads/             # 업로드된 파일
│   ├── 📄 package.json
│   └── 📄 Dockerfile.dev
│
├── 📁 frontend/                # React 프론트엔드
│   ├── 📁 public/              # 정적 파일
│   ├── 📁 src/
│   │   ├── 📁 components/      # 재사용 컴포넌트
│   │   ├── 📁 pages/           # 페이지 컴포넌트
│   │   ├── 📁 hooks/           # 커스텀 훅
│   │   ├── 📁 utils/           # 유틸리티 함수
│   │   ├── 📁 styles/          # 스타일 파일
│   │   └── 📄 App.tsx          # 메인 앱 컴포넌트
│   ├── 📄 package.json
│   └── 📄 Dockerfile.dev
│
├── 📁 database/                # 데이터베이스 관련
│   ├── 📁 migrations/          # 마이그레이션 파일
│   ├── 📁 seeds/               # 초기 데이터
│   └── 📁 scripts/             # DB 스크립트
│
├── 📁 docs/                    # 문서
├── 📁 nginx/                   # Nginx 설정
├── 📁 monitoring/              # 모니터링 설정
├── 📄 docker-compose.yml       # 개발용 Docker Compose
├── 📄 docker-compose.prod.yml  # 프로덕션용 Docker Compose
└── 📄 README.md
```

### 백엔드 구조 상세
```javascript
backend/src/
├── config/
│   ├── database.js          // 데이터베이스 연결 설정
│   ├── swagger.js           // API 문서 설정
│   └── constants.js         // 상수 정의
│
├── middleware/
│   ├── jwtAuth.js           // JWT 인증
│   ├── advancedPermissions.js // 고급 권한 관리
│   ├── securityEnhancement.js // 보안 강화
│   ├── performanceMiddleware.js // 성능 최적화
│   └── systemLogger.js      // 로깅 시스템
│
├── routes/
│   ├── authJWT.js           // 인증 관련 API
│   ├── knowledge/           // 지식자원 관리 API
│   ├── operations/          // 운영센터 API
│   ├── admin/              // 관리자 API
│   └── monitoring.js        // 모니터링 API
│
├── services/
│   ├── jenkinsService.js    // Jenkins 통합
│   ├── argoCDIntegration.js // ArgoCD 통합
│   ├── nexusIntegration.js  // Nexus 통합
│   └── monitoringService.js // 모니터링 서비스
│
└── utils/
    ├── CircuitBreaker.js    // 서킷 브레이커
    ├── DeadLetterQueue.js   // 데드 레터 큐
    └── validators.js        // 입력 검증
```

### 프론트엔드 구조 상세
```typescript
frontend/src/
├── components/
│   ├── layout/             // 레이아웃 컴포넌트
│   ├── common/             // 공통 컴포넌트
│   ├── knowledge/          // 지식자원 관련 컴포넌트
│   ├── operations/         // 운영센터 관련 컴포넌트
│   └── admin/              // 관리자 관련 컴포넌트
│
├── pages/
│   ├── HomePage.tsx        // 홈 페이지
│   ├── knowledge/          // 지식자원 페이지들
│   ├── operations/         // 운영센터 페이지들
│   └── admin/              // 관리자 페이지들
│
├── hooks/
│   ├── useAuth.ts          // 인증 훅
│   ├── usePermissions.ts   // 권한 관리 훅
│   └── useAPI.ts           // API 호출 훅
│
├── utils/
│   ├── api.ts              // API 클라이언트
│   ├── auth.ts             // 인증 유틸리티
│   └── constants.ts        // 상수 정의
│
└── styles/
    ├── globals.css         // 전역 스타일
    └── components.css      // 컴포넌트 스타일
```

---

## 📝 코딩 표준

### JavaScript/TypeScript 스타일

#### 1. 변수 및 함수 명명
```javascript
// ✅ 좋은 예
const userAccountData = fetchUserAccount();
const isUserLoggedIn = checkAuthStatus();
const calculateTotalPrice = (items) => { ... };

// ❌ 나쁜 예
const data = fetch();
const flag = check();
const calc = (x) => { ... };
```

#### 2. 함수 작성 원칙
```javascript
// ✅ 단일 책임 원칙
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sendNotification = async (userId, message) => {
  const user = await getUserById(userId);
  return await emailService.send(user.email, message);
};

// ❌ 너무 많은 책임
const processUser = (userData) => {
  // 검증, 저장, 알림 등 여러 책임
};
```

#### 3. 에러 처리
```javascript
// ✅ 적절한 에러 처리
const createProject = async (projectData) => {
  try {
    const validatedData = validateProjectData(projectData);
    const project = await saveProject(validatedData);
    
    console.log('✅ 프로젝트 생성 성공:', project.id);
    return { success: true, data: project };
    
  } catch (error) {
    console.error('❌ 프로젝트 생성 실패:', error.message);
    
    if (error.code === 'VALIDATION_ERROR') {
      return { success: false, error: 'INVALID_INPUT', message: error.message };
    }
    
    return { success: false, error: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' };
  }
};
```

#### 4. 비동기 처리
```javascript
// ✅ async/await 사용
const loadDashboardData = async () => {
  try {
    const [projects, deployments, metrics] = await Promise.all([
      fetchProjects(),
      fetchDeployments(),
      fetchMetrics()
    ]);
    
    return { projects, deployments, metrics };
  } catch (error) {
    console.error('대시보드 데이터 로딩 실패:', error);
    throw error;
  }
};

// ❌ 콜백 지옥
fetchProjects((projects) => {
  fetchDeployments((deployments) => {
    fetchMetrics((metrics) => {
      // 중첩된 콜백
    });
  });
});
```

### React/TypeScript 스타일

#### 1. 컴포넌트 작성
```typescript
// ✅ 함수형 컴포넌트 + TypeScript
interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'completed' | 'suspended';
  };
  onEdit: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onEdit, 
  onDelete 
}) => {
  const handleEdit = useCallback(() => {
    onEdit(project.id);
  }, [project.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(project.id);
  }, [project.id, onDelete]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{project.name}</Typography>
        <Typography variant="body2">{project.description}</Typography>
        <Chip 
          label={project.status} 
          color={project.status === 'active' ? 'primary' : 'default'} 
        />
      </CardContent>
      <CardActions>
        <IconButton onClick={handleEdit} aria-label="프로젝트 편집">
          <EditIcon />
        </IconButton>
        <IconButton onClick={handleDelete} aria-label="프로젝트 삭제">
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
```

#### 2. 커스텀 훅 작성
```typescript
// ✅ 재사용 가능한 커스텀 훅
interface UseAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const useAPI = <T>(url: string, dependencies: any[] = []): UseAPIResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(url);
      setData(response.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
};
```

### SQL 작성 표준

#### 1. 쿼리 작성 원칙
```sql
-- ✅ 가독성 좋은 쿼리
SELECT 
    p.id,
    p.name,
    p.description,
    p.status,
    p.created_at,
    u.username as created_by_username,
    sd.name as domain_name
FROM projects p
LEFT JOIN timbel_users u ON p.created_by = u.id
LEFT JOIN system_domains sd ON p.domain_id = sd.id
WHERE p.status = $1
    AND p.created_at >= $2
ORDER BY p.created_at DESC
LIMIT $3 OFFSET $4;

-- ❌ 가독성 나쁜 쿼리
select p.id,p.name,p.description,p.status,p.created_at,u.username,sd.name from projects p left join timbel_users u on p.created_by=u.id left join system_domains sd on p.domain_id=sd.id where p.status=$1 and p.created_at>=$2 order by p.created_at desc limit $3 offset $4;
```

#### 2. 인덱스 활용
```sql
-- ✅ 인덱스를 활용한 쿼리
-- WHERE 절의 컬럼들에 대한 복합 인덱스 생성
CREATE INDEX idx_projects_status_created_at ON projects(status, created_at);

-- 쿼리에서 인덱스 활용
SELECT * FROM projects 
WHERE status = 'active' 
    AND created_at >= '2024-01-01'
ORDER BY created_at DESC;
```

---

## 🔌 API 개발 가이드

### RESTful API 설계

#### 1. URL 설계 원칙
```javascript
// ✅ RESTful URL 패턴
GET    /api/projects                    // 프로젝트 목록 조회
GET    /api/projects/:id                // 특정 프로젝트 조회
POST   /api/projects                    // 새 프로젝트 생성
PUT    /api/projects/:id                // 프로젝트 전체 수정
PATCH  /api/projects/:id                // 프로젝트 부분 수정
DELETE /api/projects/:id                // 프로젝트 삭제

// 특수 작업 (RPC 스타일)
POST   /api/projects/:id/deploy         // 프로젝트 배포
POST   /api/projects/:id/rollback       // 프로젝트 롤백

// ❌ 나쁜 URL 패턴
GET    /api/getProjects
POST   /api/createProject
POST   /api/updateProject
POST   /api/deleteProject
```

#### 2. 응답 형식 표준화
```javascript
// ✅ 표준화된 응답 형식
const sendSuccessResponse = (res, data, message = '성공') => {
  res.json({
    success: true,
    data: data,
    message: message,
    timestamp: new Date().toISOString()
  });
};

const sendErrorResponse = (res, statusCode, error, message, details = null) => {
  res.status(statusCode).json({
    success: false,
    error: error,
    message: message,
    details: details,
    timestamp: new Date().toISOString()
  });
};

// 사용 예시
router.get('/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    sendSuccessResponse(res, projects, '프로젝트 목록 조회 성공');
  } catch (error) {
    sendErrorResponse(res, 500, 'SERVER_ERROR', '프로젝트 조회 중 오류 발생');
  }
});
```

#### 3. 입력 검증
```javascript
// ✅ 입력 검증 미들웨어
const validateProjectData = (req, res, next) => {
  const { name, description, domainId } = req.body;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: '프로젝트명은 필수입니다.' });
  }

  if (name && name.length > 100) {
    errors.push({ field: 'name', message: '프로젝트명은 100자를 초과할 수 없습니다.' });
  }

  if (!domainId) {
    errors.push({ field: 'domainId', message: '시스템 도메인을 선택해야 합니다.' });
  }

  if (errors.length > 0) {
    return sendErrorResponse(res, 400, 'VALIDATION_ERROR', '입력 데이터가 올바르지 않습니다.', errors);
  }

  next();
};

// 라우터에서 사용
router.post('/projects', validateProjectData, async (req, res) => {
  // 검증된 데이터로 프로젝트 생성
});
```

#### 4. 페이지네이션
```javascript
// ✅ 표준 페이지네이션
const getPaginatedResults = async (query, params, limit = 20, offset = 0) => {
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
  
  const [dataResult, countResult] = await Promise.all([
    pool.query(`${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, 
               [...params, limit, offset]),
    pool.query(countQuery, params)
  ]);

  const total = parseInt(countResult.rows[0].count);
  const hasMore = offset + limit < total;

  return {
    data: dataResult.rows,
    pagination: {
      total,
      limit,
      offset,
      hasMore,
      totalPages: Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1
    }
  };
};
```

### Swagger 문서 작성

#### 1. API 문서화
```javascript
/**
 * @swagger
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: 프로젝트 목록 조회
 *     description: 등록된 프로젝트 목록을 페이지네이션과 함께 조회합니다.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지 크기
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: 오프셋
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 검색어 (프로젝트명 또는 설명)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, suspended]
 *         description: 프로젝트 상태 필터
 *     responses:
 *       200:
 *         description: 프로젝트 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *                   example: "프로젝트 목록 조회 성공"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security:
 *       - bearerAuth: []
 */
router.get('/projects', jwtAuth.verifyToken, async (req, res) => {
  // 구현 코드
});
```

---

## 🎨 프론트엔드 개발

### React 컴포넌트 개발

#### 1. 컴포넌트 분리 원칙
```typescript
// ✅ 작은 단위의 재사용 가능한 컴포넌트
// components/common/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'primary', 
  message 
}) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <CircularProgress 
        size={size === 'small' ? 20 : size === 'large' ? 60 : 40}
        color={color}
      />
      {message && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;
```

#### 2. 상태 관리
```typescript
// ✅ 적절한 상태 관리
const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1
  });

  // API 호출을 위한 커스텀 훅 사용
  const { data, loading: apiLoading, error: apiError, refetch } = useAPI<Project[]>(
    `/api/projects?search=${filters.search}&status=${filters.status}&page=${filters.page}`
  );

  useEffect(() => {
    if (data) {
      setProjects(data);
    }
    setLoading(apiLoading);
    setError(apiError);
  }, [data, apiLoading, apiError]);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  if (loading) return <LoadingSpinner message="프로젝트 로딩 중..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <Box>
      <ProjectFilters filters={filters} onChange={handleFilterChange} />
      <Grid container spacing={2}>
        {projects.map(project => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <ProjectCard project={project} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
```

#### 3. 성능 최적화
```typescript
// ✅ React.memo와 useCallback 활용
const ProjectCard = React.memo<ProjectCardProps>(({ 
  project, 
  onEdit, 
  onDelete 
}) => {
  const handleEdit = useCallback(() => {
    onEdit(project.id);
  }, [project.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      onDelete(project.id);
    }
  }, [project.id, onDelete]);

  return (
    <Card>
      {/* 카드 내용 */}
    </Card>
  );
});

// ✅ 가상화를 통한 대용량 리스트 최적화
import { FixedSizeList as List } from 'react-window';

const VirtualizedProjectList: React.FC<{ projects: Project[] }> = ({ projects }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ProjectCard project={projects[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={projects.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Material-UI 사용법

#### 1. 테마 커스터마이징
```typescript
// theme/index.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default theme;
```

#### 2. 반응형 디자인
```typescript
// ✅ Material-UI 반응형 시스템 활용
const ResponsiveLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Grid container spacing={isMobile ? 1 : 2}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: { xs: 1, md: 2 } }}>
          <Typography variant={isMobile ? 'h6' : 'h4'}>
            메인 콘텐츠
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: { xs: 1, md: 2 } }}>
          <Typography variant="h6">사이드바</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};
```

---

## 🗄️ 데이터베이스 작업

### 마이그레이션 작성

#### 1. 마이그레이션 파일 구조
```sql
-- database/migrations/001-create-projects-table.sql
-- [advice from AI] 프로젝트 테이블 생성 마이그레이션

BEGIN;

-- 프로젝트 테이블 생성
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'suspended')),
    domain_id UUID REFERENCES system_domains(id),
    created_by UUID REFERENCES timbel_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_domain_id ON projects(domain_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 초기 데이터 삽입
INSERT INTO projects (name, description, status) VALUES
('Sample Project', 'This is a sample project', 'active')
ON CONFLICT DO NOTHING;

COMMIT;
```

#### 2. 마이그레이션 실행 스크립트
```javascript
// scripts/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_cicd_operator',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

const runMigrations = async () => {
  try {
    // 마이그레이션 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 실행된 마이그레이션 조회
    const executedResult = await pool.query('SELECT filename FROM migrations');
    const executedMigrations = executedResult.rows.map(row => row.filename);

    // 마이그레이션 파일 목록
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // 새로운 마이그레이션 실행
    for (const filename of migrationFiles) {
      if (!executedMigrations.includes(filename)) {
        console.log(`🔄 실행 중: ${filename}`);
        
        const filePath = path.join(migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        
        console.log(`✅ 완료: ${filename}`);
      }
    }

    console.log('✅ 모든 마이그레이션이 완료되었습니다.');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();
```

### 쿼리 최적화

#### 1. 인덱스 전략
```sql
-- ✅ 효율적인 인덱스 설계
-- 복합 인덱스 (자주 함께 사용되는 컬럼)
CREATE INDEX idx_projects_status_created_at ON projects(status, created_at);

-- 부분 인덱스 (조건부 인덱스)
CREATE INDEX idx_projects_active ON projects(created_at) WHERE status = 'active';

-- JSON 컬럼 인덱스
CREATE INDEX idx_config_data_gin ON kubernetes_clusters USING GIN (config_data);

-- 텍스트 검색 인덱스
CREATE INDEX idx_projects_search ON projects USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

#### 2. 쿼리 성능 분석
```sql
-- 쿼리 실행 계획 확인
EXPLAIN ANALYZE 
SELECT p.*, u.username, sd.name as domain_name
FROM projects p
LEFT JOIN timbel_users u ON p.created_by = u.id
LEFT JOIN system_domains sd ON p.domain_id = sd.id
WHERE p.status = 'active'
ORDER BY p.created_at DESC
LIMIT 20;

-- 느린 쿼리 확인
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

---

## 🧪 테스트 작성

### 백엔드 테스트

#### 1. 단위 테스트 (Jest)
```javascript
// tests/services/projectService.test.js
const { createProject, getProjects } = require('../../src/services/projectService');
const pool = require('../../src/config/database');

// 모킹
jest.mock('../../src/config/database');

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      // Arrange
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        domainId: 'domain-123',
        createdBy: 'user-123'
      };

      const mockResult = {
        rows: [{
          id: 'project-123',
          name: 'Test Project',
          description: 'Test Description',
          status: 'active',
          created_at: new Date()
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      // Act
      const result = await createProject(projectData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test Project');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        expect.arrayContaining([
          'Test Project',
          'Test Description',
          'domain-123',
          'user-123'
        ])
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidProjectData = {
        name: '', // 빈 이름
        description: 'Test Description'
      };

      // Act
      const result = await createProject(invalidProjectData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
    });
  });
});
```

#### 2. 통합 테스트 (Supertest)
```javascript
// tests/integration/projects.test.js
const request = require('supertest');
const app = require('../../src/index');

describe('Projects API', () => {
  let authToken;

  beforeAll(async () => {
    // 테스트용 로그인
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: '1q2w3e4r'
      });

    authToken = loginResponse.body.data.token;
  });

  describe('GET /api/projects', () => {
    it('should return projects list', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Integration Test Project',
        description: 'Created by integration test',
        domainId: 'domain-123'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
    });
  });
});
```

### 프론트엔드 테스트

#### 1. 컴포넌트 테스트 (React Testing Library)
```typescript
// tests/components/ProjectCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../src/theme';
import ProjectCard from '../../src/components/ProjectCard';

const mockProject = {
  id: 'project-123',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active' as const
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ProjectCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project information correctly', () => {
    renderWithTheme(
      <ProjectCard 
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    renderWithTheme(
      <ProjectCard 
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByLabelText('프로젝트 편집');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith('project-123');
  });

  it('should call onDelete when delete button is clicked', () => {
    renderWithTheme(
      <ProjectCard 
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('프로젝트 삭제');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('project-123');
  });
});
```

#### 2. 훅 테스트
```typescript
// tests/hooks/useAPI.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useAPI } from '../../src/hooks/useAPI';

// API 모킹
global.fetch = jest.fn();

describe('useAPI', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockData })
    });

    const { result } = renderHook(() => useAPI('/api/test'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useAPI('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('API Error');
  });
});
```

---

## 🐛 디버깅 및 로깅

### 로깅 시스템

#### 1. 구조화된 로깅
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'timbel-backend',
    version: process.env.npm_package_version 
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 사용 예시
logger.info('사용자 로그인 성공', {
  userId: 'user-123',
  email: 'user@example.com',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

logger.error('데이터베이스 연결 실패', {
  error: error.message,
  stack: error.stack,
  query: 'SELECT * FROM users',
  duration: 5000
});

module.exports = logger;
```

#### 2. API 요청 로깅
```javascript
// middleware/requestLogger.js
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('API 요청 완료', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    });
    
    // 느린 요청 경고
    if (duration > 1000) {
      logger.warn('느린 API 응답', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
};

module.exports = requestLogger;
```

### 디버깅 도구

#### 1. VS Code 디버깅 설정
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/index.js",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "app:*"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["start"]
    }
  ]
}
```

#### 2. 에러 추적
```javascript
// utils/errorTracker.js
class ErrorTracker {
  static track(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      // 추가 시스템 정보
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage()
    };

    // 로그에 기록
    logger.error('에러 추적', errorInfo);

    // 프로덕션에서는 외부 에러 추적 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // Sentry, Bugsnag 등으로 전송
      // sentry.captureException(error, { extra: context });
    }

    return errorInfo;
  }
}

// 사용 예시
try {
  await someAsyncOperation();
} catch (error) {
  ErrorTracker.track(error, {
    operation: 'someAsyncOperation',
    userId: req.user?.id,
    requestId: req.id
  });
  throw error;
}
```

---

## ⚡ 성능 최적화

### 백엔드 성능 최적화

#### 1. 데이터베이스 연결 풀링
```javascript
// config/database.js
const { Pool } = require('pg');

const createPool = (database) => {
  return new Pool({
    user: process.env.DB_USER || 'timbel_user',
    host: process.env.DB_HOST || 'postgres',
    database: database,
    password: process.env.DB_PASSWORD || 'timbel_password',
    port: process.env.DB_PORT || 5432,
    
    // 연결 풀 설정
    min: 5,                    // 최소 연결 수
    max: 20,                   // 최대 연결 수
    acquireTimeoutMillis: 60000, // 연결 획득 타임아웃
    idleTimeoutMillis: 30000,   // 유휴 연결 타임아웃
    
    // 연결 검증
    allowExitOnIdle: true,
    statement_timeout: 30000,   // SQL 실행 타임아웃
    query_timeout: 30000,       // 쿼리 타임아웃
    
    // 연결 유지
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });
};

const knowledgePool = createPool('timbel_knowledge');
const operationsPool = createPool('timbel_cicd_operator');

module.exports = {
  knowledgePool,
  operationsPool
};
```

#### 2. 캐싱 전략
```javascript
// utils/cache.js
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

class Cache {
  static async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('캐시 조회 실패', { key, error: error.message });
      return null;
    }
  }

  static async set(key, value, ttl = 3600) {
    try {
      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('캐시 저장 실패', { key, error: error.message });
    }
  }

  static async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      logger.error('캐시 삭제 실패', { key, error: error.message });
    }
  }

  // 캐시 미들웨어
  static middleware(ttl = 3600) {
    return async (req, res, next) => {
      const key = `api:${req.originalUrl}`;
      const cached = await Cache.get(key);

      if (cached) {
        return res.json(cached);
      }

      // 응답 캐싱
      const originalJson = res.json;
      res.json = function(data) {
        Cache.set(key, data, ttl);
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

module.exports = Cache;
```

### 프론트엔드 성능 최적화

#### 1. 코드 분할 및 지연 로딩
```typescript
// utils/lazyImports.ts
import { lazy } from 'react';

// 페이지별 지연 로딩
export const HomePage = lazy(() => import('../pages/HomePage'));
export const ProjectsPage = lazy(() => import('../pages/knowledge/ProjectsPage'));
export const OperationsCenter = lazy(() => import('../pages/operations/OperationsCenter'));

// 컴포넌트별 지연 로딩
export const ChartComponent = lazy(() => import('../components/charts/ChartComponent'));
```

#### 2. API 호출 최적화
```typescript
// hooks/useOptimizedAPI.ts
import { useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

const useOptimizedAPI = () => {
  // 디바운싱된 검색
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      const response = await fetch(`/api/search?q=${query}`);
      return response.json();
    }, 300),
    []
  );

  // 배치 요청
  const batchRequests = useCallback(async (requests: string[]) => {
    const responses = await Promise.all(
      requests.map(url => fetch(url).then(res => res.json()))
    );
    return responses;
  }, []);

  // 캐시된 요청
  const cachedRequest = useMemo(() => {
    const cache = new Map();
    
    return async (url: string) => {
      if (cache.has(url)) {
        return cache.get(url);
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      cache.set(url, data);
      
      // 5분 후 캐시 만료
      setTimeout(() => cache.delete(url), 5 * 60 * 1000);
      
      return data;
    };
  }, []);

  return {
    debouncedSearch,
    batchRequests,
    cachedRequest
  };
};

export default useOptimizedAPI;
```

---

## 🔒 보안 고려사항

### 인증 및 권한

#### 1. JWT 보안 강화
```javascript
// middleware/jwtAuth.js
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// JWT 토큰 검증 강화
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    
    // 토큰 블랙리스트 확인 (Redis)
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 토큰 만료 시간 확인
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        error: 'EXPIRED_TOKEN',
        message: '토큰이 만료되었습니다.'
      });
    }

    req.user = decoded;
    next();
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: '유효하지 않은 토큰입니다.'
    });
  }
};

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회 로그인 시도
  message: {
    success: false,
    error: 'TOO_MANY_ATTEMPTS',
    message: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.'
  }
});

module.exports = {
  verifyToken,
  authLimiter
};
```

#### 2. 입력 검증 및 새니타이징
```javascript
// middleware/inputValidation.js
const validator = require('validator');
const xss = require('xss');

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // XSS 방지
    input = xss(input, {
      whiteList: {}, // 모든 HTML 태그 제거
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    
    // SQL Injection 방지를 위한 특수 문자 제거
    input = input.replace(/['";\\]/g, '');
    
    return validator.escape(input);
  }
  
  return input;
};

const validateAndSanitize = (req, res, next) => {
  // 모든 입력 데이터 새니타이징
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else {
          obj[key] = sanitizeInput(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  sanitizeInput,
  validateAndSanitize
};
```

### 데이터 보호

#### 1. 민감 데이터 암호화
```javascript
// utils/encryption.js
const crypto = require('crypto');

class Encryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('timbel', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAAD(Buffer.from('timbel', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 비밀번호 해싱
  static async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }
}

module.exports = new Encryption();
```

---

## 📚 추가 리소스

### 학습 자료
- **Node.js 공식 문서**: https://nodejs.org/docs/
- **React 공식 문서**: https://react.dev/
- **Material-UI 문서**: https://mui.com/
- **PostgreSQL 문서**: https://www.postgresql.org/docs/

### 코드 품질 도구
```json
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'react-hooks/recommended'
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
};

// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Git 워크플로우
```bash
# 기능 개발 워크플로우
git checkout -b feature/new-feature
git add .
git commit -m "feat: 새 기능 추가"
git push origin feature/new-feature

# Pull Request 생성 후 코드 리뷰
# 승인 후 main 브랜치에 머지
```

---

**📅 문서 버전**: v1.0  
**📅 최종 수정일**: 2024-01-01  
**👤 작성자**: Timbel Development Team  
**📧 문의**: dev@timbel.net
