// [advice from AI] Git 서비스 팩토리
const GitHubService = require('./GitHubService');

class GitServiceFactory {
  constructor() {
    this.services = [
      new GitHubService()
      // 향후 GitLab, Bitbucket 등을 추가할 예정
    ];
  }

  /**
   * URL에서 Git 서비스를 감지하고 해당 서비스 인스턴스를 반환
   * @param {string} url - Git 레포지토리 URL
   * @returns {Object} - { service: GitService, type: string }
   */
  detectAndCreateService(url) {
    for (const service of this.services) {
      const type = service.detectService(url);
      if (type) {
        return { service, type };
      }
    }
    throw new Error('지원하지 않는 Git 서비스입니다. GitHub, GitLab, Bitbucket 등을 지원합니다.');
  }

  /**
   * 특정 서비스 타입의 인스턴스를 반환
   * @param {string} type - 서비스 타입 (github, gitlab, bitbucket 등)
   * @returns {GitService} - 해당 서비스 인스턴스
   */
  createService(type) {
    const service = this.services.find(s => s.detectService(`https://${type}.com/test/test`));
    if (!service) {
      throw new Error(`지원하지 않는 서비스 타입입니다: ${type}`);
    }
    return service;
  }

  /**
   * 지원하는 모든 서비스 타입 목록 반환
   * @returns {Array<string>} - 지원하는 서비스 타입 배열
   */
  getSupportedServices() {
    return this.services.map(service => {
      // 각 서비스의 detectService 메서드를 사용하여 타입 추출
      const testUrls = [
        'https://github.com/test/test',
        'https://gitlab.com/test/test',
        'https://bitbucket.org/test/test'
      ];
      
      for (const url of testUrls) {
        const type = service.detectService(url);
        if (type) return type;
      }
      return 'unknown';
    }).filter(type => type !== 'unknown');
  }

  /**
   * URL 유효성 검사
   * @param {string} url - 검사할 URL
   * @returns {boolean} - 유효한 URL인지 여부
   */
  isValidGitUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) && 
             urlObj.hostname.includes('.');
    } catch (error) {
      return false;
    }
  }

  /**
   * 레포지토리 URL 정규화
   * @param {string} url - 원본 URL
   * @returns {string} - 정규화된 URL
   */
  normalizeUrl(url) {
    try {
      // .git 접미사 제거
      let normalizedUrl = url.replace(/\.git$/, '');
      
      // 프로토콜 추가 (없는 경우)
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      
      return normalizedUrl;
    } catch (error) {
      throw new Error('유효하지 않은 URL 형식입니다.');
    }
  }
}

module.exports = GitServiceFactory;
