const http = require('http');
const url = require('url');

let metrics = {
  gitlab_projects_total: 0,
  gitlab_pipelines_total: 0,
  gitlab_pipelines_success: 0,
  gitlab_pipelines_failed: 0,
  gitlab_pipelines_running: 0,
  gitlab_jobs_total: 0,
  gitlab_runners_total: 0,
  gitlab_runners_active: 0,
  gitlab_commits_total: 0,
  gitlab_merge_requests_total: 0
};

// 메트릭 업데이트 함수
function updateMetrics() {
  metrics = {
    gitlab_projects_total: Math.floor(Math.random() * 100) + 50,
    gitlab_pipelines_total: Math.floor(Math.random() * 2000) + 1000,
    gitlab_pipelines_success: Math.floor(Math.random() * 1600) + 800,
    gitlab_pipelines_failed: Math.floor(Math.random() * 200) + 100,
    gitlab_pipelines_running: Math.floor(Math.random() * 10),
    gitlab_jobs_total: Math.floor(Math.random() * 5000) + 2500,
    gitlab_runners_total: Math.floor(Math.random() * 20) + 10,
    gitlab_runners_active: Math.floor(Math.random() * 15) + 8,
    gitlab_commits_total: Math.floor(Math.random() * 10000) + 5000,
    gitlab_merge_requests_total: Math.floor(Math.random() * 500) + 250
  };
}

setInterval(updateMetrics, 12000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/metrics') {
    const prometheusMetrics = `
# HELP gitlab_projects_total Total number of GitLab projects
# TYPE gitlab_projects_total gauge
gitlab_projects_total ${metrics.gitlab_projects_total}

# HELP gitlab_pipelines_total Total number of GitLab pipelines
# TYPE gitlab_pipelines_total counter
gitlab_pipelines_total ${metrics.gitlab_pipelines_total}

# HELP gitlab_pipelines_success Total number of successful pipelines
# TYPE gitlab_pipelines_success counter
gitlab_pipelines_success ${metrics.gitlab_pipelines_success}

# HELP gitlab_pipelines_failed Total number of failed pipelines
# TYPE gitlab_pipelines_failed counter
gitlab_pipelines_failed ${metrics.gitlab_pipelines_failed}

# HELP gitlab_pipelines_running Number of pipelines currently running
# TYPE gitlab_pipelines_running gauge
gitlab_pipelines_running ${metrics.gitlab_pipelines_running}

# HELP gitlab_jobs_total Total number of GitLab jobs
# TYPE gitlab_jobs_total counter
gitlab_jobs_total ${metrics.gitlab_jobs_total}

# HELP gitlab_runners_total Total number of GitLab runners
# TYPE gitlab_runners_total gauge
gitlab_runners_total ${metrics.gitlab_runners_total}

# HELP gitlab_runners_active Number of active GitLab runners
# TYPE gitlab_runners_active gauge
gitlab_runners_active ${metrics.gitlab_runners_active}

# HELP gitlab_commits_total Total number of commits
# TYPE gitlab_commits_total counter
gitlab_commits_total ${metrics.gitlab_commits_total}

# HELP gitlab_merge_requests_total Total number of merge requests
# TYPE gitlab_merge_requests_total counter
gitlab_merge_requests_total ${metrics.gitlab_merge_requests_total}

# HELP up GitLab CI service availability
# TYPE up gauge
up{service="gitlab-ci"} 1
`;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusMetrics);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(8085, '0.0.0.0', () => {
  console.log('GitLab CI 메트릭 서버가 포트 8085에서 실행 중입니다.');
});
