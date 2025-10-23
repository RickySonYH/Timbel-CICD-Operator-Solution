const http = require('http');
const url = require('url');

let metrics = {
  harbor_projects_total: 0,
  harbor_repositories_total: 0,
  harbor_artifacts_total: 0,
  harbor_pull_requests_total: 0,
  harbor_push_requests_total: 0,
  harbor_storage_used_bytes: 0,
  harbor_storage_total_bytes: 0,
  harbor_users_total: 0,
  harbor_scanners_total: 0,
  harbor_replications_total: 0
};

// 메트릭 업데이트 함수
function updateMetrics() {
  metrics = {
    harbor_projects_total: Math.floor(Math.random() * 30) + 15,
    harbor_repositories_total: Math.floor(Math.random() * 200) + 100,
    harbor_artifacts_total: Math.floor(Math.random() * 5000) + 2000,
    harbor_pull_requests_total: Math.floor(Math.random() * 10000) + 5000,
    harbor_push_requests_total: Math.floor(Math.random() * 2000) + 1000,
    harbor_storage_used_bytes: Math.floor(Math.random() * 2000000000000) + 1000000000000,
    harbor_storage_total_bytes: 5000000000000,
    harbor_users_total: Math.floor(Math.random() * 200) + 100,
    harbor_scanners_total: Math.floor(Math.random() * 10) + 5,
    harbor_replications_total: Math.floor(Math.random() * 20) + 10
  };
}

setInterval(updateMetrics, 20000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/metrics') {
    const prometheusMetrics = `
# HELP harbor_projects_total Total number of Harbor projects
# TYPE harbor_projects_total gauge
harbor_projects_total ${metrics.harbor_projects_total}

# HELP harbor_repositories_total Total number of Harbor repositories
# TYPE harbor_repositories_total gauge
harbor_repositories_total ${metrics.harbor_repositories_total}

# HELP harbor_artifacts_total Total number of artifacts in Harbor
# TYPE harbor_artifacts_total gauge
harbor_artifacts_total ${metrics.harbor_artifacts_total}

# HELP harbor_pull_requests_total Total number of pull requests
# TYPE harbor_pull_requests_total counter
harbor_pull_requests_total ${metrics.harbor_pull_requests_total}

# HELP harbor_push_requests_total Total number of push requests
# TYPE harbor_push_requests_total counter
harbor_push_requests_total ${metrics.harbor_push_requests_total}

# HELP harbor_storage_used_bytes Storage used in bytes
# TYPE harbor_storage_used_bytes gauge
harbor_storage_used_bytes ${metrics.harbor_storage_used_bytes}

# HELP harbor_storage_total_bytes Total storage capacity in bytes
# TYPE harbor_storage_total_bytes gauge
harbor_storage_total_bytes ${metrics.harbor_storage_total_bytes}

# HELP harbor_users_total Total number of Harbor users
# TYPE harbor_users_total gauge
harbor_users_total ${metrics.harbor_users_total}

# HELP harbor_scanners_total Total number of vulnerability scanners
# TYPE harbor_scanners_total gauge
harbor_scanners_total ${metrics.harbor_scanners_total}

# HELP harbor_replications_total Total number of replication rules
# TYPE harbor_replications_total gauge
harbor_replications_total ${metrics.harbor_replications_total}

# HELP up Harbor service availability
# TYPE up gauge
up{service="harbor"} 1
`;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusMetrics);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(8084, '0.0.0.0', () => {
  console.log('Harbor 메트릭 서버가 포트 8084에서 실행 중입니다.');
});
