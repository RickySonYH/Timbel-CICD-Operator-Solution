# [advice from AI] Timbel 플랫폼 프로덕션 Dockerfile
# 멀티 스테이지 빌드로 최적화된 컨테이너 생성

# =============================================================================
# Stage 1: Frontend Build
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 의존성 설치 (캐시 최적화)
COPY frontend/package*.json ./
RUN npm ci --only=production

# 소스 코드 복사 및 빌드
COPY frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: Backend Build
# =============================================================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# 의존성 설치
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --only=production

# TypeScript 컴파일
COPY backend/ ./
RUN npm run build

# =============================================================================
# Stage 3: Production Runtime
# =============================================================================
FROM node:20-alpine AS production

# 시스템 패키지 업데이트 및 필수 도구 설치
RUN apk update && apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 비root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S timbel -u 1001

WORKDIR /app

# 백엔드 파일 복사
COPY --from=backend-builder --chown=timbel:nodejs /app/backend/dist ./backend/
COPY --from=backend-builder --chown=timbel:nodejs /app/backend/node_modules ./backend/node_modules/
COPY --from=backend-builder --chown=timbel:nodejs /app/backend/package*.json ./backend/
COPY --from=backend-builder --chown=timbel:nodejs /app/backend/prisma ./backend/prisma/

# 프론트엔드 빌드 파일 복사
COPY --from=frontend-builder --chown=timbel:nodejs /app/frontend/build ./frontend/build/

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3001

# 포트 노출
EXPOSE 3001

# 사용자 변경
USER timbel

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 애플리케이션 실행
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/index.js"]
