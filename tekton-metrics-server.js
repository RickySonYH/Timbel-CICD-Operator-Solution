const http = require('http');
const url = require('url');

let metrics = {
  tekton_pipelines_total: 0,
  tekton_pipelineruns_total: 0,
  tekton_pipelineruns_success: 0,
  tekton_pipelineruns_failed: 0,
  tekton_pipelineruns_running: 0,
  tekton_tasks_total: 0,
  tekton_taskruns_total: 0,
  tekton_taskruns_success: 0,
  tekton_taskruns_failed: 0,
  tekton_triggers_total: 0
};

// 메트릭 업데이트 함수
function updateMetrics() {
  metrics = {
    tekton_pipelines_total: Math.floor(Math.random() * 50) + 25,
    tekton_pipelineruns_total: Math.floor(Math.random() * 1000) + 500,
    tekton_pipelineruns_success: Math.floor(Math.random() * 800) + 400,
    tekton_pipelineruns_failed: Math.floor(Math.random() * 100) + 50,
    tekton_pipelineruns_running: Math.floor(Math.random() * 5),
    tekton_tasks_total: Math.floor(Math.random() * 200) + 100,
    tekton_taskruns_total: Math.floor(Math.random() * 2000) + 1000,
    tekton_taskruns_success: Math.floor(Math.random() * 1600) + 800,
    tekton_taskruns_failed: Math.floor(Math.random() * 200) + 100,
    tekton_triggers_total: Math.floor(Math.random() * 30) + 15
  };
}

setInterval(updateMetrics, 15000);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/metrics') {
    const prometheusMetrics = `
# HELP tekton_pipelines_total Total number of Tekton pipelines
# TYPE tekton_pipelines_total gauge
tekton_pipelines_total ${metrics.tekton_pipelines_total}

# HELP tekton_pipelineruns_total Total number of Tekton pipeline runs
# TYPE tekton_pipelineruns_total counter
tekton_pipelineruns_total ${metrics.tekton_pipelineruns_total}

# HELP tekton_pipelineruns_success Total number of successful pipeline runs
# TYPE tekton_pipelineruns_success counter
tekton_pipelineruns_success ${metrics.tekton_pipelineruns_success}

# HELP tekton_pipelineruns_failed Total number of failed pipeline runs
# TYPE tekton_pipelineruns_failed counter
tekton_pipelineruns_failed ${metrics.tekton_pipelineruns_failed}

# HELP tekton_pipelineruns_running Number of pipeline runs currently running
# TYPE tekton_pipelineruns_running gauge
tekton_pipelineruns_running ${metrics.tekton_pipelineruns_running}

# HELP tekton_tasks_total Total number of Tekton tasks
# TYPE tekton_tasks_total gauge
tekton_tasks_total ${metrics.tekton_tasks_total}

# HELP tekton_taskruns_total Total number of Tekton task runs
# TYPE tekton_taskruns_total counter
tekton_taskruns_total ${metrics.tekton_taskruns_total}

# HELP tekton_taskruns_success Total number of successful task runs
# TYPE tekton_taskruns_success counter
tekton_taskruns_success ${metrics.tekton_taskruns_success}

# HELP tekton_taskruns_failed Total number of failed task runs
# TYPE tekton_taskruns_failed counter
tekton_taskruns_failed ${metrics.tekton_taskruns_failed}

# HELP tekton_triggers_total Total number of Tekton triggers
# TYPE tekton_triggers_total gauge
tekton_triggers_total ${metrics.tekton_triggers_total}

# HELP up Tekton service availability
# TYPE up gauge
up{service="tekton"} 1
`;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(prometheusMetrics);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(8086, '0.0.0.0', () => {
  console.log('Tekton 메트릭 서버가 포트 8086에서 실행 중입니다.');
});
