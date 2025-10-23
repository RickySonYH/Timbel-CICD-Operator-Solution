// [advice from AI] 강화된 CICD 서버 관리 - 마법사 기반 서버/그룹/도메인 관리
import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, Alert, CircularProgress, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, TableHead,
  Paper, List, ListItem, ListItemText, Divider, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Stepper, Step, StepLabel, StepContent, Autocomplete
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import DomainSSLManager from '../../components/operations/DomainSSLManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CICDServerManagerEnhanced: React.FC = () => {
  const { token } = useJwtAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // CICD 서버 관리
  const [cicdServers, setCicdServers] = useState<any[]>([]);
  
  // 서버 추가 마법사
  const [serverWizard, setServerWizard] = useState(false);
  const [serverWizardStep, setServerWizardStep] = useState(0);
  const [serverWizardData, setServerWizardData] = useState({
    server_name: '',
    server_type: 'jenkins',
    location_type: 'internal',
    internal_url: '',
    external_url: '',
    ingress_hostname: '',
    port_number: 8080,
    ssl_enabled: true,
    auth_type: 'basic',
    auth_username: 'admin',
    auth_password: '',
    description: ''
  });
  
  // 파이프라인 설정 및 실행 관리
  const [pipelineConfigDialog, setPipelineConfigDialog] = useState(false);
  const [pipelineRunDialog, setPipelineRunDialog] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<any>(null);
  const [pipelineConfig, setPipelineConfig] = useState<any>({
    stages: [],
    triggers: [],
    notifications: [],
    environments: []
  });
  const [pipelineRunData, setPipelineRunData] = useState<any>({
    repository: '',
    branch: '',
    environment: '',
    version: '',
    skipTests: false,
    forceDeploy: false
  });
  const [configTabValue, setConfigTabValue] = useState(0);

  // 서버 설정 관리
  const [serverConfigDialog, setServerConfigDialog] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [serverConfig, setServerConfig] = useState<any>({
    server_name: '',
    server_type: '',
    server_url: '',
    auth_type: 'basic',
    auth_username: '',
    auth_password: '',
    description: '',
    health_check_interval: 30,
    timeout: 30,
    retry_count: 3,
    notification_enabled: true,
    notification_channels: ['email', 'slack']
  });

  // 파이프라인 그룹 관리
  const [pipelineGroups, setPipelineGroups] = useState<any[]>([
    {
      id: 'ecp-ai-pipeline',
      group_name: 'ECP-AI Orchestrator Pipeline',
      group_type: 'project_based',
      execution_strategy: 'sequential',
      description: 'ECP-AI 오케스트레이터 프로젝트의 전체 배포 파이프라인',
      priority_level: 5,
      auto_trigger_enabled: true,
      failure_strategy: 'stop',
      max_retry_attempts: 3,
      notification_channels: ['slack', 'email'],
      pe_notification_enabled: true,
      components_count: 4,
      success_rate: 95,
      last_execution: '2024-01-15T10:30:00Z',
      status: 'active',
      stages: [
        {
          name: 'Build & Test',
          type: 'jenkins',
          status: 'success',
          duration: '5m 30s',
          details: {
            job_name: 'ecp-ai-build-test',
            jenkins_url: 'http://jenkins.rdc.rickyson.com',
            build_number: 142,
            test_results: {
              total: 45,
              passed: 44,
              failed: 1,
              coverage: '87%'
            }
          }
        },
        {
          name: 'Package & Push',
          type: 'nexus',
          status: 'success',
          duration: '2m 15s',
          details: {
            repository: 'maven-releases',
            nexus_url: 'http://nexus.rdc.rickyson.com',
            artifact_id: 'ecp-ai-orchestrator',
            version: '1.2.3',
            group_id: 'com.ecpai.orchestrator'
          }
        },
        {
          name: 'Deploy to Staging',
          type: 'argocd',
          status: 'success',
          duration: '3m 45s',
          details: {
            application_name: 'ecp-ai-staging',
            argocd_url: 'http://argocd.rdc.rickyson.com',
            namespace: 'ecp-ai-staging',
            sync_status: 'Synced',
            health_status: 'Healthy',
            target_revision: 'v1.2.3'
          }
        },
        {
          name: 'Deploy to Production',
          type: 'argocd',
          status: 'success',
          duration: '4m 20s',
          details: {
            application_name: 'ecp-ai-production',
            argocd_url: 'http://argocd.rdc.rickyson.com',
            namespace: 'ecp-ai-production',
            sync_status: 'Synced',
            health_status: 'Healthy',
            target_revision: 'v1.2.3'
          }
        }
      ]
    },
    {
      id: 'microservice-pipeline',
      group_name: 'Microservice Deployment Pipeline',
      group_type: 'service_based',
      execution_strategy: 'parallel',
      description: '마이크로서비스들의 병렬 배포 파이프라인',
      priority_level: 4,
      auto_trigger_enabled: true,
      failure_strategy: 'continue',
      max_retry_attempts: 2,
      notification_channels: ['slack'],
      pe_notification_enabled: true,
      components_count: 3,
      success_rate: 88,
      last_execution: '2024-01-15T09:15:00Z',
      status: 'active',
      stages: [
        {
          name: 'API Gateway Build',
          type: 'jenkins',
          status: 'success',
          duration: '3m 20s',
          details: {
            job_name: 'api-gateway-build',
            jenkins_url: 'http://jenkins.rdc.rickyson.com',
            build_number: 89
          }
        },
        {
          name: 'User Service Build',
          type: 'jenkins',
          status: 'success',
          duration: '2m 45s',
          details: {
            job_name: 'user-service-build',
            jenkins_url: 'http://jenkins.rdc.rickyson.com',
            build_number: 156
          }
        },
        {
          name: 'Notification Service Build',
          type: 'jenkins',
          status: 'success',
          duration: '2m 10s',
          details: {
            job_name: 'notification-service-build',
            jenkins_url: 'http://jenkins.rdc.rickyson.com',
            build_number: 78
          }
        }
      ]
    }
  ]);
  const [groupWizard, setGroupWizard] = useState(false);
  const [groupWizardStep, setGroupWizardStep] = useState(0);
  const [groupWizardData, setGroupWizardData] = useState({
    group_name: '',
    group_type: 'project_based',
    execution_strategy: 'sequential',
    description: '',
    priority_level: 5,
    auto_trigger_enabled: true,
    failure_strategy: 'stop',
    max_retry_attempts: 3,
    notification_channels: [] as string[],
    pe_notification_enabled: true
  });
  
  // 클러스터 관리
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState('');

  // 도메인 관리
  const [domains, setDomains] = useState<any[]>([]);
  const [domainWizard, setDomainWizard] = useState(false);
  const [domainWizardStep, setDomainWizardStep] = useState(0);
  const [domainWizardData, setDomainWizardData] = useState({
    domain_name: '',
    subdomain: '',
    target_service_name: '',
    target_port: 80,
    ssl_enabled: true,
    cert_issuer: 'letsencrypt-prod',
    cluster_id: 'development',
    custom_annotations: {}
  });
  
  // 사용 가능한 Ingress 도메인 목록
  const [availableDomains, setAvailableDomains] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      loadData();
      loadAvailableDomains();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출 (등록된 CICD 서버 목록, 클러스터 정보)
      const [serversRes, groupsRes, domainsRes, clustersRes] = await Promise.all([
        fetch('/api/operations/servers/servers', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/jenkins/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/knowledge/domains', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/clusters/statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // 실제 API 응답 처리 (실패 시 빈 배열 사용)
      const serversData = serversRes.ok ? await serversRes.json() : { success: false, data: [] };
      const groupsData = groupsRes.ok ? await groupsRes.json() : { success: false, data: [] };
      const domainsData = domainsRes.ok ? await domainsRes.json() : { success: false, data: [] };
      const clustersData = clustersRes.ok ? await clustersRes.json() : { success: false, clusters: [] };

      if (serversData.success) {
        // 등록된 CICD 서버 목록을 표시용 데이터로 변환
        const transformedServers = (serversData.servers || []).map(server => ({
          id: server.id,
          server_name: server.server_name || server.name || server.id,
          server_type: server.server_type || server.id,
          location_type: 'internal',
          ingress_hostname: server.server_url ? server.server_url.replace('http://', '').replace('https://', '') : 'localhost',
          health_status: server.status === 'active' ? 'healthy' : 'unhealthy',
          status: server.status,
          endpoint_url: server.server_url || server.url || '',
          version: server.version,
          description: server.description,
          enabled: server.enabled,
          // 서버별 특수 정보
          ...(server.id === 'jenkins' && {
            jobsCount: server.jobsCount || 0,
            mode: server.mode || 'NORMAL'
          }),
          ...(server.id === 'nexus' && {
            repositoriesCount: server.repositoriesCount || 0,
            repositories: server.repositories || []
          }),
          ...(server.id === 'argocd' && {
            applicationsCount: server.applicationsCount || 0,
            clusterType: server.clusterType || 'Unknown'
          })
        }));
        setCicdServers(transformedServers);
      } else {
        // 기본 데이터 사용 (등록된 서버가 없는 경우)
        setCicdServers([]);
      }

      if (groupsData.success) {
        // Jenkins Job 데이터를 파이프라인 그룹 형태로 변환
        const transformedGroups = (groupsData.jobs || []).map(job => ({
          id: job.id,
          group_name: job.job_name,
          group_type: 'repository_based',
          execution_strategy: 'sequential',
          description: `Jenkins Job: ${job.repository_url}`,
          status: job.status,
          repository_url: job.repository_url,
          jenkins_url: job.jenkins_url,
          created_at: job.created_at
        }));
        // Jenkins Jobs와 샘플 파이프라인을 합침
        setPipelineGroups([...pipelineGroups, ...transformedGroups]);
      } else {
        // Jenkins Jobs가 없어도 샘플 파이프라인은 유지
        console.log('Jenkins Jobs 로드 실패, 샘플 파이프라인 유지');
      }

      if (domainsData.success) {
        // 지식자원 도메인 데이터를 Ingress 도메인 형태로 변환
        const transformedDomains = (domainsData.domains || []).map(domain => ({
          id: domain.id,
          domain_name: (domain.name || domain.title || 'default').toLowerCase().replace(/\s+/g, '-'),
          subdomain: 'app',
          target_service_name: domain.name || domain.title || 'default',
          target_port: 80,
          ssl_enabled: true,
          business_area: domain.business_area || 'general',
          region: domain.region || 'default',
          priority_level: domain.priority_level || 1
        }));
        setDomains(transformedDomains);
      } else {
        setDomains([]);
      }

      // 실제 클러스터 정보 처리
      if (clustersData.success && clustersData.clusters) {
        const transformedClusters = clustersData.clusters.map((cluster: any) => ({
          id: cluster.cluster_id || cluster.id,
          name: cluster.cluster_name || cluster.name,
          domain: cluster.domain || `${(cluster.cluster_name || cluster.name || 'default').toLowerCase()}.company.com`,
          nginx_ingress_url: cluster.nginx_ingress_url || `http://nginx-ingress.${(cluster.cluster_name || cluster.name || 'default').toLowerCase()}.company.com`,
          ssl_enabled: cluster.ssl_enabled !== false,
          cert_issuer: cluster.cert_issuer || ((cluster.cluster_name || cluster.name || '').toLowerCase() === 'production' ? 'letsencrypt-prod' : 'letsencrypt-staging'),
          status: cluster.status || 'active',
          node_count: cluster.node_count || 0,
          total_cpu_cores: cluster.total_cpu_cores || 0,
          total_memory_gb: cluster.total_memory_gb || 0
        }));
        setClusters(transformedClusters);
        
        // 첫 번째 클러스터를 기본 선택으로 설정
        if (transformedClusters.length > 0 && !selectedCluster) {
          setSelectedCluster(transformedClusters[0].id);
        }
      } else {
        setClusters([]);
      }

    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 서버 타입별 정보 반환 함수
  const getServerTypeInfo = (serverType: string) => {
    const serverTypes = {
      'jenkins': { color: 'primary', description: 'CI/CD 파이프라인 자동화', category: 'CI' },
      'nexus': { color: 'secondary', description: '아티팩트 저장소 관리', category: 'Artifact Management' },
      'harbor': { color: 'info', description: '컨테이너 레지스트리', category: 'Artifact Management' },
      'argocd': { color: 'success', description: 'GitOps 배포 자동화', category: 'GitOps/CD' },
      'fluxcd': { color: 'warning', description: '경량 GitOps 도구', category: 'GitOps/CD' },
      'spinnaker': { color: 'error', description: '멀티 클라우드 배포', category: 'GitOps/CD' },
      'github-actions': { color: 'primary', description: 'GitHub 통합 CI/CD', category: 'CI' },
      'gitlab-ci': { color: 'secondary', description: '통합 DevOps 플랫폼', category: 'CI' },
      'tekton': { color: 'info', description: 'Kubernetes 네이티브 CI/CD', category: 'CI' },
      'jfrog-artifactory': { color: 'success', description: '엔터프라이즈 아티팩트 관리', category: 'Artifact Management' },
      'grafana': { color: 'warning', description: '모니터링 대시보드', category: 'Monitoring' },
      'prometheus': { color: 'error', description: '메트릭 수집 및 알림', category: 'Monitoring' },
      'custom': { color: 'default', description: '커스텀 서버', category: 'Custom' }
    };
    return serverTypes[serverType as keyof typeof serverTypes] || { color: 'default', description: '알 수 없는 서버', category: 'Unknown' };
  };

  const loadAvailableDomains = async () => {
    try {
      const response = await fetch('/api/ingress/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailableDomains(result.data);
        }
      } else {
        // 샘플 데이터
        setAvailableDomains([
          { domain_name: 'jenkins.rdc.rickyson.com', subdomain: 'jenkins' },
          { domain_name: 'nexus.rdc.rickyson.com', subdomain: 'nexus' },
          { domain_name: 'argocd.rdc.rickyson.com', subdomain: 'argocd' },
          { domain_name: 'grafana.rdc.rickyson.com', subdomain: 'grafana' },
          { domain_name: 'prometheus.rdc.rickyson.com', subdomain: 'prometheus' }
        ]);
      }
    } catch (error) {
      console.error('도메인 목록 로드 실패:', error);
    }
  };

  // 서버 추가 마법사 단계
  const serverWizardSteps = [
    { label: '서버 정보', description: '서버 이름과 타입을 설정하세요' },
    { label: '연결 설정', description: '서버 위치와 접속 정보를 구성하세요' },
    { label: '인증 설정', description: '보안 인증 방식을 설정하세요' },
    { label: '최종 확인', description: '설정을 검토하고 서버를 등록하세요' }
  ];

  // 파이프라인 그룹 마법사 단계
  const groupWizardSteps = [
    { label: '그룹 정보', description: '파이프라인 그룹의 기본 정보를 설정하세요' },
    { label: '실행 전략', description: '빌드 실행 방식과 우선순위를 구성하세요' },
    { label: '실패 처리', description: '빌드 실패 시 대응 방식을 설정하세요' },
    { label: '알림 설정', description: '빌드 결과 알림 방식을 구성하세요' },
    { label: '최종 확인', description: '설정을 검토하고 그룹을 생성하세요' }
  ];

  // 도메인 추가 마법사 단계
  const domainWizardSteps = [
    { label: '도메인 정보', description: '도메인명과 서브도메인을 설정하세요' },
    { label: '서비스 연결', description: '대상 서비스와 포트를 지정하세요' },
    { label: 'SSL 설정', description: 'SSL 인증서와 보안 설정을 구성하세요' },
    { label: '최종 확인', description: '설정을 검토하고 도메인을 추가하세요' }
  ];

  const handleCreateServer = async () => {
    try {
      console.log('🖥️ 서버 생성:', serverWizardData);
      
      const response = await fetch('/api/cicd/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serverWizardData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ CICD 서버가 성공적으로 등록되었습니다!');
        setServerWizard(false);
        setServerWizardStep(0);
        loadData();
      } else {
        alert(`❌ 서버 등록 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('서버 생성 실패:', error);
    }
  };

  // 서버 설정 열기
  const handleServerConfig = (server: any) => {
    setSelectedServer(server);
    setServerConfig({
      server_name: server.server_name || '',
      server_type: server.server_type || '',
      server_url: server.server_url || '',
      auth_type: server.auth_type || 'basic',
      auth_username: server.auth_username || '',
      auth_password: '', // 보안상 비밀번호는 비워둠
      description: server.description || '',
      health_check_interval: server.health_check_interval || 30,
      timeout: server.timeout || 30,
      retry_count: server.retry_count || 3,
      notification_enabled: server.notification_enabled !== false,
      notification_channels: server.notification_channels || ['email', 'slack']
    });
    setServerConfigDialog(true);
  };

  // 서버 설정 저장
  const handleServerConfigSave = async () => {
    try {
      const { token: authToken } = useJwtAuthStore.getState();
      
      const response = await fetch('/api/operations/servers/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          server_id: selectedServer.id,
          ...serverConfig
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ 서버 설정이 성공적으로 저장되었습니다!');
        setServerConfigDialog(false);
        loadData();
      } else {
        alert(`❌ 서버 설정 저장 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('서버 설정 저장 실패:', error);
      alert('❌ 서버 설정 저장 중 오류가 발생했습니다.');
    }
  };

  // 파이프라인 설정 열기

  // 파이프라인 설정 열기
  const handlePipelineConfig = (pipeline: any) => {
    setSelectedPipeline(pipeline);
    setPipelineConfig({
      stages: pipeline.stages || [],
      triggers: [
        { type: 'git_push', enabled: true, branch: 'main' },
        { type: 'schedule', enabled: false, cron: '0 2 * * *' },
        { type: 'manual', enabled: true }
      ],
      notifications: [
        { type: 'slack', enabled: true, channel: '#deployments' },
        { type: 'email', enabled: true, recipients: ['devops@company.com'] }
      ],
      environments: [
        { name: 'staging', auto_deploy: true, approval_required: false, cluster_id: 'staging' },
        { name: 'production', auto_deploy: false, approval_required: true, cluster_id: 'production' },
        { name: 'development', auto_deploy: true, approval_required: false, cluster_id: 'development' }
      ]
    });
    setPipelineConfigDialog(true);
  };

  // 파이프라인 실행 열기
  const handlePipelineRun = (pipeline: any) => {
    setSelectedPipeline(pipeline);
    setPipelineRunDialog(true);
  };

  // 파이프라인 실행
  const handleExecutePipeline = async (runData: any) => {
    try {
      setLoading(true);
      
      const selectedClusterInfo = clusters.find(c => c.id === runData.cluster_id);
      
      const executionData = {
        pipeline_id: selectedPipeline.id,
        repository: runData.repository,
        branch: runData.branch,
        environment: runData.environment,
        cluster_id: runData.cluster_id,
        cluster_info: selectedClusterInfo,
        version: runData.version,
        auto_deploy: runData.autoDeploy,
        parameters: {
          skipTests: runData.skipTests,
          forceDeploy: runData.forceDeploy
        }
      };

      const response = await fetch('/api/operations/pipeline/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(executionData)
      });

      if (response.ok) {
        setPipelineRunDialog(false);
        await loadData(); // 파이프라인 상태 업데이트
        alert('✅ 파이프라인이 실행되었습니다!');
      }
    } catch (error) {
      console.error('파이프라인 실행 실패:', error);
      alert('❌ 파이프라인 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      console.log('👥 그룹 생성:', groupWizardData);
      
      const response = await fetch('/api/cicd/pipeline-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(groupWizardData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ 파이프라인 그룹이 성공적으로 생성되었습니다!');
        setGroupWizard(false);
        setGroupWizardStep(0);
        loadData();
      } else {
        alert(`❌ 그룹 생성 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('그룹 생성 실패:', error);
      alert('❌ 그룹 생성 중 오류가 발생했습니다.');
    }
  };

  const handleCreateDomain = async () => {
    try {
      console.log('🌐 도메인 생성:', domainWizardData);
      
      const response = await fetch('/api/ingress/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(domainWizardData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ 도메인이 성공적으로 추가되었습니다!');
        setDomainWizard(false);
        setDomainWizardStep(0);
        loadData();
        loadAvailableDomains();
      } else {
        alert(`❌ 도메인 추가 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('도메인 생성 실패:', error);
      alert('❌ 도메인 추가 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          CI/CD 서버 설정
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Jenkins, Nexus, ArgoCD 서버 연결 설정 및 상태 관리
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          📋 <strong>파이프라인 관리</strong>는 "파이프라인 관리" 메뉴에서 이용하실 수 있습니다.
        </Alert>
      </Box>

      {/* 탭 네비게이션 - 파이프라인 그룹 탭 제거 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="서버 관리" />
          <Tab label="도메인 & SSL" />
        </Tabs>
      </Paper>

      {/* TAB 1: CICD 서버 관리 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            CICD 서버 목록
          </Typography>
          <Button 
            variant="contained" 
           
            onClick={() => setServerWizard(true)}
          >
            서버 추가 마법사
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>서버명</TableCell>
                <TableCell>타입</TableCell>
                <TableCell>위치</TableCell>
                <TableCell>도메인</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>헬스</TableCell>
                <TableCell>액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cicdServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>{server.server_name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        label={server.server_type.toUpperCase()} 
                        color={getServerTypeInfo(server.server_type).color as any} 
                        size="small" 
                      />
                      <Typography variant="caption" color="text.secondary">
                        {getServerTypeInfo(server.server_type).category}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={server.location_type} 
                      color={server.location_type === 'internal' ? 'success' : 'warning'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => window.open(`https://${server.ingress_hostname}`, '_blank')}
                    >
                      {server.ingress_hostname}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={server.status} 
                      color={server.status === 'active' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={server.health_status} 
                      color={
                        server.health_status === 'healthy' ? 'success' :
                        server.health_status === 'unhealthy' ? 'error' : 'default'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleServerConfig(server)}
                    >
                      설정
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TAB 2: 도메인 & SSL 관리 (이전 인덱스 2에서 1로 변경) */}
      <TabPanel value={tabValue} index={1}>
        <DomainSSLManager />
      </TabPanel>

      {/* [advice from AI] 서버 추가 마법사 다이얼로그 - 복구 */}
      <Dialog open={serverWizard} onClose={() => setServerWizard(false)} maxWidth="md" fullWidth>
        <DialogTitle>CICD 서버 추가 마법사</DialogTitle>
        <DialogContent>
          <Stepper activeStep={serverWizardStep} orientation="vertical">
            {serverWizardSteps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  <Box sx={{ mt: 2 }}>
                    {index === 0 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="서버 이름"
                            value={serverWizardData.server_name}
                            onChange={(e) => setServerWizardData({...serverWizardData, server_name: e.target.value})}
                            placeholder="예: Jenkins-Production"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>서버 타입</InputLabel>
                            <Select
                              value={serverWizardData.server_type}
                              label="서버 타입"
                              onChange={(e) => setServerWizardData({...serverWizardData, server_type: e.target.value})}
                            >
                              <MenuItem value="jenkins">Jenkins CI</MenuItem>
                              <MenuItem value="nexus">Nexus Repository</MenuItem>
                              <MenuItem value="argocd">Argo CD</MenuItem>
                              <MenuItem value="gitlab">GitLab CI/CD</MenuItem>
                              <MenuItem value="github_actions">GitHub Actions</MenuItem>
                              <MenuItem value="azure_devops">Azure DevOps</MenuItem>
                              <MenuItem value="teamcity">TeamCity</MenuItem>
                              <MenuItem value="circleci">CircleCI</MenuItem>
                              <MenuItem value="sonarqube">SonarQube</MenuItem>
                              <MenuItem value="harbor">Harbor Registry</MenuItem>
                              <MenuItem value="docker_registry">Docker Registry</MenuItem>
                              <MenuItem value="grafana">Grafana</MenuItem>
                              <MenuItem value="prometheus">Prometheus</MenuItem>
                              <MenuItem value="selenium">Selenium Grid</MenuItem>
                              <MenuItem value="webhook">Webhook Service</MenuItem>
                              <MenuItem value="kubernetes">Kubernetes Cluster</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    )}
                    
                    {index === 1 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>위치 타입</InputLabel>
                            <Select
                              value={serverWizardData.location_type}
                              label="위치 타입"
                              onChange={(e) => setServerWizardData({...serverWizardData, location_type: e.target.value})}
                            >
                              <MenuItem value="internal">내부 서버</MenuItem>
                              <MenuItem value="external">외부 서버</MenuItem>
                              <MenuItem value="cloud">클라우드 서비스</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="포트 번호"
                            type="number"
                            value={serverWizardData.port_number}
                            onChange={(e) => setServerWizardData({...serverWizardData, port_number: parseInt(e.target.value)})}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="내부 URL"
                            value={serverWizardData.internal_url}
                            onChange={(e) => setServerWizardData({...serverWizardData, internal_url: e.target.value})}
                            placeholder="예: http://jenkins.internal.com:8080"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="외부 URL (선택사항)"
                            value={serverWizardData.external_url}
                            onChange={(e) => setServerWizardData({...serverWizardData, external_url: e.target.value})}
                            placeholder="예: https://jenkins.company.com"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Ingress 호스트명 (선택사항)"
                            value={serverWizardData.ingress_hostname}
                            onChange={(e) => setServerWizardData({...serverWizardData, ingress_hostname: e.target.value})}
                            placeholder="예: jenkins.company.com"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={serverWizardData.ssl_enabled}
                                onChange={(e) => setServerWizardData({...serverWizardData, ssl_enabled: e.target.checked})}
                              />
                            }
                            label="SSL 활성화"
                          />
                        </Grid>
                      </Grid>
                    )}
                    
                    {index === 2 && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>인증 타입</InputLabel>
                            <Select
                              value={serverWizardData.auth_type}
                              label="인증 타입"
                              onChange={(e) => setServerWizardData({...serverWizardData, auth_type: e.target.value})}
                            >
                              <MenuItem value="basic">Basic Auth</MenuItem>
                              <MenuItem value="token">API Token</MenuItem>
                              <MenuItem value="oauth">OAuth</MenuItem>
                              <MenuItem value="none">인증 없음</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="사용자명"
                            value={serverWizardData.auth_username}
                            onChange={(e) => setServerWizardData({...serverWizardData, auth_username: e.target.value})}
                            disabled={serverWizardData.auth_type === 'none'}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="비밀번호/토큰"
                            type="password"
                            value={serverWizardData.auth_password}
                            onChange={(e) => setServerWizardData({...serverWizardData, auth_password: e.target.value})}
                            disabled={serverWizardData.auth_type === 'none'}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="설명 (선택사항)"
                            value={serverWizardData.description}
                            onChange={(e) => setServerWizardData({...serverWizardData, description: e.target.value})}
                            placeholder="이 서버에 대한 간단한 설명을 입력하세요"
                          />
                        </Grid>
                      </Grid>
                    )}
                    
                    {index === 3 && (
                      <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          설정을 확인하고 서버를 등록하세요. 등록 후에도 수정이 가능합니다.
                        </Alert>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                서버 정보
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemText 
                                    primary="서버 이름" 
                                    secondary={serverWizardData.server_name || '-'} 
                                  />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                  <ListItemText 
                                    primary="서버 타입" 
                                    secondary={serverWizardData.server_type || '-'} 
                                  />
                                </ListItem>
                              </List>
                            </Paper>
                          </Grid>
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                연결 설정
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemText 
                                    primary="위치 타입" 
                                    secondary={serverWizardData.location_type || '-'} 
                                  />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                  <ListItemText 
                                    primary="내부 URL" 
                                    secondary={serverWizardData.internal_url || '-'} 
                                  />
                                </ListItem>
                                {serverWizardData.external_url && (
                                  <>
                                    <Divider />
                                    <ListItem>
                                      <ListItemText 
                                        primary="외부 URL" 
                                        secondary={serverWizardData.external_url} 
                                      />
                                    </ListItem>
                                  </>
                                )}
                                <Divider />
                                <ListItem>
                                  <ListItemText 
                                    primary="포트" 
                                    secondary={serverWizardData.port_number} 
                                  />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                  <ListItemText 
                                    primary="SSL" 
                                    secondary={serverWizardData.ssl_enabled ? '활성화' : '비활성화'} 
                                  />
                                </ListItem>
                              </List>
                            </Paper>
                          </Grid>
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                인증 설정
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemText 
                                    primary="인증 타입" 
                                    secondary={serverWizardData.auth_type || '-'} 
                                  />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                  <ListItemText 
                                    primary="사용자명" 
                                    secondary={serverWizardData.auth_username || '-'} 
                                  />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                  <ListItemText 
                                    primary="비밀번호/토큰" 
                                    secondary={serverWizardData.auth_password ? '••••••••' : '-'} 
                                  />
                                </ListItem>
                              </List>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                    
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (index === serverWizardSteps.length - 1) {
                            handleServerWizardSave();
                          } else {
                            setServerWizardStep(index + 1);
                          }
                        }}
                        sx={{ mr: 1 }}
                        disabled={
                          (index === 0 && (!serverWizardData.server_name || !serverWizardData.server_type)) ||
                          (index === 1 && !serverWizardData.internal_url)
                        }
                      >
                        {index === serverWizardSteps.length - 1 ? '서버 등록' : '다음'}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={() => setServerWizardStep(index - 1)}
                        sx={{ mr: 1 }}
                      >
                        이전
                      </Button>
                    </Box>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServerWizard(false)}>취소</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 서버 설정 다이얼로그 */}
      <Dialog open={serverConfigDialog} onClose={() => setServerConfigDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>서버 설정</DialogTitle>
        <DialogContent>
          <Tabs value={configTabValue} onChange={(e, v) => setConfigTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="기본 정보" />
            <Tab label="인증" />
            <Tab label="고급 설정" />
          </Tabs>

          {configTabValue === 0 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="서버 이름"
                  value={serverConfig.server_name}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, server_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>서버 타입</InputLabel>
                  <Select
                    value={serverConfig.server_type}
                    label="서버 타입"
                    onChange={(e) => setServerConfig(prev => ({ ...prev, server_type: e.target.value }))}
                  >
                    <MenuItem value="jenkins">Jenkins CI</MenuItem>
                    <MenuItem value="nexus">Nexus Repository</MenuItem>
                    <MenuItem value="argocd">Argo CD</MenuItem>
                    <MenuItem value="gitlab">GitLab CI/CD</MenuItem>
                    <MenuItem value="github_actions">GitHub Actions</MenuItem>
                    <MenuItem value="azure_devops">Azure DevOps</MenuItem>
                    <MenuItem value="teamcity">TeamCity</MenuItem>
                    <MenuItem value="circleci">CircleCI</MenuItem>
                    <MenuItem value="sonarqube">SonarQube</MenuItem>
                    <MenuItem value="harbor">Harbor Registry</MenuItem>
                    <MenuItem value="docker_registry">Docker Registry</MenuItem>
                    <MenuItem value="grafana">Grafana</MenuItem>
                    <MenuItem value="prometheus">Prometheus</MenuItem>
                    <MenuItem value="selenium">Selenium Grid</MenuItem>
                    <MenuItem value="webhook">Webhook Service</MenuItem>
                    <MenuItem value="kubernetes">Kubernetes Cluster</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="서버 URL"
                  value={serverConfig.server_url}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, server_url: e.target.value }))}
                  placeholder="https://jenkins.example.com"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="설명"
                  value={serverConfig.description}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
            </Grid>
          )}

          {configTabValue === 1 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>인증 타입</InputLabel>
                  <Select
                    value={serverConfig.auth_type}
                    label="인증 타입"
                    onChange={(e) => setServerConfig(prev => ({ ...prev, auth_type: e.target.value }))}
                  >
                    <MenuItem value="basic">Basic Auth</MenuItem>
                    <MenuItem value="token">API Token</MenuItem>
                    <MenuItem value="oauth">OAuth</MenuItem>
                    <MenuItem value="none">인증 없음</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="사용자명"
                  value={serverConfig.auth_username}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, auth_username: e.target.value }))}
                  disabled={serverConfig.auth_type === 'none'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="비밀번호/토큰"
                  value={serverConfig.auth_password}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, auth_password: e.target.value }))}
                  placeholder="변경하지 않으려면 비워두세요"
                  disabled={serverConfig.auth_type === 'none'}
                />
              </Grid>
            </Grid>
          )}

          {configTabValue === 2 && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="헬스체크 간격 (초)"
                  value={serverConfig.health_check_interval}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, health_check_interval: parseInt(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="타임아웃 (초)"
                  value={serverConfig.timeout}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="재시도 횟수"
                  value={serverConfig.retry_count}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, retry_count: parseInt(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={serverConfig.notification_enabled}
                      onChange={(e) => setServerConfig(prev => ({ ...prev, notification_enabled: e.target.checked }))}
                    />
                  }
                  label="알림 활성화"
                />
              </Grid>
              {serverConfig.notification_enabled && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>알림 채널</InputLabel>
                    <Select
                      multiple
                      value={serverConfig.notification_channels}
                      label="알림 채널"
                      onChange={(e) => setServerConfig(prev => ({ ...prev, notification_channels: e.target.value }))}
                    >
                      <MenuItem value="email">이메일</MenuItem>
                      <MenuItem value="slack">Slack</MenuItem>
                      <MenuItem value="teams">MS Teams</MenuItem>
                      <MenuItem value="webhook">Webhook</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServerConfigDialog(false)}>취소</Button>
          <Button onClick={handleServerConfigSave} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CICDServerManagerEnhanced;
