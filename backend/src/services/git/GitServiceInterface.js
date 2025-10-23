// [advice from AI] Git 서비스 인터페이스 정의
class GitServiceInterface {
  /**
   * URL에서 Git 서비스 타입을 감지합니다
   * @param {string} url - Git 레포지토리 URL
   * @returns {string|null} - 감지된 서비스 타입 또는 null
   */
  detectService(url) {
    throw new Error('detectService method must be implemented');
  }

  /**
   * URL을 파싱하여 레포지토리 정보를 추출합니다
   * @param {string} url - Git 레포지토리 URL
   * @returns {Object} - 레포지토리 정보 객체
   */
  parseUrl(url) {
    throw new Error('parseUrl method must be implemented');
  }

  /**
   * 레포지토리 기본 정보를 가져옵니다
   * @param {Object} repositoryInfo - 레포지토리 정보
   * @param {string} token - 액세스 토큰 (선택사항)
   * @returns {Promise<Object>} - 레포지토리 데이터
   */
  async getRepositoryInfo(repositoryInfo, token) {
    throw new Error('getRepositoryInfo method must be implemented');
  }

  /**
   * README 파일 내용을 가져옵니다
   * @param {Object} repositoryInfo - 레포지토리 정보
   * @param {string} token - 액세스 토큰 (선택사항)
   * @returns {Promise<string>} - README 내용
   */
  async getReadmeContent(repositoryInfo, token) {
    throw new Error('getReadmeContent method must be implemented');
  }

  /**
   * 언어 통계를 가져옵니다
   * @param {Object} repositoryInfo - 레포지토리 정보
   * @param {string} token - 액세스 토큰 (선택사항)
   * @returns {Promise<Array>} - 언어 통계 배열
   */
  async getLanguageStats(repositoryInfo, token) {
    throw new Error('getLanguageStats method must be implemented');
  }

  /**
   * 의존성 정보를 가져옵니다
   * @param {Object} repositoryInfo - 레포지토리 정보
   * @param {string} token - 액세스 토큰 (선택사항)
   * @returns {Promise<Array>} - 의존성 정보 배열
   */
  async getDependencies(repositoryInfo, token) {
    throw new Error('getDependencies method must be implemented');
  }

  /**
   * 파일 내용을 가져옵니다
   * @param {Object} repositoryInfo - 레포지토리 정보
   * @param {string} filePath - 파일 경로
   * @param {string} token - 액세스 토큰 (선택사항)
   * @returns {Promise<string>} - 파일 내용
   */
  async getFileContent(repositoryInfo, filePath, token) {
    throw new Error('getFileContent method must be implemented');
  }
}

module.exports = GitServiceInterface;
