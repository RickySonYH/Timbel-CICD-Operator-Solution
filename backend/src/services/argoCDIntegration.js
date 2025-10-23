// [advice from AI] ArgoCD GitOps 배포 연동 서비스 - Phase 2 실제 연동
const axios = require('axios');
const https = require('https');

class ArgoCDIntegration {
  constructor() {
    // [advice from AI] Phase 2: 환경 변수 기반 ArgoCD 서버 설정
    this.argocdURL = process.env.ARGOCD_URL || 'http://argocd.langsa.ai';
    this.argocdToken = process.env.ARGOCD_TOKEN || '';
    this.argocdUser = process.env.ARGOCD_USERNAME || 'admin';
    this.argocdPassword = process.env.ARGOCD_PASSWORD || '1q2w3e4r';
    this.argocdNamespace = process.env.ARGOCD_NAMESPACE || 'argocd';
    this.argocdInsecure = process.env.ARGOCD_INSECURE === 'true';
    
    // [advice from AI] 재시도 및 타임아웃 설정
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2초
    this.requestTimeout = 30000; // 30초
    
    // [advice from AI] Phase 2: 향상된 Axios 인스턴스 생성
    this.client = axios.create({
      baseURL: this.argocdURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: this.requestTimeout,
      // [advice from AI] HTTPS 인증서 검증 설정
      httpsAgent: this.argocdInsecure ? new https.Agent({
        rejectUnauthorized: false
      }) : undefined,
      // [advice from AI] 요청 재시도 설정
      validateStatus: (status) => status < 500, // 5xx 에러만 재시도
      maxRedirects: 5
    });

    // [advice from AI] 인증 토큰 및 상태 관리
    this.authToken = null;
    this.lastAuthTime = null;
    this.authTokenExpiry = 24 * 60 * 60 * 1000; // 24시간
    
    // [advice from AI] 요청 인터셉터 추가
    this.setupRequestInterceptors();
  }

