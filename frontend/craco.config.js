module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      // ESLint 플러그인 제거
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
      
      // [advice from AI] 운영 환경 최적화
      if (env === 'production') {
        // 소스맵 비활성화
        webpackConfig.devtool = false;
        
        // 번들 크기 최적화
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
              },
              common: {
                minChunks: 2,
                chunks: 'all',
                enforce: true,
              },
            },
          },
        };
      }
      
      // [advice from AI] WebSocket 관련 설정 완전 비활성화 (모든 환경)
      if (webpackConfig.devServer) {
        webpackConfig.devServer.client = false;
        webpackConfig.devServer.hot = false;
        webpackConfig.devServer.liveReload = false;
        webpackConfig.devServer.webSocketServer = false;
      }
      
      // [advice from AI] webpack-dev-server 클라이언트 완전 제거
      webpackConfig.entry = webpackConfig.entry.filter(entry => 
        !entry.includes('webpack-dev-server/client') && 
        !entry.includes('webpack/hot/dev-server')
      );
      
      return webpackConfig;
    }
  },
  devServer: {
    client: false, // 클라이언트 WebSocket 완전 비활성화
    hot: false,
    liveReload: false,
    webSocketServer: false, // WebSocket 서버 완전 비활성화
    allowedHosts: 'all', // 모든 호스트 허용 (외부 접속 지원)
    // [advice from AI] WebSocket 완전 차단
    setupMiddlewares: (middlewares, devServer) => {
      // WebSocket 연결 요청을 차단
      devServer.app.use('/ws', (req, res) => {
        res.status(404).send('WebSocket disabled in production mode');
      });
      return middlewares;
    }
  }
};