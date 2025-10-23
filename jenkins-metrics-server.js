const http = require('http');
const url = require('url');

let metrics = {
  jenkins_jobs_total: 0,
  jenkins_builds_total: 0,
  jenkins_builds_success: 0,
  jenkins_builds_failure: 0,
  jenkins_builds_in_progress: 0,
  jenkins_queue_size: 0,
  jenkins_executors_free: 2,
  jenkins_executors_busy: 0
};

// 메트릭 업데이트 함수
function updateMetrics() {
  metrics = {
    jenkins_jobs_total: Math.floor(Math.random() * 20) + 10,
    jenkins_builds_total: Math.floor(Math.random() * 1000) + 500,
    jenkins_builds_success: Math.floor(Math.random() * 800) + 400,
    jenkins_builds_failure: Math.floor(Math.random() * 100) + 50,
    jenkins_builds_in_progress: Math.floor(Math.random() * 5),
    jenkins_queue_size: Math.floor(Math.random() * 10),
    jenkins_executors_free: Math.floor(Math.random() * 3) + 1,
    jenkins_executors_busy: Math.floor(Math.random() * 2)
  };
}

setInterval(updateMetrics, 10000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/metrics') {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const prometheusMetrics = `
# HELP jenkins_jobs_total Total number of Jenkins jobs
# TYPE jenkins_jobs_total gauge
jenkins_jobs_total ${metrics.jenkins_jobs_total}

# HELP jenkins_builds_total Total number of Jenkins builds
# TYPE jenkins_builds_total counter
jenkins_builds_total ${metrics.jenkins_builds_total}

# HELP jenkins_builds_success Total number of successful builds
# TYPE jenkins_builds_success counter
jenkins_builds_success ${metrics.jenkins_builds_success}

# HELP jenkins_builds_failure Total number of failed builds
# TYPE jenkins_builds_failure counter
jenkins_builds_failure ${metrics.jenkins_builds_failure}

# HELP jenkins_builds_in_progress Number of builds currently in progress
# TYPE jenkins_builds_in_progress gauge
jenkins_builds_in_progress ${metrics.jenkins_builds_in_progress}

# HELP jenkins_queue_size Number of jobs in the build queue
# TYPE jenkins_queue_size gauge
jenkins_queue_size ${metrics.jenkins_queue_size}

# HELP jenkins_executors_free Number of free executors
# TYPE jenkins_executors_free gauge
jenkins_executors_free ${metrics.jenkins_executors_free}

# HELP jenkins_executors_busy Number of busy executors
# TYPE jenkins_executors_busy gauge
jenkins_executors_busy ${metrics.jenkins_executors_busy}

# HELP up Jenkins service availability
# TYPE up gauge
up{service="jenkins"} 1
`;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusMetrics);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(8081, '0.0.0.0', () => {
  console.log('Jenkins 메트릭 서버가 포트 8081에서 실행 중입니다.');
});