  // [advice from AI] Phase 2: 요청 인터셉터 설정
  setupRequestInterceptors() {
    // 요청 인터셉터: 자동 인증 토큰 추가
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        console.log(`🔄 ArgoCD API 요청: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ ArgoCD 요청 인터셉터 오류:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터: 자동 재시도 및 에러 처리
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ ArgoCD API 응답: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // 401 에러시 재인증 시도
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          console.log('🔄 ArgoCD 토큰 만료, 재인증 시도...');
          
          try {
            this.authToken = null; // 기존 토큰 초기화
            await this.authenticate();
            originalRequest.headers.Authorization = `Bearer ${this.authToken}`;
            return this.client(originalRequest);
          } catch (authError) {
            console.error('❌ ArgoCD 재인증 실패:', authError.message);
            return Promise.reject(authError);
          }
        }
        
        // 5xx 에러시 재시도
        if (error.response?.status >= 500 && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }
        
        if (error.response?.status >= 500 && originalRequest._retryCount < this.maxRetries) {
          originalRequest._retryCount++;
          const delay = this.retryDelay * originalRequest._retryCount;
          
          console.log(`🔄 ArgoCD API 재시도 (${originalRequest._retryCount}/${this.maxRetries}) ${delay}ms 후...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client(originalRequest);
        }
        
        console.error(`❌ ArgoCD API 오류: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // [advice from AI] Phase 2: 향상된 인증 토큰 관리
  async authenticate() {
    try {
      // [advice from AI] 기존 토큰이 유효한지 확인
      if (this.authToken && this.isTokenValid()) {
        console.log('🔐 기존 ArgoCD 토큰 사용 중...');
        return true;
      }

      // [advice from AI] 환경 변수 토큰 우선 사용
      if (this.argocdToken) {
        console.log('🔐 환경 변수 ArgoCD 토큰 사용...');
        this.authToken = this.argocdToken;
        this.lastAuthTime = Date.now();
        return true;
      }

      console.log('🔐 ArgoCD 사용자명/비밀번호로 인증 중...');
      
      // [advice from AI] 임시로 Authorization 헤더 제거 (인증 요청시)
      const tempClient = axios.create({
        baseURL: this.argocdURL,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.requestTimeout,
        httpsAgent: this.argocdInsecure ? new https.Agent({
          rejectUnauthorized: false
        }) : undefined
      });

      const response = await tempClient.post('/api/v1/session', {
        username: this.argocdUser,
        password: this.argocdPassword
      });

      this.authToken = response.data.token;
      this.lastAuthTime = Date.now();
      
      console.log('✅ ArgoCD 인증 완료');
      return true;

    } catch (error) {
      console.error('❌ ArgoCD 인증 실패:', error.response?.data || error.message);
      
      // [advice from AI] 상세한 에러 정보 제공
      if (error.response?.status === 401) {
        throw new Error(`ArgoCD 인증 실패: 잘못된 사용자명 또는 비밀번호 (${this.argocdUser})`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`ArgoCD 서버 연결 실패: ${this.argocdURL}`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`ArgoCD 서버 호스트를 찾을 수 없음: ${this.argocdURL}`);
      } else {
        throw new Error(`ArgoCD 인증 실패: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  // [advice from AI] Phase 2: 토큰 유효성 검사
  isTokenValid() {
    if (!this.authToken || !this.lastAuthTime) {
      return false;
    }
    
    const tokenAge = Date.now() - this.lastAuthTime;
    return tokenAge < this.authTokenExpiry;
  }

  // [advice from AI] Phase 2: 향상된 ArgoCD Application 생성
  async createApplication(appConfig) {
    try {
      await this.authenticate();
      
      console.log(`🎯 ArgoCD Application 생성: ${appConfig.appName}`);

      // [advice from AI] 입력 검증
      this.validateApplicationConfig(appConfig);

      const applicationSpec = {
        metadata: {
          name: appConfig.appName,
          namespace: this.argocdNamespace,
          labels: {
            'app.kubernetes.io/name': appConfig.appName,
            'app.kubernetes.io/managed-by': 'timbel-cicd-operator',
            'timbel.ai/tenant': appConfig.tenantId || 'default',
            'timbel.ai/environment': appConfig.environment || 'development'
          },
          annotations: {
            'timbel.ai/created-by': 'timbel-cicd-operator',
            'timbel.ai/created-at': new Date().toISOString(),
            'argocd.argoproj.io/sync-wave': '0'
          }
        },
        spec: {
          project: appConfig.project || 'default',
          source: {
            repoURL: appConfig.repoURL,
            path: appConfig.path || '.',
            targetRevision: appConfig.branch || 'HEAD',
            // [advice from AI] Helm 차트 지원
            ...(appConfig.helm && {
              helm: {
                valueFiles: appConfig.helm.valueFiles || ['values.yaml'],
                parameters: appConfig.helm.parameters || [],
                values: appConfig.helm.values || ''
              }
            }),
            // [advice from AI] Kustomize 지원
            ...(appConfig.kustomize && {
              kustomize: {
                namePrefix: appConfig.kustomize.namePrefix || '',
                nameSuffix: appConfig.kustomize.nameSuffix || '',
                images: appConfig.kustomize.images || []
              }
            })
          },
          destination: {
            server: appConfig.cluster || 'https://kubernetes.default.svc',
            namespace: appConfig.namespace || 'default'
          },
          syncPolicy: {
            automated: appConfig.autoSync !== false ? {
              prune: appConfig.prune !== false,
              selfHeal: appConfig.selfHeal !== false,
              allowEmpty: false
            } : null,
            syncOptions: [
              'CreateNamespace=true',
              'PrunePropagationPolicy=foreground',
              'PruneLast=true',
              ...(appConfig.syncOptions || [])
            ],
            retry: {
              limit: 5,
              backoff: {
                duration: '5s',
                factor: 2,
                maxDuration: '3m'
              }
            }
          },
          // [advice from AI] 리소스 제한 및 무시 설정
          ...(appConfig.ignoreDifferences && {
            ignoreDifferences: appConfig.ignoreDifferences
          }),
          ...(appConfig.info && {
            info: appConfig.info
          })
        }
      };

      const response = await this.client.post('/api/v1/applications', applicationSpec);
      
      console.log('✅ ArgoCD Application 생성 완료:', appConfig.appName);
      return {
        success: true,
        application: response.data,
        argocd_url: `${this.argocdURL}/applications/${appConfig.appName}`
      };

    } catch (error) {
      console.error('❌ ArgoCD Application 생성 실패:', error.response?.data || error.message);
      
      // 이미 존재하는 경우는 성공으로 처리
      if (error.response?.status === 409) {
        console.log('ℹ️ Application 이미 존재 (성공으로 처리)');
        return {
          success: true,
          application: { metadata: { name: appConfig.appName } },
          argocd_url: `${this.argocdURL}/applications/${appConfig.appName}`,
          message: 'Application already exists'
        };
      }
      
      throw new Error(`ArgoCD Application 생성 실패: ${error.response?.data?.message || error.message}`);
    }
  }

  // [advice from AI] ArgoCD Application 동기화
  async syncApplication(appName) {
    try {
      await this.authenticate();
      
      console.log(`🔄 ArgoCD Application 동기화: ${appName}`);

      const syncRequest = {
        revision: 'HEAD',
        prune: true,
        dryRun: false,
        strategy: {
          apply: {
            force: false
          }
        }
      };

      const response = await this.client.post(`/api/v1/applications/${appName}/sync`, syncRequest);
      
      console.log('✅ ArgoCD Application 동기화 완료:', appName);
      return {
        success: true,
        sync: response.data
      };

    } catch (error) {
      console.error('❌ ArgoCD Application 동기화 실패:', error.response?.data || error.message);
      throw new Error(`ArgoCD 동기화 실패: ${error.response?.data?.message || error.message}`);
    }
  }

  // [advice from AI] ArgoCD Application 상태 조회
  async getApplicationStatus(appName) {
    try {
      await this.authenticate();
      
      const response = await this.client.get(`/api/v1/applications/${appName}`);
      
      return {
        success: true,
        application: response.data,
        health: response.data.status?.health?.status || 'Unknown',
        sync: response.data.status?.sync?.status || 'Unknown'
      };

    } catch (error) {
      console.error('❌ ArgoCD Application 상태 조회 실패:', error.message);
      throw new Error(`Application 상태 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] ArgoCD Application 목록 조회
  async listApplications() {
    try {
      await this.authenticate();
      
      const response = await this.client.get('/api/v1/applications');
      
      return {
        success: true,
        applications: response.data.items || []
      };

    } catch (error) {
      console.error('❌ ArgoCD Application 목록 조회 실패:', error.message);
      throw new Error(`Application 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] ArgoCD Application 삭제
  async deleteApplication(appName) {
    try {
      await this.authenticate();
      
      console.log(`🗑️ ArgoCD Application 삭제: ${appName}`);
      
      await this.client.delete(`/api/v1/applications/${appName}?cascade=true`);
      
      console.log('✅ ArgoCD Application 삭제 완료:', appName);
      return {
        success: true,
        message: 'Application deleted successfully'
      };

    } catch (error) {
      console.error('❌ ArgoCD Application 삭제 실패:', error.message);
      throw new Error(`Application 삭제 실패: ${error.message}`);
    }
  }

  // [advice from AI] ArgoCD 헬스 체크
  async healthCheck() {
    try {
      const response = await this.client.get('/api/version');
      return {
        success: true,
        status: 'healthy',
        version: response.data?.Version || 'unknown'
      };
    } catch (error) {
      console.error('❌ ArgoCD 헬스 체크 실패:', error.message);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // [advice from AI] Kubernetes 매니페스트 생성 (기본 템플릿)
  generateKubernetesManifest(appName, imageName, port = 80) {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: appName,
        labels: {
          app: appName
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: appName
          }
        },
        template: {
          metadata: {
            labels: {
              app: appName
            }
          },
          spec: {
            containers: [{
              name: appName,
              image: imageName,
              ports: [{
                containerPort: port
              }],
              resources: {
                requests: {
                  memory: '256Mi',
                  cpu: '250m'
                },
                limits: {
                  memory: '512Mi',
                  cpu: '500m'
                }
              }
            }]
          }
        }
      }
    };
  }

  // [advice from AI] Phase 2: Application 설정 검증
  validateApplicationConfig(appConfig) {
    if (!appConfig.appName) {
      throw new Error('Application 이름이 필요합니다');
    }
    
    if (!appConfig.repoURL) {
      throw new Error('Git Repository URL이 필요합니다');
    }
    
    // Kubernetes 리소스 이름 검증
    const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!nameRegex.test(appConfig.appName)) {
      throw new Error('Application 이름은 소문자, 숫자, 하이픈만 사용 가능합니다');
    }
    
    if (appConfig.appName.length > 63) {
      throw new Error('Application 이름은 63자를 초과할 수 없습니다');
    }
    
    // URL 형식 검증
    try {
      new URL(appConfig.repoURL);
    } catch (error) {
      throw new Error('유효하지 않은 Git Repository URL입니다');
    }
    
    console.log('✅ Application 설정 검증 완료:', appConfig.appName);
  }

  // [advice from AI] Phase 2: 애플리케이션 동기화 상태 대기
  async waitForSync(appName, timeoutMs = 300000) { // 5분 타임아웃
    const startTime = Date.now();
    const pollInterval = 5000; // 5초마다 확인
    
    console.log(`⏳ ArgoCD Application 동기화 대기: ${appName}`);
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getApplicationStatus(appName);
        
        if (status.sync === 'Synced' && status.health === 'Healthy') {
          console.log(`✅ ArgoCD Application 동기화 완료: ${appName}`);
          return {
            success: true,
            status: status,
            duration: Date.now() - startTime
          };
        }
        
        if (status.sync === 'OutOfSync') {
          console.log(`🔄 ArgoCD Application 동기화 중: ${appName} (${status.health})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.warn(`⚠️ ArgoCD Application 상태 확인 실패: ${appName}`, error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error(`ArgoCD Application 동기화 타임아웃: ${appName} (${timeoutMs}ms)`);
  }

  // [advice from AI] Phase 2: 애플리케이션 상세 정보 조회
  async getApplicationDetails(appName) {
    try {
      await this.authenticate();
      
      const [appResponse, resourcesResponse] = await Promise.all([
        this.client.get(`/api/v1/applications/${appName}`),
        this.client.get(`/api/v1/applications/${appName}/resource-tree`).catch(() => ({ data: { nodes: [] } }))
      ]);
      
      const app = appResponse.data;
      const resources = resourcesResponse.data;
      
      return {
        success: true,
        application: {
          name: app.metadata.name,
          namespace: app.metadata.namespace,
          labels: app.metadata.labels,
          annotations: app.metadata.annotations,
          createdAt: app.metadata.creationTimestamp,
          project: app.spec.project,
          source: app.spec.source,
          destination: app.spec.destination,
          syncPolicy: app.spec.syncPolicy,
          status: {
            health: app.status?.health?.status || 'Unknown',
            sync: app.status?.sync?.status || 'Unknown',
            conditions: app.status?.conditions || [],
            summary: app.status?.summary || {},
            resources: app.status?.resources || []
          }
        },
        resources: resources.nodes || [],
        url: `${this.argocdURL}/applications/${appName}`
      };
      
    } catch (error) {
      console.error('❌ ArgoCD Application 상세 정보 조회 실패:', error.message);
      throw new Error(`Application 상세 정보 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 배치 작업을 위한 애플리케이션 목록 필터링
  async listApplicationsByLabel(labelSelector) {
    try {
      await this.authenticate();
      
      const response = await this.client.get('/api/v1/applications', {
        params: {
          selector: labelSelector
        }
      });
      
      return {
        success: true,
        applications: response.data.items || [],
        count: response.data.items?.length || 0
      };
      
    } catch (error) {
      console.error('❌ ArgoCD Application 레이블 필터링 실패:', error.message);
      throw new Error(`Application 레이블 필터링 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 연결 상태 테스트
  async testConnection() {
    try {
      console.log(`🔍 ArgoCD 연결 테스트: ${this.argocdURL}`);
      
      const healthResult = await this.healthCheck();
      if (!healthResult.success) {
        return {
          success: false,
          error: 'ArgoCD 서버 헬스 체크 실패',
          details: healthResult
        };
      }
      
      const authResult = await this.authenticate();
      if (!authResult) {
        return {
          success: false,
          error: 'ArgoCD 인증 실패'
        };
      }
      
      const appsResult = await this.listApplications();
      
      console.log('✅ ArgoCD 연결 테스트 성공');
      return {
        success: true,
        server: {
          url: this.argocdURL,
          version: healthResult.version,
          user: this.argocdUser,
          namespace: this.argocdNamespace
        },
        applications: {
          count: appsResult.applications.length,
          list: appsResult.applications.slice(0, 5).map(app => ({
            name: app.metadata.name,
            health: app.status?.health?.status,
            sync: app.status?.sync?.status
          }))
        }
      };
      
    } catch (error) {
      console.error('❌ ArgoCD 연결 테스트 실패:', error.message);
      return {
        success: false,
        error: error.message,
        server: {
          url: this.argocdURL,
          user: this.argocdUser,
          namespace: this.argocdNamespace
        }
      };
    }
  }
}

module.exports = ArgoCDIntegration;
