module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // ESLint 플러그인 제거
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
      
      // WebSocket 관련 설정 완전 비활성화
      if (webpackConfig.devServer) {
        webpackConfig.devServer.client = {
          webSocketTransport: 'sockjs',
          webSocketURL: undefined
        };
        webpackConfig.devServer.hot = false;
        webpackConfig.devServer.liveReload = false;
      }
      
      return webpackConfig;
    }
  },
  devServer: {
    client: false, // 클라이언트 WebSocket 완전 비활성화
    hot: false,
    liveReload: false
  }
};