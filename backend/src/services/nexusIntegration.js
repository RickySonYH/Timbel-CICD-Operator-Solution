// [advice from AI] Nexus Repository Manager 연동 서비스 - Phase 2 프로덕션 레벨
// 아티팩트 저장소 관리, Docker Registry, Maven/NPM Repository, 보안 관리

const axios = require('axios');
const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class NexusIntegration extends EventEmitter {
  constructor() {
    super();
    
    // [advice from AI] Phase 2: 환경 변수 기반 Nexus 서버 설정
    this.nexusURL = process.env.NEXUS_URL || 'http://nexus.langsa.ai:8081';
    this.nexusUser = process.env.NEXUS_USERNAME || 'admin';
    this.nexusPassword = process.env.NEXUS_PASSWORD || '1q2w3e4r';
    this.nexusTimeout = parseInt(process.env.NEXUS_TIMEOUT || '60000'); // 1분
    this.nexusApiVersion = process.env.NEXUS_API_VERSION || 'v1';
    
    // [advice from AI] Docker Registry 설정
    this.dockerRegistry = process.env.NEXUS_DOCKER_REGISTRY || 'nexus.langsa.ai:8082';
    this.dockerRegistryPort = process.env.NEXUS_DOCKER_PORT || '8082';
    
    // [advice from AI] 고급 설정
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.maxUploadSize = parseInt(process.env.MAX_FILE_SIZE || '1073741824'); // 1GB
    this.supportedFormats = ['docker', 'maven2', 'npm', 'pypi', 'nuget', 'raw'];
    
    // [advice from AI] 인증 헤더
    this.authHeader = `Basic ${Buffer.from(`${this.nexusUser}:${this.nexusPassword}`).toString('base64')}`;
    
    // [advice from AI] 저장소 상태 추적
    this.repositoryCache = new Map(); // repositoryName -> repositoryInfo
    this.uploadQueue = new Map(); // uploadId -> uploadInfo
    this.downloadStats = new Map(); // repositoryName -> stats
    
    // [advice from AI] Phase 2: 향상된 Axios 클라이언트 설정
    this.client = axios.create({
      baseURL: this.nexusURL,
      timeout: this.nexusTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'User-Agent': 'Timbel-CICD-Operator/2.0'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // 자체 서명 인증서 허용
      }),
      validateStatus: (status) => status < 500, // 5xx 에러만 재시도
      maxRedirects: 5,
      // [advice from AI] 대용량 파일 업로드 지원
      maxContentLength: this.maxUploadSize,
      maxBodyLength: this.maxUploadSize
    });
    
    // [advice from AI] 요청/응답 인터셉터 설정
    this.setupInterceptors();
  }

  // [advice from AI] Phase 2: 요청/응답 인터셉터 설정
  setupInterceptors() {
    // 요청 인터셉터: 요청 로깅 및 전처리
    this.client.interceptors.request.use(
      (config) => {
        // 업로드 진행률 추적을 위한 설정
        if (config.onUploadProgress) {
          const originalOnUploadProgress = config.onUploadProgress;
          config.onUploadProgress = (progressEvent) => {
            const progress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            };
            
            // 이벤트 발생
            this.emit('uploadProgress', progress);
            
            // 원래 콜백 호출
            if (originalOnUploadProgress) {
              originalOnUploadProgress(progressEvent);
            }
          };
        }
        
        console.log(`🔄 Nexus API 요청: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Nexus 요청 인터셉터 오류:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터: 자동 재시도 및 에러 처리
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Nexus API 응답: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // 401 에러시 인증 정보 재확인
        if (error.response?.status === 401 && !originalRequest._authRetry) {
          originalRequest._authRetry = true;
          console.log('🔄 Nexus 인증 오류, 재시도...');
          
          // 새로운 인증 헤더 설정
          originalRequest.headers.Authorization = this.authHeader;
          return this.client(originalRequest);
        }
        
        // 5xx 에러시 재시도
        if (error.response?.status >= 500 && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }
        
        if (error.response?.status >= 500 && originalRequest._retryCount < this.maxRetries) {
          originalRequest._retryCount++;
          const delay = this.retryDelay * originalRequest._retryCount;
          
          console.log(`🔄 Nexus API 재시도 (${originalRequest._retryCount}/${this.maxRetries}) ${delay}ms 후...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client(originalRequest);
        }
        
        console.error(`❌ Nexus API 오류: ${error.response?.status} ${error.config?.url}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // [advice from AI] Phase 2: 향상된 저장소 생성 (다양한 형식 지원)
  async createRepository(repositoryName, format = 'docker', config = {}) {
    try {
      console.log(`📦 Nexus Repository 생성: ${repositoryName} (${format})`);

      // [advice from AI] 형식별 저장소 설정 검증
      this.validateRepositoryConfig(repositoryName, format, config);

      // [advice from AI] 형식별 저장소 설정 생성
      const repositoryConfig = this.generateRepositoryConfig(repositoryName, format, config);

      const response = await this.client.post('/service/rest/v1/repositories/docker/hosted', repositoryConfig);
      
      console.log('✅ Nexus Repository 생성 완료:', repositoryName);
      return {
        success: true,
        repository: repositoryConfig,
        nexus_url: `${this.nexusURL}/repository/${repositoryName}`
      };

    } catch (error) {
      console.error('❌ Nexus Repository 생성 실패:', error.response?.data || error.message);
      
      // 이미 존재하는 경우는 성공으로 처리
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Repository 이미 존재 (성공으로 처리)');
        return {
          success: true,
          repository: { name: repositoryName },
          nexus_url: `${this.nexusURL}/repository/${repositoryName}`,
          message: 'Repository already exists'
        };
      }
      
      throw new Error(`Nexus Repository 생성 실패: ${error.response?.data?.message || error.message}`);
    }
  }

  // [advice from AI] Repository 목록 조회
  async listRepositories() {
    try {
      const response = await this.client.get('/service/rest/v1/repositories');
      return {
        success: true,
        repositories: response.data
      };
    } catch (error) {
      console.error('❌ Nexus Repository 목록 조회 실패:', error.message);
      throw new Error(`Repository 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Repository 삭제
  async deleteRepository(repositoryName) {
    try {
      console.log(`🗑️ Nexus Repository 삭제: ${repositoryName}`);
      
      await this.client.delete(`/service/rest/v1/repositories/${repositoryName}`);
      
      console.log('✅ Nexus Repository 삭제 완료:', repositoryName);
      return {
        success: true,
        message: 'Repository deleted successfully'
      };

    } catch (error) {
      console.error('❌ Nexus Repository 삭제 실패:', error.message);
      throw new Error(`Repository 삭제 실패: ${error.message}`);
    }
  }

  // [advice from AI] Docker 이미지 푸시
  async pushDockerImage(imageName, tag = 'latest') {
    try {
      console.log(`🐳 Docker 이미지 푸시: ${imageName}:${tag}`);
      
      // 실제 Docker 명령어는 Jenkins에서 실행되므로 여기서는 로그만 기록
      const pushCommand = `docker tag ${imageName}:${tag} ${this.nexusURL.replace('http://', '')}/${imageName}:${tag}`;
      const pushCommand2 = `docker push ${this.nexusURL.replace('http://', '')}/${imageName}:${tag}`;
      
      console.log('📝 Docker Push Commands:');
      console.log('  ', pushCommand);
      console.log('  ', pushCommand2);
      
      return {
        success: true,
        image: `${this.nexusURL.replace('http://', '')}/${imageName}:${tag}`,
        commands: [pushCommand, pushCommand2]
      };

    } catch (error) {
      console.error('❌ Docker 이미지 푸시 실패:', error.message);
      throw new Error(`Docker 이미지 푸시 실패: ${error.message}`);
    }
  }

  // [advice from AI] Nexus 헬스 체크
  async healthCheck() {
    try {
      const response = await this.client.get('/service/rest/v1/status');
      return {
        success: true,
        status: 'healthy',
        version: response.data?.version || 'unknown'
      };
    } catch (error) {
      console.error('❌ Nexus 헬스 체크 실패:', error.message);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // [advice from AI] Phase 2: 저장소 설정 검증
  validateRepositoryConfig(repositoryName, format, config) {
    if (!repositoryName || repositoryName.length < 3) {
      throw new Error('저장소 이름은 3자 이상이어야 합니다');
    }
    
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`지원하지 않는 저장소 형식: ${format}. 지원 형식: ${this.supportedFormats.join(', ')}`);
    }
    
    // Kubernetes 리소스 이름 규칙 적용
    const nameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!nameRegex.test(repositoryName)) {
      throw new Error('저장소 이름은 소문자, 숫자, 하이픈만 사용 가능합니다');
    }
    
    console.log(`✅ 저장소 설정 검증 완료: ${repositoryName} (${format})`);
  }

  // [advice from AI] Phase 2: 형식별 저장소 설정 생성
  generateRepositoryConfig(repositoryName, format, config = {}) {
    const baseConfig = {
      name: repositoryName,
      format: format,
      type: config.type || 'hosted',
      online: config.online !== false,
      storage: {
        blobStoreName: config.blobStoreName || 'default',
        strictContentTypeValidation: config.strictContentTypeValidation !== false,
        writePolicy: config.writePolicy || 'ALLOW'
      }
    };

    // 형식별 특화 설정
    switch (format) {
      case 'docker':
        return {
          ...baseConfig,
          docker: {
            v1Enabled: config.v1Enabled || false,
            forceBasicAuth: config.forceBasicAuth !== false,
            httpPort: config.httpPort || null,
            httpsPort: config.httpsPort || null,
            subdomain: config.subdomain || null
          }
        };
      
      case 'maven2':
        return {
          ...baseConfig,
          maven: {
            versionPolicy: config.versionPolicy || 'MIXED',
            layoutPolicy: config.layoutPolicy || 'STRICT'
          }
        };
      
      case 'npm':
        return {
          ...baseConfig,
          npm: {
            removeNonCataloged: config.removeNonCataloged || false,
            removeQuarantined: config.removeQuarantined || false
          }
        };
      
      case 'pypi':
        return {
          ...baseConfig,
          pypi: {
            removeQuarantined: config.removeQuarantined || false
          }
        };
      
      case 'raw':
        return {
          ...baseConfig,
          raw: {
            contentDisposition: config.contentDisposition || 'ATTACHMENT'
          }
        };
      
      default:
        return baseConfig;
    }
  }

  // [advice from AI] Phase 2: 아티팩트 업로드 (대용량 파일 지원)
  async uploadArtifact(repositoryName, artifactPath, filePath, options = {}) {
    try {
      console.log(`📤 아티팩트 업로드: ${artifactPath} → ${repositoryName}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
      }
      
      const fileStats = fs.statSync(filePath);
      if (fileStats.size > this.maxUploadSize) {
        throw new Error(`파일 크기가 제한을 초과합니다: ${fileStats.size} > ${this.maxUploadSize}`);
      }
      
      // FormData 생성
      const formData = new FormData();
      formData.append('raw.asset1', fs.createReadStream(filePath));
      formData.append('raw.asset1.filename', path.basename(artifactPath));
      
      if (options.directory) {
        formData.append('raw.directory', options.directory);
      }
      
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 업로드 정보 저장
      this.uploadQueue.set(uploadId, {
        repositoryName,
        artifactPath,
        filePath,
        fileSize: fileStats.size,
        startTime: Date.now(),
        status: 'uploading'
      });
      
      const response = await this.client.post(
        `/service/rest/v1/components?repository=${repositoryName}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Length': formData.getLengthSync()
          },
          onUploadProgress: (progressEvent) => {
            const progress = {
              uploadId,
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            };
            
            // 업로드 정보 업데이트
            const uploadInfo = this.uploadQueue.get(uploadId);
            if (uploadInfo) {
              uploadInfo.progress = progress;
              this.uploadQueue.set(uploadId, uploadInfo);
            }
            
            // 이벤트 발생
            this.emit('artifactUploadProgress', progress);
          }
        }
      );
      
      // 업로드 완료 처리
      const uploadInfo = this.uploadQueue.get(uploadId);
      if (uploadInfo) {
        uploadInfo.status = 'completed';
        uploadInfo.endTime = Date.now();
        uploadInfo.duration = uploadInfo.endTime - uploadInfo.startTime;
        this.uploadQueue.set(uploadId, uploadInfo);
      }
      
      console.log(`✅ 아티팩트 업로드 완료: ${artifactPath}`);
      return {
        success: true,
        uploadId,
        repositoryName,
        artifactPath,
        fileSize: fileStats.size,
        duration: uploadInfo?.duration || 0,
        downloadUrl: `${this.nexusURL}/repository/${repositoryName}/${artifactPath}`
      };
      
    } catch (error) {
      console.error(`❌ 아티팩트 업로드 실패: ${artifactPath}`, error.message);
      throw new Error(`아티팩트 업로드 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 아티팩트 다운로드
  async downloadArtifact(repositoryName, artifactPath, downloadPath = null) {
    try {
      console.log(`📥 아티팩트 다운로드: ${repositoryName}/${artifactPath}`);
      
      const response = await this.client.get(
        `/repository/${repositoryName}/${artifactPath}`,
        {
          responseType: 'stream'
        }
      );
      
      const finalDownloadPath = downloadPath || path.join(process.cwd(), 'downloads', path.basename(artifactPath));
      
      // 다운로드 디렉토리 생성
      const downloadDir = path.dirname(finalDownloadPath);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      // 파일 스트림 저장
      const writer = fs.createWriteStream(finalDownloadPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          const fileStats = fs.statSync(finalDownloadPath);
          
          // 다운로드 통계 업데이트
          const stats = this.downloadStats.get(repositoryName) || { count: 0, totalSize: 0 };
          stats.count++;
          stats.totalSize += fileStats.size;
          this.downloadStats.set(repositoryName, stats);
          
          console.log(`✅ 아티팩트 다운로드 완료: ${finalDownloadPath}`);
          resolve({
            success: true,
            repositoryName,
            artifactPath,
            downloadPath: finalDownloadPath,
            fileSize: fileStats.size
          });
        });
        
        writer.on('error', (error) => {
          console.error(`❌ 아티팩트 다운로드 실패: ${artifactPath}`, error.message);
          reject(new Error(`아티팩트 다운로드 실패: ${error.message}`));
        });
      });
      
    } catch (error) {
      console.error(`❌ 아티팩트 다운로드 실패: ${artifactPath}`, error.message);
      throw new Error(`아티팩트 다운로드 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 아티팩트 검색
  async searchArtifacts(query, options = {}) {
    try {
      console.log(`🔍 아티팩트 검색: ${query}`);
      
      const searchParams = new URLSearchParams({
        q: query,
        ...(options.repository && { repository: options.repository }),
        ...(options.format && { format: options.format }),
        ...(options.group && { group: options.group }),
        ...(options.name && { name: options.name }),
        ...(options.version && { version: options.version }),
        ...(options.sort && { sort: options.sort }),
        ...(options.direction && { direction: options.direction })
      });
      
      const response = await this.client.get(`/service/rest/v1/search?${searchParams}`);
      
      const artifacts = response.data.items?.map(item => ({
        id: item.id,
        repository: item.repository,
        format: item.format,
        group: item.group,
        name: item.name,
        version: item.version,
        assets: item.assets?.map(asset => ({
          id: asset.id,
          path: asset.path,
          downloadUrl: asset.downloadUrl,
          checksum: asset.checksum,
          contentType: asset.contentType,
          lastModified: asset.lastModified,
          blobCreated: asset.blobCreated,
          lastDownloaded: asset.lastDownloaded
        })) || []
      })) || [];
      
      console.log(`✅ 아티팩트 검색 완료: ${artifacts.length}개 발견`);
      return {
        success: true,
        query,
        count: artifacts.length,
        artifacts,
        continuationToken: response.data.continuationToken
      };
      
    } catch (error) {
      console.error(`❌ 아티팩트 검색 실패: ${query}`, error.message);
      throw new Error(`아티팩트 검색 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 아티팩트 삭제
  async deleteArtifact(repositoryName, artifactPath) {
    try {
      console.log(`🗑️ 아티팩트 삭제: ${repositoryName}/${artifactPath}`);
      
      // 먼저 아티팩트 검색으로 ID 찾기
      const searchResult = await this.searchArtifacts(path.basename(artifactPath), {
        repository: repositoryName
      });
      
      if (searchResult.count === 0) {
        throw new Error(`아티팩트를 찾을 수 없습니다: ${artifactPath}`);
      }
      
      // 첫 번째 매칭 아티팩트 삭제
      const artifact = searchResult.artifacts[0];
      await this.client.delete(`/service/rest/v1/components/${artifact.id}`);
      
      console.log(`✅ 아티팩트 삭제 완료: ${artifactPath}`);
      return {
        success: true,
        repositoryName,
        artifactPath,
        artifactId: artifact.id
      };
      
    } catch (error) {
      console.error(`❌ 아티팩트 삭제 실패: ${artifactPath}`, error.message);
      throw new Error(`아티팩트 삭제 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: Docker 이미지 관리
  async getDockerImages(repositoryName) {
    try {
      console.log(`🐳 Docker 이미지 목록 조회: ${repositoryName}`);
      
      const searchResult = await this.searchArtifacts('*', {
        repository: repositoryName,
        format: 'docker'
      });
      
      const dockerImages = searchResult.artifacts.map(artifact => {
        const imageName = artifact.name;
        const imageTag = artifact.version;
        const manifestAsset = artifact.assets.find(asset => asset.path.includes('manifest'));
        
        return {
          name: imageName,
          tag: imageTag,
          repository: repositoryName,
          fullName: `${this.dockerRegistry}/${imageName}:${imageTag}`,
          manifestPath: manifestAsset?.path,
          downloadUrl: manifestAsset?.downloadUrl,
          size: this.calculateImageSize(artifact.assets),
          lastModified: manifestAsset?.lastModified,
          lastDownloaded: manifestAsset?.lastDownloaded
        };
      });
      
      console.log(`✅ Docker 이미지 목록 조회 완료: ${dockerImages.length}개`);
      return {
        success: true,
        repositoryName,
        count: dockerImages.length,
        images: dockerImages
      };
      
    } catch (error) {
      console.error(`❌ Docker 이미지 목록 조회 실패: ${repositoryName}`, error.message);
      throw new Error(`Docker 이미지 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: Docker 이미지 크기 계산
  calculateImageSize(assets) {
    return assets.reduce((total, asset) => {
      // 대략적인 크기 계산 (실제로는 레이어별 계산 필요)
      if (asset.path.includes('layer') || asset.path.includes('blob')) {
        return total + (asset.size || 0);
      }
      return total;
    }, 0);
  }

  // [advice from AI] Phase 2: 저장소 통계 조회
  async getRepositoryStats(repositoryName) {
    try {
      console.log(`📊 저장소 통계 조회: ${repositoryName}`);
      
      // 저장소 정보 조회
      const repoResponse = await this.client.get(`/service/rest/v1/repositories/${repositoryName}`);
      const repository = repoResponse.data;
      
      // 아티팩트 검색으로 통계 수집
      const searchResult = await this.searchArtifacts('*', {
        repository: repositoryName
      });
      
      // 형식별 분류
      const formatStats = {};
      let totalSize = 0;
      
      searchResult.artifacts.forEach(artifact => {
        const format = artifact.format;
        if (!formatStats[format]) {
          formatStats[format] = { count: 0, size: 0 };
        }
        formatStats[format].count++;
        
        // 자산 크기 합계
        const artifactSize = artifact.assets.reduce((sum, asset) => sum + (asset.size || 0), 0);
        formatStats[format].size += artifactSize;
        totalSize += artifactSize;
      });
      
      // 다운로드 통계
      const downloadStats = this.downloadStats.get(repositoryName) || { count: 0, totalSize: 0 };
      
      const stats = {
        repository: {
          name: repositoryName,
          format: repository.format,
          type: repository.type,
          online: repository.online,
          url: repository.url
        },
        artifacts: {
          total: searchResult.count,
          totalSize,
          byFormat: formatStats
        },
        downloads: downloadStats,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`✅ 저장소 통계 조회 완료: ${repositoryName}`);
      return {
        success: true,
        stats
      };
      
    } catch (error) {
      console.error(`❌ 저장소 통계 조회 실패: ${repositoryName}`, error.message);
      throw new Error(`저장소 통계 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 저장소 정리 (오래된 아티팩트 삭제)
  async cleanupRepository(repositoryName, options = {}) {
    try {
      console.log(`🧹 저장소 정리 시작: ${repositoryName}`);
      
      const maxAge = options.maxAge || 30; // 30일
      const keepVersions = options.keepVersions || 5; // 최신 5개 버전 유지
      const dryRun = options.dryRun || false;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);
      
      // 오래된 아티팩트 검색
      const searchResult = await this.searchArtifacts('*', {
        repository: repositoryName
      });
      
      const artifactsToDelete = [];
      const artifactsByName = {};
      
      // 이름별로 그룹화
      searchResult.artifacts.forEach(artifact => {
        const key = `${artifact.group || ''}:${artifact.name}`;
        if (!artifactsByName[key]) {
          artifactsByName[key] = [];
        }
        artifactsByName[key].push(artifact);
      });
      
      // 각 그룹에서 정리 대상 선정
      Object.entries(artifactsByName).forEach(([name, artifacts]) => {
        // 버전별로 정렬 (최신 순)
        artifacts.sort((a, b) => new Date(b.assets[0]?.lastModified || 0) - new Date(a.assets[0]?.lastModified || 0));
        
        // 최신 버전들을 제외한 나머지 중 오래된 것들 선택
        const oldArtifacts = artifacts.slice(keepVersions).filter(artifact => {
          const lastModified = new Date(artifact.assets[0]?.lastModified || 0);
          return lastModified < cutoffDate;
        });
        
        artifactsToDelete.push(...oldArtifacts);
      });
      
      console.log(`🗑️ 정리 대상 아티팩트: ${artifactsToDelete.length}개`);
      
      if (!dryRun && artifactsToDelete.length > 0) {
        // 실제 삭제 수행
        const deletePromises = artifactsToDelete.map(artifact => 
          this.client.delete(`/service/rest/v1/components/${artifact.id}`)
            .then(() => ({ success: true, id: artifact.id, name: `${artifact.group}:${artifact.name}:${artifact.version}` }))
            .catch(error => ({ success: false, id: artifact.id, error: error.message }))
        );
        
        const results = await Promise.all(deletePromises);
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        console.log(`✅ 저장소 정리 완료: 성공 ${successCount}개, 실패 ${failureCount}개`);
        return {
          success: true,
          repositoryName,
          dryRun: false,
          deleted: successCount,
          failed: failureCount,
          results
        };
      } else {
        console.log(`ℹ️ 저장소 정리 시뮬레이션 완료 (dryRun: ${dryRun})`);
        return {
          success: true,
          repositoryName,
          dryRun: true,
          wouldDelete: artifactsToDelete.length,
          artifacts: artifactsToDelete.map(a => `${a.group}:${a.name}:${a.version}`)
        };
      }
      
    } catch (error) {
      console.error(`❌ 저장소 정리 실패: ${repositoryName}`, error.message);
      throw new Error(`저장소 정리 실패: ${error.message}`);
    }
  }

  // [advice from AI] Phase 2: 연결 테스트
  async testConnection() {
    try {
      console.log(`🔍 Nexus 연결 테스트: ${this.nexusURL}`);
      
      const healthResult = await this.healthCheck();
      if (!healthResult.success) {
        return {
          success: false,
          error: 'Nexus 서버 헬스 체크 실패',
          details: healthResult
        };
      }
      
      const reposResult = await this.listRepositories();
      const dockerRepos = reposResult.repositories.filter(repo => repo.format === 'docker');
      
      console.log('✅ Nexus 연결 테스트 성공');
      return {
        success: true,
        server: {
          url: this.nexusURL,
          version: healthResult.version,
          user: this.nexusUser,
          dockerRegistry: this.dockerRegistry
        },
        repositories: {
          total: reposResult.repositories.length,
          docker: dockerRepos.length,
          formats: [...new Set(reposResult.repositories.map(repo => repo.format))],
          list: reposResult.repositories.slice(0, 5).map(repo => ({
            name: repo.name,
            format: repo.format,
            type: repo.type,
            online: repo.online
          }))
        },
        features: {
          upload: true,
          download: true,
          search: true,
          cleanup: true,
          multiFormat: this.supportedFormats.length
        }
      };
      
    } catch (error) {
      console.error('❌ Nexus 연결 테스트 실패:', error.message);
      return {
        success: false,
        error: error.message,
        server: {
          url: this.nexusURL,
          user: this.nexusUser,
          dockerRegistry: this.dockerRegistry
        }
      };
    }
  }
}

module.exports = NexusIntegration;
