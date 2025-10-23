// [advice from AI] GitHub 서비스 구현
const GitServiceInterface = require('./GitServiceInterface');

class GitHubService extends GitServiceInterface {
  constructor() {
    super();
    this.apiBaseUrl = 'https://api.github.com';
  }

  /**
   * GitHub URL 감지
   */
  detectService(url) {
    return url.includes('github.com') ? 'github' : null;
  }

  /**
   * GitHub URL 파싱
   */
  parseUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/);
    if (!match) {
      throw new Error('유효하지 않은 GitHub URL입니다.');
    }

    return {
      service: 'github',
      owner: match[1],
      repo: match[2],
      branch: 'main',
      url: url,
      apiBaseUrl: this.apiBaseUrl
    };
  }

  /**
   * API 헤더 생성
   */
  _getHeaders(token) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Timbel-CICD-Operator'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    return headers;
  }

  /**
   * 레포지토리 기본 정보 조회
   */
  async getRepositoryInfo(repositoryInfo, token) {
    try {
      const url = `${this.apiBaseUrl}/repos/${repositoryInfo.owner}/${repositoryInfo.repo}`;
      const response = await fetch(url, {
        headers: this._getHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`GitHub API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description || '',
        language: data.language || 'Unknown',
        stars: data.stargazers_count || 0,
        forks: data.forks_count || 0,
        watchers: data.watchers_count || 0,
        openIssues: data.open_issues_count || 0,
        lastUpdated: data.updated_at,
        cloneUrl: data.clone_url,
        webUrl: data.html_url,
        size: data.size,
        license: data.license?.name || null,
        topics: data.topics || [],
        isPrivate: data.private,
        hasWiki: data.has_wiki,
        hasPages: data.has_pages
      };
    } catch (error) {
      console.error('GitHub 레포지토리 정보 조회 실패:', error);
      throw new Error(`레포지토리 정보를 가져올 수 없습니다: ${error.message}`);
    }
  }

  /**
   * README 파일 내용 조회
   */
  async getReadmeContent(repositoryInfo, token) {
    try {
      const url = `${this.apiBaseUrl}/repos/${repositoryInfo.owner}/${repositoryInfo.repo}/readme`;
      const response = await fetch(url, {
        headers: this._getHeaders(token)
      });

      if (!response.ok) {
        if (response.status === 404) {
          return ''; // README가 없는 경우
        }
        throw new Error(`GitHub API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Base64로 인코딩된 내용을 디코딩
      if (data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return '';
    } catch (error) {
      console.error('GitHub README 조회 실패:', error);
      return ''; // README 조회 실패 시 빈 문자열 반환
    }
  }

  /**
   * 언어 통계 조회
   */
  async getLanguageStats(repositoryInfo, token) {
    try {
      const url = `${this.apiBaseUrl}/repos/${repositoryInfo.owner}/${repositoryInfo.repo}/languages`;
      const response = await fetch(url, {
        headers: this._getHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`GitHub API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const totalBytes = Object.values(data).reduce((sum, bytes) => sum + bytes, 0);
      
      return Object.entries(data).map(([language, bytes]) => ({
        language,
        bytes,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0
      })).sort((a, b) => b.bytes - a.bytes);
    } catch (error) {
      console.error('GitHub 언어 통계 조회 실패:', error);
      return [];
    }
  }

  /**
   * 의존성 정보 조회 (package.json, requirements.txt 등)
   */
  async getDependencies(repositoryInfo, token) {
    try {
      const dependencies = [];
      
      // package.json 조회
      try {
        const packageJson = await this.getFileContent(repositoryInfo, 'package.json', token);
        if (packageJson) {
          const pkg = JSON.parse(packageJson);
          dependencies.push({
            type: 'npm',
            dependencies: pkg.dependencies || {},
            devDependencies: pkg.devDependencies || {},
            scripts: pkg.scripts || {}
          });
        }
      } catch (error) {
        // package.json이 없는 경우 무시
      }

      // requirements.txt 조회
      try {
        const requirements = await this.getFileContent(repositoryInfo, 'requirements.txt', token);
        if (requirements) {
          dependencies.push({
            type: 'pip',
            dependencies: requirements.split('\n')
              .filter(line => line.trim() && !line.startsWith('#'))
              .map(line => line.trim())
          });
        }
      } catch (error) {
        // requirements.txt가 없는 경우 무시
      }

      // pom.xml 조회 (Java/Maven)
      try {
        const pomXml = await this.getFileContent(repositoryInfo, 'pom.xml', token);
        if (pomXml) {
          dependencies.push({
            type: 'maven',
            content: pomXml
          });
        }
      } catch (error) {
        // pom.xml이 없는 경우 무시
      }

      return dependencies;
    } catch (error) {
      console.error('GitHub 의존성 조회 실패:', error);
      return [];
    }
  }

  /**
   * 파일 내용 조회
   */
  async getFileContent(repositoryInfo, filePath, token) {
    try {
      const url = `${this.apiBaseUrl}/repos/${repositoryInfo.owner}/${repositoryInfo.repo}/contents/${filePath}`;
      const response = await fetch(url, {
        headers: this._getHeaders(token)
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // 파일이 없는 경우
        }
        throw new Error(`GitHub API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return null;
    } catch (error) {
      console.error(`GitHub 파일 조회 실패 (${filePath}):`, error);
      return null;
    }
  }

  /**
   * 브랜치 목록 조회
   */
  async getBranches(repositoryInfo, token) {
    try {
      const url = `${this.apiBaseUrl}/repos/${repositoryInfo.owner}/${repositoryInfo.repo}/branches`;
      const response = await fetch(url, {
        headers: this._getHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`GitHub API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.map(branch => ({
        name: branch.name,
        protected: branch.protected
      }));
    } catch (error) {
      console.error('GitHub 브랜치 조회 실패:', error);
      return [];
    }
  }
}

module.exports = GitHubService;
