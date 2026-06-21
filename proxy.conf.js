module.exports = {
  '/api': {
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    configure: (proxy, _options) => {
      proxy.on('proxyReq', (proxyReq, _req, _res) => {
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      });
    }
  }
};
