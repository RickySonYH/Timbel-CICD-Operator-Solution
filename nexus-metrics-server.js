const http = require('http');
const url = require('url');

let metrics = {
  nexus_repositories_total: 0,
  nexus_artifacts_total: 0,
  nexus_downloads_total: 0,
  nexus_uploads_total: 0,
  nexus_storage_used_bytes: 0,
  nexus_storage_total_bytes: 0,
  nexus_users_total: 0,
  nexus_groups_total: 0
};

// 메트릭 업데이트 함수
function updateMetrics() {
  metrics = {
    nexus_repositories_total: Math.floor(Math.random() * 50) + 20,
    nexus_artifacts_total: Math.floor(Math.random() * 10000) + 5000,
    nexus_downloads_total: Math.floor(Math.random() * 50000) + 10000,
    nexus_uploads_total: Math.floor(Math.random() * 1000) + 500,
    nexus_storage_used_bytes: Math.floor(Math.random() * 1000000000000) + 500000000000,
    nexus_storage_total_bytes: 2000000000000,
    nexus_users_total: Math.floor(Math.random() * 100) + 50,
    nexus_groups_total: Math.floor(Math.random() * 20) + 10
  };
}

setInterval(updateMetrics, 15000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/metrics') {
    const prometheusMetrics = `
# HELP nexus_repositories_total Total number of Nexus repositories
# TYPE nexus_repositories_total gauge
nexus_repositories_total ${metrics.nexus_repositories_total}

# HELP nexus_artifacts_total Total number of artifacts in Nexus
# TYPE nexus_artifacts_total gauge
nexus_artifacts_total ${metrics.nexus_artifacts_total}

# HELP nexus_downloads_total Total number of downloads from Nexus
# TYPE nexus_downloads_total counter
nexus_downloads_total ${metrics.nexus_downloads_total}

# HELP nexus_uploads_total Total number of uploads to Nexus
# TYPE nexus_uploads_total counter
nexus_uploads_total ${metrics.nexus_uploads_total}

# HELP nexus_storage_used_bytes Storage used in bytes
# TYPE nexus_storage_used_bytes gauge
nexus_storage_used_bytes ${metrics.nexus_storage_used_bytes}

# HELP nexus_storage_total_bytes Total storage capacity in bytes
# TYPE nexus_storage_total_bytes gauge
nexus_storage_total_bytes ${metrics.nexus_storage_total_bytes}

# HELP nexus_users_total Total number of Nexus users
# TYPE nexus_users_total gauge
nexus_users_total ${metrics.nexus_users_total}

# HELP nexus_groups_total Total number of Nexus groups
# TYPE nexus_groups_total gauge
nexus_groups_total ${metrics.nexus_groups_total}

# HELP up Nexus service availability
# TYPE up gauge
up{service="nexus"} 1
`;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusMetrics);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(8082, '0.0.0.0', () => {
  console.log('Nexus 메트릭 서버가 포트 8082에서 실행 중입니다.');
});
