// [advice from AI] CRACO 설정으로 source-map-loader 문제 해결
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // [advice from AI] source-map-loader 완전 제거
      webpackConfig.module.rules = webpackConfig.module.rules.map(rule => {
        if (rule.enforce === 'pre' && rule.test && rule.test.toString().includes('\\.(js|mjs|jsx|ts|tsx|css)$')) {
          // source-map-loader 규칙을 찾아서 비활성화
          rule.use = rule.use.filter(loader => {
            return !loader.loader || !loader.loader.includes('source-map-loader');
          });
        }
        return rule;
      });

      // [advice from AI] 소스맵 생성 완전 비활성화
      webpackConfig.devtool = false;
      
      // [advice from AI] 모듈 해결 설정 개선
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "path": false,
        "fs": false,
        "os": false
      };

      return webpackConfig;
    }
  },
  devServer: {
    // [advice from AI] 개발 서버 설정
    overlay: {
      warnings: false,
      errors: false
    }
  }
};
