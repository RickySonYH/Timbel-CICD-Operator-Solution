// [advice from AI] Swagger/OpenAPI 설정
// API 문서 자동 생성 및 관리

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// [advice from AI] Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Timbel CICD Operator API',
      version: '1.0.0',
      description: `
        # Timbel CICD Operator Solution API 문서

        ## 개요
        Timbel CICD Operator는 CI/CD 파이프라인 관리, 지식자원 관리, 시스템 모니터링을 위한 통합 플랫폼입니다.

        ## 주요 기능
        - **지식자원 관리**: 프로젝트, 시스템, 코드 컴포넌트, 디자인 자산, 문서 관리
        - **CI/CD 파이프라인**: Jenkins, ArgoCD, Nexus 통합 파이프라인 관리
        - **시스템 모니터링**: 실시간 메트릭, 로그 관리, 성능 모니터링
        - **사용자 관리**: 고급 권한 시스템, MFA, 세션 관리
        - **운영센터**: 클러스터 관리, 배포 관리, 인프라 관리

        ## 인증
        대부분의 API는 JWT 토큰 기반 인증이 필요합니다.
        Authorization 헤더에 'Bearer {token}' 형식으로 토큰을 포함해야 합니다.

        ## 권한 시스템
        - **admin**: 모든 권한
        - **executive**: 경영진 대시보드 및 승인 권한
        - **po**: 프로젝트 관리 권한
        - **pe**: 개발 권한
        - **qa**: 품질 관리 권한
        - **operations**: 운영 관리 권한
        - **development**: 개발 환경 관리 권한

        ## 응답 형식
        모든 API 응답은 다음 형식을 따릅니다:
        \`\`\`json
        {
          "success": true,
          "data": {},
          "message": "성공 메시지",
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
        \`\`\`

        ## 에러 처리
        에러 발생 시 다음 형식으로 응답됩니다:
        \`\`\`json
        {
          "success": false,
          "error": "에러 코드",
          "message": "에러 메시지",
          "details": {}
        }
        \`\`\`

        ## 페이지네이션
        목록 조회 API는 다음 매개변수를 지원합니다:
        - \`limit\`: 페이지 크기 (기본값: 20)
        - \`offset\`: 오프셋 (기본값: 0)
        - \`search\`: 검색어
        - \`sort\`: 정렬 필드
        - \`order\`: 정렬 방향 (asc, desc)
      `,
      contact: {
        name: 'Timbel Platform Team',
        email: 'support@timbel.net',
        url: 'https://timbel.net'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '개발 서버'
      },
      {
        url: 'https://api.timbel.net',
        description: '프로덕션 서버'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 토큰을 사용한 인증'
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: '세션 기반 인증'
        }
      },
      schemas: {
        // [advice from AI] 공통 스키마 정의
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '요청 성공 여부'
            },
            data: {
              type: 'object',
              description: '응답 데이터'
            },
            message: {
              type: 'string',
              description: '응답 메시지'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '응답 시간'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '에러 코드'
            },
            message: {
              type: 'string',
              description: '에러 메시지'
            },
            details: {
              type: 'object',
              description: '에러 상세 정보'
            }
          }
        },
        PaginationParams: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: '페이지 크기'
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: '오프셋'
            },
            search: {
              type: 'string',
              description: '검색어'
            },
            sort: {
              type: 'string',
              description: '정렬 필드'
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: '정렬 방향'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '사용자 ID'
            },
            username: {
              type: 'string',
              description: '사용자명'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '이메일'
            },
            fullName: {
              type: 'string',
              description: '전체 이름'
            },
            role: {
              type: 'string',
              enum: ['admin', 'executive', 'po', 'pe', 'qa', 'operations', 'development'],
              description: '사용자 역할'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: '사용자 상태'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성일시'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정일시'
            }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '프로젝트 ID'
            },
            name: {
              type: 'string',
              description: '프로젝트명'
            },
            description: {
              type: 'string',
              description: '프로젝트 설명'
            },
            status: {
              type: 'string',
              enum: ['planning', 'active', 'completed', 'suspended'],
              description: '프로젝트 상태'
            },
            domainId: {
              type: 'string',
              format: 'uuid',
              description: '도메인 ID'
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              description: '생성자 ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성일시'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '수정일시'
            }
          }
        },
        Pipeline: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '파이프라인 ID'
            },
            pipelineId: {
              type: 'string',
              description: '파이프라인 식별자'
            },
            repository: {
              type: 'string',
              description: '저장소 URL'
            },
            branch: {
              type: 'string',
              description: '브랜치명'
            },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production'],
              description: '환경'
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
              description: '파이프라인 상태'
            },
            currentStage: {
              type: 'string',
              description: '현재 단계'
            },
            providerName: {
              type: 'string',
              description: '파이프라인 제공자'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '생성일시'
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              description: '시작일시'
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: '완료일시'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: '인증 실패',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'UNAUTHORIZED',
                message: '인증이 필요합니다.'
              }
            }
          }
        },
        ForbiddenError: {
          description: '권한 부족',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'FORBIDDEN',
                message: '접근 권한이 없습니다.'
              }
            }
          }
        },
        ValidationError: {
          description: '입력 검증 오류',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'VALIDATION_ERROR',
                message: '입력 데이터가 올바르지 않습니다.',
                details: {
                  field: 'email',
                  message: '유효한 이메일 주소를 입력해주세요.'
                }
              }
            }
          }
        },
        InternalServerError: {
          description: '서버 내부 오류',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'INTERNAL_SERVER_ERROR',
                message: '서버 내부 오류가 발생했습니다.'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: '사용자 인증 및 권한 관리'
      },
      {
        name: 'Knowledge Management',
        description: '지식자원 관리 (프로젝트, 시스템, 코드, 디자인, 문서)'
      },
      {
        name: 'CI/CD Pipeline',
        description: 'CI/CD 파이프라인 관리 및 실행'
      },
      {
        name: 'Operations',
        description: '운영센터 - 클러스터, 배포, 인프라 관리'
      },
      {
        name: 'System Monitoring',
        description: '시스템 모니터링 및 메트릭'
      },
      {
        name: 'Administration',
        description: '시스템 관리 및 설정'
      },
      {
        name: 'User Management',
        description: '사용자 및 권한 관리'
      },
      {
        name: 'MFA',
        description: '다단계 인증 (Multi-Factor Authentication)'
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../routes/**/*.js')
  ]
};

// [advice from AI] Swagger 문서 생성
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// [advice from AI] Swagger UI 옵션
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // [advice from AI] 요청 인터셉터 (인증 토큰 자동 추가 등)
      console.log('Swagger API 요청:', req.url);
      return req;
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Timbel CICD Operator API 문서',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};
