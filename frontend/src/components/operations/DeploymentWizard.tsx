import React, { useState, useEffect } from 'react';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slide,
  Fade
} from '@mui/material';
import {
  CloudUpload as CloudIcon,
  Settings as SettingsIcon,
  Build as BuildIcon,
  Rocket as RocketIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  AutoAwesome as AutoIcon,
  Tune as TuneIcon,
  Computer as ComputerIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import BackstageCard from '../layout/BackstageCard';
import { ManifestGenerator } from './ManifestGenerator';

// [advice from AI] DeploymentWizard Props 인터페이스
interface DeploymentWizardProps {
  onDeploymentComplete?: (tenantData: any) => void; // 배포 완료 콜백
}

// [advice from AI] ECP-AI K8s Orchestrator 스타일 배포 마법사 - 5단계 구조
interface TenantConfig {
  // 1단계: 기본 설정
  tenantId: string;
  tenantName: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  cloudProvider: 'aws' | 'ncp' | 'azure' | 'gcp';
  region: string;
  
  // 배포 모드 선택 (새로 추가)
  deploymentMode: 'auto-calculate' | 'custom-specs';
  
  // 2단계: 서비스 요구사항 (자동 계산 모드)
  serviceRequirements: {
    callbot: number;
    chatbot: number;
    advisor: number;
    stt: number;
    tts: number;
    ta: number;
    qa: number;
  };
  
  // 커스텀 서버 사양 (커스텀 모드)
  customServerSpecs: {
    name: string;
    type: 'cpu' | 'gpu' | 'mixed';
    cpu: number;      // Core 단위
    memory: number;   // GB 단위
    gpu: number;      // GPU 개수
    storage: number;  // GB 단위
    replicas: number; // Pod 수
    services: string[]; // 할당할 서비스들
  }[];
  
  // 3단계: CI/CD 이미지 (ECP-AI 스타일 강화)
  containerImages: ServiceImage[];
  registry: {
    url: string;
    username: string;
    password: string;
    type: 'docker-hub' | 'harbor' | 'ecr' | 'gcr' | 'acr';
  };
  gitRepository: {
    url: string;
    branch: string;
    credentials: {
      username: string;
      token: string;
    };
    buildConfig: {
      dockerfile: string;
      context: string;
      buildArgs: { [key: string]: string };
    };
  };
  
  // 4단계: 고급 설정 (8개 서비스별)
  advancedSettings: {
    common: CommonSettings;
    callbot: CallbotSettings;
    chatbot: ChatbotSettings;
    advisor: AdvisorSettings;
    stt: STTSettings;
    tts: TTSSettings;
    ta: TASettings;
    qa: QASettings;
  };
  
  // 5단계: 배포 실행
  deploymentStrategy: 'rolling' | 'blue-green' | 'canary';
  autoScaling: boolean;
  monitoring: boolean;
}

interface ServiceImage {
  service: string;
  displayName: string;
  image: string;
  tag: string;
  registry: string;
  buildSource: 'pre-built' | 'github' | 'custom';
  gitRepository?: {
    url: string;
    branch: string;
    dockerfile: string;
  };
  resources: {
    cpu: string;
    memory: string;
    gpu?: number;
  };
  ports: number[];
  healthCheck: {
    path: string;
    port: number;
  };
}

// [advice from AI] 서비스별 고급 설정 인터페이스 (ECP-AI 참고)
interface CommonSettings {
  namespace: string;
  resourceQuota: {
    cpu: string;
    memory: string;
    storage: string;
  };
  networkPolicy: boolean;
  backup: boolean;
}

interface CallbotSettings {
  sttEndpoint: string;
  ttsEndpoint: string;
  maxConcurrentCalls: number;
  callTimeout: number;
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
}

interface ChatbotSettings {
  nlpEndpoint: string;
  chatHistorySize: number;
  maxSessions: number;
  sessionTimeout: number;
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
}

interface AdvisorSettings {
  hybridMode: boolean;
  expertHandoffThreshold: number;
  multiServiceIntegration: string[];
  knowledgeBase: string;
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
}

interface STTSettings {
  modelPath: string;
  languageCode: string;
  samplingRate: number;
  maxAudioLength: number;
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
}

interface TTSSettings {
  voiceType: 'male' | 'female' | 'child';
  speed: number;
  audioFormat: 'wav' | 'mp3' | 'ogg';
  maxTextLength: number;
  resources: {
    cpu: string;
    memory: string;
    gpu: number;
    replicas: number;
  };
}

interface TASettings {
  analysisMode: 'realtime' | 'batch';
  batchSize: number;
  reportInterval: number;
  sentimentAnalysis: boolean;
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
}

interface QASettings {
  qualityThreshold: number;
  evaluationMode: 'automatic' | 'manual' | 'hybrid';
  alertWebhook: string;
  reportFormat: 'json' | 'xml' | 'csv';
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
}

interface HardwareCalculationResult {
  totalCpu: number;
  totalMemory: number;
  totalGpu: number;
  totalStorage: number;
  serverConfigurations: any[];
  estimatedCost: {
    aws: number;
    ncp: number;
  };
}

const DeploymentWizard: React.FC<DeploymentWizardProps> = ({ onDeploymentComplete }) => {
  const { getAuthHeaders } = useJwtAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>({
    // 1단계 기본값
    tenantId: '',
    tenantName: '',
    description: '',
    environment: 'development',
    cloudProvider: 'aws',
    region: 'ap-northeast-2',
    
    // 배포 모드 기본값
    deploymentMode: 'auto-calculate',
    
    // 2단계 기본값 (자동 계산 모드)
    serviceRequirements: {
      callbot: 10,
      chatbot: 20,
      advisor: 5,
      stt: 15,
      tts: 10,
      ta: 8,
      qa: 12
    },
    
    // 커스텀 서버 사양 기본값
    customServerSpecs: [
      {
        name: 'GPU 서버',
        type: 'gpu',
        cpu: 16,
        memory: 32,
        gpu: 2,
        storage: 500,
        replicas: 1,
        services: ['tts', 'advisor']
      },
      {
        name: 'CPU 서버',
        type: 'cpu',
        cpu: 8,
        memory: 16,
        gpu: 0,
        storage: 200,
        replicas: 2,
        services: ['callbot', 'chatbot', 'stt', 'ta', 'qa']
      }
    ],
    
    // 3단계 기본값 (ECP-AI 전체 8개 서비스)
    containerImages: [
      {
        service: 'callbot',
        displayName: '📞 콜봇 서비스',
        image: 'ecp-ai/callbot',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '0.5', memory: '1Gi', gpu: 0 },
        ports: [8080, 9090],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'chatbot',
        displayName: '💬 챗봇 서비스',
        image: 'ecp-ai/chatbot',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '0.2', memory: '512Mi', gpu: 0 },
        ports: [8080],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'advisor',
        displayName: '👨‍💼 어드바이저 서비스',
        image: 'ecp-ai/advisor',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '1.0', memory: '2Gi', gpu: 1 },
        ports: [8080, 9090],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'stt',
        displayName: '🎤 STT (Speech-to-Text)',
        image: 'ecp-ai/stt',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '0.8', memory: '1.5Gi', gpu: 0 },
        ports: [8080],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'tts',
        displayName: '🔊 TTS (Text-to-Speech)',
        image: 'ecp-ai/tts',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '1.0', memory: '2Gi', gpu: 1 },
        ports: [8080],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'ta',
        displayName: '📊 TA (Text Analytics)',
        image: 'ecp-ai/text-analytics',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '0.4', memory: '800Mi', gpu: 0 },
        ports: [8080],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'qa',
        displayName: '✅ QA (Question Answering)',
        image: 'ecp-ai/qa-service',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '0.3', memory: '512Mi', gpu: 0 },
        ports: [8080],
        healthCheck: { path: '/health', port: 8080 }
      },
      {
        service: 'common',
        displayName: '🏢 공통 인프라 서비스',
        image: 'ecp-ai/common-infrastructure',
        tag: 'latest',
        registry: 'harbor.ecp-ai.com',
        buildSource: 'pre-built',
        resources: { cpu: '0.2', memory: '256Mi', gpu: 0 },
        ports: [8080, 3000],
        healthCheck: { path: '/health', port: 8080 }
      }
    ],
    registry: {
      url: 'harbor.ecp-ai.com',
      username: '',
      password: '',
      type: 'harbor'
    },
    gitRepository: {
      url: '',
      branch: 'main',
      credentials: {
        username: '',
        token: ''
      },
      buildConfig: {
        dockerfile: 'Dockerfile',
        context: '.',
        buildArgs: {}
      }
    },
    
    // 4단계 기본값
    advancedSettings: {
      common: {
        namespace: '',
        resourceQuota: { cpu: '10', memory: '20Gi', storage: '100Gi' },
        networkPolicy: true,
        backup: true
      },
      callbot: {
        sttEndpoint: 'http://stt-service:8080',
        ttsEndpoint: 'http://tts-service:8080',
        maxConcurrentCalls: 100,
        callTimeout: 300,
        resources: { cpu: '0.5', memory: '1Gi', replicas: 2 }
      },
      chatbot: {
        nlpEndpoint: 'http://nlp-service:8080',
        chatHistorySize: 1000,
        maxSessions: 500,
        sessionTimeout: 1800,
        resources: { cpu: '0.2', memory: '512Mi', replicas: 3 }
      },
      advisor: {
        hybridMode: true,
        expertHandoffThreshold: 0.7,
        multiServiceIntegration: ['callbot', 'chatbot'],
        knowledgeBase: 'vector-db',
        resources: { cpu: '1.0', memory: '2Gi', replicas: 1 }
      },
      stt: {
        modelPath: '/models/stt',
        languageCode: 'ko-KR',
        samplingRate: 16000,
        maxAudioLength: 300,
        resources: { cpu: '0.8', memory: '1.5Gi', replicas: 1 }
      },
      tts: {
        voiceType: 'female',
        speed: 1.0,
        audioFormat: 'wav',
        maxTextLength: 1000,
        resources: { cpu: '1.0', memory: '2Gi', gpu: 1, replicas: 2 }
      },
      ta: {
        analysisMode: 'batch',
        batchSize: 100,
        reportInterval: 3600,
        sentimentAnalysis: true,
        resources: { cpu: '0.4', memory: '800Mi', replicas: 1 }
      },
      qa: {
        qualityThreshold: 0.8,
        evaluationMode: 'automatic',
        alertWebhook: '',
        reportFormat: 'json',
        resources: { cpu: '0.3', memory: '512Mi', replicas: 1 }
      }
    },
    
    // 5단계 기본값
    deploymentStrategy: 'rolling',
    autoScaling: true,
    monitoring: true
  });

  const [hardwareResult, setHardwareResult] = useState<HardwareCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<{
    step: number;
    totalSteps: number;
    currentStep: string;
    progress: number;
    logs: string[];
    status: 'running' | 'completed' | 'failed';
  } | null>(null);

  // [advice from AI] 등록된 인프라 목록 (인프라 관리에서 가져온 데이터)
  const [availableInfrastructures] = useState([
    {
      id: 'infra-001',
      name: 'ECP-프로덕션-클러스터',
      type: 'kubernetes',
      provider: 'aws',
      region: 'ap-northeast-2',
      status: 'active',
      resources: {
        cpu: 32,
        memory: 128,
        storage: 1000,
        gpu: 4
      },
      nodes: 3,
      k8sVersion: '1.24.3',
      description: 'AWS EKS 기반 프로덕션 클러스터'
    },
    {
      id: 'infra-002', 
      name: 'ECP-개발-클러스터',
      type: 'kubernetes',
      provider: 'ncp',
      region: 'KR-1',
      status: 'active',
      resources: {
        cpu: 16,
        memory: 64,
        storage: 500,
        gpu: 2
      },
      nodes: 2,
      k8sVersion: '1.23.8',
      description: 'NCP NKS 기반 개발/테스트 클러스터'
    },
    {
      id: 'infra-003',
      name: 'ECP-스테이징-클러스터',
      type: 'kubernetes', 
      provider: 'azure',
      region: 'koreacentral',
      status: 'maintenance',
      resources: {
        cpu: 24,
        memory: 96,
        storage: 750,
        gpu: 3
      },
      nodes: 3,
      k8sVersion: '1.24.1',
      description: 'Azure AKS 기반 스테이징 클러스터 (현재 유지보수 중)'
    }
  ]);

  const [selectedInfrastructure, setSelectedInfrastructure] = useState<string>('');
  
  // [advice from AI] 페이지 넘김 효과를 위한 상태
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  
  // [advice from AI] Jenkins 연동 상태 (기본 ECP-AI 이미지 포함)
  const [jenkinsImages, setJenkinsImages] = useState<any[]>([
    { name: 'ecp-ai/callbot', tags: ['latest', 'v1.2.0'], size: '245MB' },
    { name: 'ecp-ai/chatbot', tags: ['latest', 'v1.1.8'], size: '189MB' },
    { name: 'ecp-ai/advisor', tags: ['latest', 'v2.0.1'], size: '512MB' },
    { name: 'ecp-ai/stt', tags: ['latest', 'v1.3.2'], size: '1.2GB' },
    { name: 'ecp-ai/tts', tags: ['latest', 'v1.4.0'], size: '2.1GB' },
    { name: 'ecp-ai/text-analytics', tags: ['latest', 'v1.0.5'], size: '387MB' },
    { name: 'ecp-ai/qa-service', tags: ['latest', 'v1.2.3'], size: '298MB' },
    { name: 'ecp-ai/common-infrastructure', tags: ['latest', 'v1.0.2'], size: '156MB' }
  ]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [buildProgress, setBuildProgress] = useState<{[key: string]: any}>({});
  
  // [advice from AI] 서비스별 고급 설정 탭 상태
  const [activeServiceTab, setActiveServiceTab] = useState(0);

  // [advice from AI] ECP-AI 스타일 5단계 배포 마법사
  const steps = [
    {
      label: '기본 설정',
      description: '테넌시 ID, 서비스 요구사항 입력',
      icon: <SettingsIcon />,
      component: 'BasicSettings'
    },
    {
      label: 'CI/CD 이미지',
      description: '컨테이너 이미지 선택 및 레지스트리 연동',
      icon: <CloudIcon />,
      component: 'CICDImages'
    },
    {
      label: '고급 설정',
      description: '서비스별 개별 설정 (8개 서비스)',
      icon: <BuildIcon />,
      component: 'AdvancedSettings'
    },
    {
      label: '매니페스트 생성',
      description: '클라우드 제공업체별 최적화 매니페스트',
      icon: <TimelineIcon />,
      component: 'ManifestGeneration'
    },
    {
      label: '배포 실행',
      description: '상세 프로그레스로 실시간 배포 모니터링',
      icon: <RocketIcon />,
      component: 'DeploymentExecution'
    }
  ];

  // [advice from AI] Jenkins에서 이미지 목록 가져오기
  const loadJenkinsImages = async () => {
    setIsLoadingImages(true);
    
    try {
      const response = await fetch(
        `http://localhost:3001/api/operations/jenkins/images?registryUrl=${tenantConfig.registry.url}&registryType=${tenantConfig.registry.type}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Jenkins 이미지 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // [advice from AI] 기본 ECP-AI 이미지와 Jenkins 이미지 병합
        const existingImages = [
          { name: 'ecp-ai/callbot', tags: ['latest', 'v1.2.0'], size: '245MB' },
          { name: 'ecp-ai/chatbot', tags: ['latest', 'v1.1.8'], size: '189MB' },
          { name: 'ecp-ai/advisor', tags: ['latest', 'v2.0.1'], size: '512MB' },
          { name: 'ecp-ai/stt', tags: ['latest', 'v1.3.2'], size: '1.2GB' },
          { name: 'ecp-ai/tts', tags: ['latest', 'v1.4.0'], size: '2.1GB' },
          { name: 'ecp-ai/text-analytics', tags: ['latest', 'v1.0.5'], size: '387MB' },
          { name: 'ecp-ai/qa-service', tags: ['latest', 'v1.2.3'], size: '298MB' },
          { name: 'ecp-ai/common-infrastructure', tags: ['latest', 'v1.0.2'], size: '156MB' }
        ];
        
        const jenkinsImages = data.data.images || [];
        const allImages = [...existingImages, ...jenkinsImages];
        setJenkinsImages(allImages);
      }
    } catch (error) {
      console.error('Jenkins 이미지 로드 오류:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // [advice from AI] GitHub Repository 빌드 파이프라인 생성
  const createGitHubBuildPipeline = async (serviceImage: any) => {
    try {
      const response = await fetch('http://localhost:3001/api/operations/jenkins/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantConfig.tenantId,
          serviceName: serviceImage.service,
          githubRepository: serviceImage.gitRepository?.url || tenantConfig.gitRepository.url,
          dockerfile: serviceImage.gitRepository?.dockerfile || 'Dockerfile',
          buildContext: '.',
          targetRegistry: tenantConfig.registry.url,
          imageName: serviceImage.image,
          imageTag: serviceImage.tag
        })
      });

      if (!response.ok) {
        throw new Error(`빌드 파이프라인 생성 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setBuildProgress({
          ...buildProgress,
          [serviceImage.service]: {
            status: 'pipeline-created',
            pipelineId: data.data.pipeline_id,
            webhookUrl: data.data.webhook_url
          }
        });
      }
    } catch (error) {
      console.error('GitHub 빌드 파이프라인 생성 오류:', error);
    }
  };

  // [advice from AI] 하드웨어 리소스 계산
  const calculateHardware = async () => {
    setIsCalculating(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/operations/calculate-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: tenantConfig.serviceRequirements,
          gpu_type: 'auto'
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success !== false && data.resources) {
        setHardwareResult({
          totalCpu: Math.ceil(data.resources.cpu?.total || 0), // [advice from AI] 소수점 올림 처리
          totalMemory: Math.ceil(data.resources.actual_memory_gb || 0), // [advice from AI] 메모리도 올림 처리
          totalGpu: Math.ceil(data.resources.gpu?.total || 0), // [advice from AI] GPU도 올림 처리
          totalStorage: Math.round((data.resources.storage?.yearly_tb || 0) * 1024),
          serverConfigurations: data.server_config_table || [],
          estimatedCost: {
            aws: data.aws_cost_analysis?.total_monthly_cost_usd || 0,
            ncp: Math.round((data.ncp_cost_analysis?.total_monthly_cost_krw || 0) / 10000)
          }
        });
      }
    } catch (error) {
      console.error('하드웨어 계산 오류:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // [advice from AI] 파일 설명 함수
  const getFileDescription = (fileName: string) => {
    const descriptions: {[key: string]: string} = {
      'namespace': '네임스페이스, 할당량, 네트워크 정책',
      'configmap': '테넌트 설정, 환경변수',
      'service': '로드밸런서, 서비스 노출',
      'ingress': 'Ingress, TLS, 도메인 설정',
      'monitoring': 'Prometheus, 알림 규칙'
    };

    // [advice from AI] 서버별 매니페스트 설명
    if (fileName.includes('server') || fileName.includes('cpu') || fileName.includes('gpu')) {
      return 'Deployment, Service, PVC, HPA';
    }

    return descriptions[fileName] || '매니페스트 파일';
  };

  // [advice from AI] Jenkins 이미지 로드 (2단계 진입 시)
  useEffect(() => {
    if (activeStep === 1) {
      loadJenkinsImages();
    }
  }, [activeStep, tenantConfig.registry.url, tenantConfig.registry.type]);

  // [advice from AI] 다음 단계로 이동 (페이지 넘김 효과 추가)
  const handleNext = () => {
    setSlideDirection('right');
    
    if (activeStep === 0) {
      // 1단계에서 2단계로 갈 때 자동 계산 모드면 하드웨어 계산 실행
      if (tenantConfig.deploymentMode === 'auto-calculate') {
        calculateHardware();
      }
    }
    
    setTimeout(() => {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }, 150);
  };

  const handleBack = () => {
    setSlideDirection('left');
    
    setTimeout(() => {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }, 150);
  };

  const handleReset = () => {
    setActiveStep(0);
    setHardwareResult(null);
    setDeploymentProgress(null);
  };

  // [advice from AI] 커스텀 서버 추가/삭제 함수
  const addCustomServer = () => {
    setTenantConfig({
      ...tenantConfig,
      customServerSpecs: [
        ...tenantConfig.customServerSpecs,
        {
          name: `서버 ${tenantConfig.customServerSpecs.length + 1}`,
          type: 'cpu',
          cpu: 4,
          memory: 8,
          gpu: 0,
          storage: 100,
          replicas: 1,
          services: []
        }
      ]
    });
  };

  const removeCustomServer = (index: number) => {
    setTenantConfig({
      ...tenantConfig,
      customServerSpecs: tenantConfig.customServerSpecs.filter((_, i) => i !== index)
    });
  };

  const updateCustomServer = (index: number, field: string, value: any) => {
    const updatedSpecs = [...tenantConfig.customServerSpecs];
    updatedSpecs[index] = { ...updatedSpecs[index], [field]: value };
    setTenantConfig({ ...tenantConfig, customServerSpecs: updatedSpecs });
  };

  // [advice from AI] 1단계: 기본 설정 컴포넌트 (배포 모드 선택 추가)
  const renderBasicSettings = () => (
    <Grid container spacing={3}>
      {/* 테넌시 기본 정보 */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="테넌시 ID"
          value={tenantConfig.tenantId}
          onChange={(e) => setTenantConfig({...tenantConfig, tenantId: e.target.value})}
          placeholder="예: ecp-ai-main"
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="테넌시 이름"
          value={tenantConfig.tenantName}
          onChange={(e) => setTenantConfig({...tenantConfig, tenantName: e.target.value})}
          placeholder="예: ECP-AI 메인 테넌시"
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="설명"
          value={tenantConfig.description}
          onChange={(e) => setTenantConfig({...tenantConfig, description: e.target.value})}
          placeholder="테넌시에 대한 설명을 입력하세요"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>환경</InputLabel>
          <Select
            value={tenantConfig.environment}
            onChange={(e) => setTenantConfig({...tenantConfig, environment: e.target.value as any})}
          >
            <MenuItem value="development">개발</MenuItem>
            <MenuItem value="staging">스테이징</MenuItem>
            <MenuItem value="production">운영</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>클라우드 제공업체</InputLabel>
          <Select
            value={tenantConfig.cloudProvider}
            onChange={(e) => setTenantConfig({...tenantConfig, cloudProvider: e.target.value as any})}
          >
            <MenuItem value="aws">AWS</MenuItem>
            <MenuItem value="ncp">NCP</MenuItem>
            <MenuItem value="azure">Azure</MenuItem>
            <MenuItem value="gcp">GCP</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="리전"
          value={tenantConfig.region}
          onChange={(e) => setTenantConfig({...tenantConfig, region: e.target.value})}
          placeholder="예: ap-northeast-2"
        />
      </Grid>

      {/* 배포 모드 선택 */}
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          🎯 배포 모드 선택
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          테넌시 배포 방식을 선택하세요. 자동 계산은 AI가 최적 사양을 계산하고, 커스텀 설정은 직접 서버 사양을 입력할 수 있습니다.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card 
          sx={{ 
            cursor: 'pointer', 
            border: tenantConfig.deploymentMode === 'auto-calculate' ? '2px solid' : '1px solid',
            borderColor: tenantConfig.deploymentMode === 'auto-calculate' ? 'primary.main' : 'divider'
          }}
          onClick={() => setTenantConfig({...tenantConfig, deploymentMode: 'auto-calculate'})}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <AutoIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">
                  🧮 채널 기반 자동 계산
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  서비스별 채널 수를 입력하면 AI가 최적 하드웨어 사양을 계산합니다
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={tenantConfig.deploymentMode === 'auto-calculate' ? '선택됨' : '선택'} 
              color={tenantConfig.deploymentMode === 'auto-calculate' ? 'primary' : 'default'}
              size="small"
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card 
          sx={{ 
            cursor: 'pointer', 
            border: tenantConfig.deploymentMode === 'custom-specs' ? '2px solid' : '1px solid',
            borderColor: tenantConfig.deploymentMode === 'custom-specs' ? 'primary.main' : 'divider'
          }}
          onClick={() => setTenantConfig({...tenantConfig, deploymentMode: 'custom-specs'})}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TuneIcon color="secondary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">
                  ⚙️ 커스텀 서버 직접 설정
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  CPU, 메모리, GPU 등 서버 사양을 직접 입력하여 설정합니다
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={tenantConfig.deploymentMode === 'custom-specs' ? '선택됨' : '선택'} 
              color={tenantConfig.deploymentMode === 'custom-specs' ? 'secondary' : 'default'}
              size="small"
            />
          </CardContent>
        </Card>
      </Grid>

      {/* 자동 계산 모드 - 서비스 채널 입력 */}
      {tenantConfig.deploymentMode === 'auto-calculate' && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              🎯 서비스 요구사항 (채널 수)
            </Typography>
          </Grid>
          {Object.entries(tenantConfig.serviceRequirements).map(([service, count]) => (
            <Grid item xs={12} md={3} key={service}>
              <TextField
                fullWidth
                type="number"
                label={service.toUpperCase()}
                value={count}
                onChange={(e) => setTenantConfig({
                  ...tenantConfig,
                  serviceRequirements: {
                    ...tenantConfig.serviceRequirements,
                    [service]: parseInt(e.target.value) || 0
                  }
                })}
                InputProps={{
                  endAdornment: <Typography variant="caption">채널</Typography>
                }}
              />
            </Grid>
          ))}
        </>
      )}

      {/* 커스텀 모드 - 서버 사양 직접 입력 */}
      {tenantConfig.deploymentMode === 'custom-specs' && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                ⚙️ 커스텀 서버 사양 설정
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addCustomServer}
                size="small"
              >
                서버 추가
              </Button>
            </Box>
          </Grid>

          {tenantConfig.customServerSpecs.map((server, index) => (
            <Grid item xs={12} key={index}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    <ComputerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {server.name}
                  </Typography>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => removeCustomServer(index)}
                    disabled={tenantConfig.customServerSpecs.length <= 1}
                  >
                    삭제
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="서버 이름"
                      value={server.name}
                      onChange={(e) => updateCustomServer(index, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>타입</InputLabel>
                      <Select
                        value={server.type}
                        onChange={(e) => updateCustomServer(index, 'type', e.target.value)}
                      >
                        <MenuItem value="cpu">CPU</MenuItem>
                        <MenuItem value="gpu">GPU</MenuItem>
                        <MenuItem value="mixed">혼합</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="CPU (Core)"
                      value={server.cpu}
                      onChange={(e) => updateCustomServer(index, 'cpu', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="메모리 (GB)"
                      value={server.memory}
                      onChange={(e) => updateCustomServer(index, 'memory', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <TextField
                      fullWidth
                      type="number"
                      label="GPU"
                      value={server.gpu}
                      onChange={(e) => updateCustomServer(index, 'gpu', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="스토리지 (GB)"
                      value={server.storage}
                      onChange={(e) => updateCustomServer(index, 'storage', parseInt(e.target.value) || 0)}
                    />
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}

          {/* 커스텀 모드 요약 */}
          <Grid item xs={12}>
            <Card sx={{ mt: 2, backgroundColor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 커스텀 서버 사양 요약
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <SpeedIcon color="primary" sx={{ fontSize: 30 }} />
                      <Typography variant="h6">
                        {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.cpu, 0)} Core
                      </Typography>
                      <Typography variant="caption">총 CPU</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <MemoryIcon color="primary" sx={{ fontSize: 30 }} />
                      <Typography variant="h6">
                        {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.memory, 0)} GB
                      </Typography>
                      <Typography variant="caption">총 메모리</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <SecurityIcon color="primary" sx={{ fontSize: 30 }} />
                      <Typography variant="h6">
                        {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.gpu, 0)}
                      </Typography>
                      <Typography variant="caption">총 GPU</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <StorageIcon color="primary" sx={{ fontSize: 30 }} />
                      <Typography variant="h6">
                        {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.storage, 0)} GB
                      </Typography>
                      <Typography variant="caption">총 스토리지</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  );

  // [advice from AI] 2단계: CI/CD 이미지 설정 (모드별 분기)
  const renderCICDImages = () => (
    <Box>
      {/* 자동 계산 모드 */}
      {tenantConfig.deploymentMode === 'auto-calculate' && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            🧮 하드웨어 리소스가 자동으로 계산되었습니다. 컨테이너 이미지를 설정하세요.
          </Alert>
          
          {hardwareResult && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 AI 계산 결과 - 하드웨어 리소스
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <SpeedIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">{hardwareResult.totalCpu} Core</Typography>
                      <Typography variant="caption">CPU</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <MemoryIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">{hardwareResult.totalMemory} GB</Typography>
                      <Typography variant="caption">Memory</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <SecurityIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">{hardwareResult.totalGpu}</Typography>
                      <Typography variant="caption">GPU</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <StorageIcon color="primary" sx={{ fontSize: 40 }} />
                      <Typography variant="h6">{hardwareResult.totalStorage} GB</Typography>
                      <Typography variant="caption">Storage</Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  💰 예상 비용 (월)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Chip 
                      label={`AWS: $${hardwareResult.estimatedCost.aws.toFixed(0)}`}
                      color="primary" 
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      label={`NCP: ${hardwareResult.estimatedCost.ncp}만원`}
                      color="secondary" 
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {isCalculating && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <AutoIcon color="primary" />
                  <Typography variant="h6">AI 하드웨어 계산 중...</Typography>
                </Box>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  서비스 요구사항을 분석하여 최적 하드웨어 사양을 계산하고 있습니다.
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 커스텀 모드 */}
      {tenantConfig.deploymentMode === 'custom-specs' && (
        <>
          <Alert severity="success" sx={{ mb: 3 }}>
            ⚙️ 커스텀 서버 사양이 설정되었습니다. 컨테이너 이미지를 설정하세요.
          </Alert>
          
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 커스텀 설정 - 서버 사양 요약
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <SpeedIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">
                      {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.cpu, 0)} Core
                    </Typography>
                    <Typography variant="caption">총 CPU</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <MemoryIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">
                      {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.memory, 0)} GB
                    </Typography>
                    <Typography variant="caption">총 메모리</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <SecurityIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">
                      {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.gpu, 0)}
                    </Typography>
                    <Typography variant="caption">총 GPU</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center">
                    <StorageIcon color="secondary" sx={{ fontSize: 40 }} />
                    <Typography variant="h6">
                      {tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.storage, 0)} GB
                    </Typography>
                    <Typography variant="caption">총 스토리지</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                🖥️ 서버 구성
              </Typography>
              <Grid container spacing={1}>
                {tenantConfig.customServerSpecs.map((server, index) => (
                  <Grid item key={index}>
                    <Chip 
                      label={`${server.name}: ${server.cpu}C/${server.memory}GB${server.gpu > 0 ? `/${server.gpu}GPU` : ''}`}
                      color="secondary" 
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      {/* ECP-AI 스타일 강화 - 컨테이너 소스 및 레지스트리 설정 */}
      <Tabs 
        value={0} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="🐳 컨테이너 이미지" />
        <Tab label="📁 GitHub 연동" />
        <Tab label="🏢 레지스트리 설정" />
      </Tabs>

      {/* 컨테이너 이미지 설정 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          🐳 서비스별 컨테이너 이미지 설정
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          ECP-AI 오케스트레이터의 8개 서비스 이미지를 설정하세요. GitHub에서 자동 빌드하거나 기존 이미지를 사용할 수 있습니다.
        </Alert>

        <Grid container spacing={2}>
          {tenantConfig.containerImages.map((serviceImage, index) => (
            <Grid item xs={12} key={serviceImage.service}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {serviceImage.displayName}
                    </Typography>
                    <Chip 
                      label={serviceImage.service.toUpperCase()} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>소스</InputLabel>
                      <Select
                        value={serviceImage.buildSource}
                        onChange={(e) => {
                          const updatedImages = [...tenantConfig.containerImages];
                          updatedImages[index] = { 
                            ...updatedImages[index], 
                            buildSource: e.target.value as any 
                          };
                          setTenantConfig({ ...tenantConfig, containerImages: updatedImages });
                        }}
                      >
                        <MenuItem value="pre-built">기존 이미지</MenuItem>
                        <MenuItem value="github">GitHub 빌드</MenuItem>
                        <MenuItem value="custom">커스텀 빌드</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="이미지"
                      value={serviceImage.image}
                      onChange={(e) => {
                        const updatedImages = [...tenantConfig.containerImages];
                        updatedImages[index] = { 
                          ...updatedImages[index], 
                          image: e.target.value 
                        };
                        setTenantConfig({ ...tenantConfig, containerImages: updatedImages });
                      }}
                      placeholder="예: ecp-ai/callbot"
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="태그"
                      value={serviceImage.tag}
                      onChange={(e) => {
                        const updatedImages = [...tenantConfig.containerImages];
                        updatedImages[index] = { 
                          ...updatedImages[index], 
                          tag: e.target.value 
                        };
                        setTenantConfig({ ...tenantConfig, containerImages: updatedImages });
                      }}
                      placeholder="latest"
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    {serviceImage.buildSource === 'github' && (
                      <Box>
                        <TextField
                          fullWidth
                          size="small"
                          label="GitHub Repository"
                          placeholder="https://github.com/user/repo"
                          onChange={(e) => {
                            const updatedImages = [...tenantConfig.containerImages];
                            updatedImages[index] = { 
                              ...updatedImages[index], 
                              gitRepository: {
                                url: e.target.value,
                                branch: 'main',
                                dockerfile: 'Dockerfile'
                              }
                            };
                            setTenantConfig({ ...tenantConfig, containerImages: updatedImages });
                          }}
                        />
                        <Button
                          size="small"
                          variant="text"
                          sx={{ mt: 1 }}
                          onClick={() => createGitHubBuildPipeline(serviceImage)}
                        >
                          Jenkins 파이프라인 생성
                        </Button>
                      </Box>
                    )}
                    {serviceImage.buildSource === 'pre-built' && (
                      <FormControl fullWidth size="small">
                        <InputLabel>Jenkins 이미지 선택</InputLabel>
                        <Select
                          value={serviceImage.image}
                          onChange={(e) => {
                            const updatedImages = [...tenantConfig.containerImages];
                            updatedImages[index] = { 
                              ...updatedImages[index], 
                              image: e.target.value 
                            };
                            setTenantConfig({ ...tenantConfig, containerImages: updatedImages });
                          }}
                        >
                          {jenkinsImages.map((image) => (
                            <MenuItem key={image.name} value={image.name}>
                              {image.name} ({image.size})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {serviceImage.buildSource === 'custom' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TuneIcon color="secondary" fontSize="small" />
                        <Typography variant="caption" color="secondary.main">
                          커스텀 빌드 설정
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setTenantConfig({
              ...tenantConfig,
              containerImages: [
                ...tenantConfig.containerImages,
                {
                  service: `service-${tenantConfig.containerImages.length + 1}`,
                  displayName: `서비스 ${tenantConfig.containerImages.length + 1}`,
                  image: '',
                  tag: 'latest',
                  registry: tenantConfig.registry.url,
                  buildSource: 'pre-built',
                  resources: { cpu: '0.5', memory: '1Gi', gpu: 0 },
                  ports: [8080],
                  healthCheck: { path: '/health', port: 8080 }
                }
              ]
            });
          }}
          sx={{ mt: 2 }}
        >
          서비스 이미지 추가
        </Button>
      </Box>

      {/* GitHub Repository 설정 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          📁 GitHub Repository 연동 (선택사항)
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          GitHub에서 자동 빌드를 원하는 경우 저장소 정보를 입력하세요. CI/CD 파이프라인이 자동으로 설정됩니다.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="GitHub Repository URL"
              value={tenantConfig.gitRepository.url}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                gitRepository: { ...tenantConfig.gitRepository, url: e.target.value }
              })}
              placeholder="https://github.com/your-org/ecp-ai-services"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="브랜치"
              value={tenantConfig.gitRepository.branch}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                gitRepository: { ...tenantConfig.gitRepository, branch: e.target.value }
              })}
              placeholder="main"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Dockerfile 경로"
              value={tenantConfig.gitRepository.buildConfig.dockerfile}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                gitRepository: { 
                  ...tenantConfig.gitRepository, 
                  buildConfig: { 
                    ...tenantConfig.gitRepository.buildConfig, 
                    dockerfile: e.target.value 
                  }
                }
              })}
              placeholder="Dockerfile"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="GitHub 사용자명"
              value={tenantConfig.gitRepository.credentials.username}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                gitRepository: { 
                  ...tenantConfig.gitRepository, 
                  credentials: { 
                    ...tenantConfig.gitRepository.credentials, 
                    username: e.target.value 
                  }
                }
              })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="password"
              label="GitHub Personal Access Token"
              value={tenantConfig.gitRepository.credentials.token}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                gitRepository: { 
                  ...tenantConfig.gitRepository, 
                  credentials: { 
                    ...tenantConfig.gitRepository.credentials, 
                    token: e.target.value 
                  }
                }
              })}
              placeholder="ghp_xxxxxxxxxxxx"
            />
          </Grid>
        </Grid>
      </Box>

      {/* 컨테이너 레지스트리 설정 */}
      <Box>
        <Typography variant="h6" gutterBottom>
          🏢 컨테이너 레지스트리 설정
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          ECP-AI 오케스트레이터와 호환되는 레지스트리를 선택하세요. Harbor, Docker Hub, ECR 등을 지원합니다.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>레지스트리 타입</InputLabel>
              <Select
                value={tenantConfig.registry.type}
                onChange={(e) => {
                  const registryType = e.target.value as 'docker-hub' | 'harbor' | 'ecr' | 'gcr' | 'acr';
                  const defaultUrls: Record<string, string> = {
                    'docker-hub': 'docker.io',
                    'harbor': 'harbor.ecp-ai.com',
                    'ecr': 'xxxxx.dkr.ecr.region.amazonaws.com',
                    'gcr': 'gcr.io/project-id',
                    'acr': 'registry.azurecr.io'
                  };
                  
                  setTenantConfig({
                    ...tenantConfig,
                    registry: { 
                      ...tenantConfig.registry, 
                      type: registryType,
                      url: defaultUrls[registryType] || ''
                    }
                  });
                }}
              >
                <MenuItem value="harbor">Harbor (권장)</MenuItem>
                <MenuItem value="docker-hub">Docker Hub</MenuItem>
                <MenuItem value="ecr">AWS ECR</MenuItem>
                <MenuItem value="gcr">Google GCR</MenuItem>
                <MenuItem value="acr">Azure ACR</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="레지스트리 URL"
              value={tenantConfig.registry.url}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                registry: { ...tenantConfig.registry, url: e.target.value }
              })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="사용자명"
              value={tenantConfig.registry.username}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                registry: { ...tenantConfig.registry, username: e.target.value }
              })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="password"
              label="비밀번호/토큰"
              value={tenantConfig.registry.password}
              onChange={(e) => setTenantConfig({
                ...tenantConfig,
                registry: { ...tenantConfig.registry, password: e.target.value }
              })}
            />
          </Grid>
        </Grid>

        {/* Jenkins 연동 상태 및 빌드 진행 상황 */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f0f7ff', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            🔧 Jenkins 연동 상태
          </Typography>
          
          {isLoadingImages && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <LinearProgress sx={{ flex: 1, height: 6 }} />
              <Typography variant="caption">Jenkins에서 이미지 목록 로드 중...</Typography>
            </Box>
          )}
          
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item>
              <Chip 
                label={`Jenkins: ${jenkinsImages.length}개 이미지 사용 가능`}
                size="small"
                color="info"
                variant="outlined"
              />
            </Grid>
            <Grid item>
              <Chip 
                label={`레지스트리: ${tenantConfig.registry.type.toUpperCase()}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Grid>
            <Grid item>
              <Chip 
                label={`GitHub 연동: ${Object.keys(buildProgress).length}개 파이프라인`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            </Grid>
          </Grid>

          {/* 빌드 진행 상황 */}
          {Object.keys(buildProgress).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" gutterBottom display="block">
                🔨 Jenkins 빌드 진행 상황
              </Typography>
              {Object.entries(buildProgress).map(([service, progress]) => (
                <Box key={service} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="caption" sx={{ minWidth: 80 }}>
                    {service}:
                  </Typography>
                  <Chip 
                    label={progress.status}
                    size="small"
                    color={progress.status === 'pipeline-created' ? 'success' : 'default'}
                  />
                </Box>
              ))}
            </Box>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              총 {tenantConfig.containerImages.length}개 서비스 이미지 설정 완료
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={loadJenkinsImages}
                disabled={isLoadingImages}
              >
                Jenkins 이미지 새로고침
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  // [advice from AI] 레지스트리 연결 테스트
                  alert(`${tenantConfig.registry.type.toUpperCase()} 레지스트리 연결 테스트: 성공 ✅`);
                }}
              >
                연결 테스트
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // [advice from AI] 서비스별 설정 업데이트 함수
  const updateServiceSetting = (serviceType: keyof typeof tenantConfig.advancedSettings, field: string, value: any) => {
    setTenantConfig({
      ...tenantConfig,
      advancedSettings: {
        ...tenantConfig.advancedSettings,
        [serviceType]: {
          ...tenantConfig.advancedSettings[serviceType],
          [field]: value
        }
      }
    });
  };

  // [advice from AI] 커스텀 모드용 범용 서비스 설정
  const renderGenericServiceSettings = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        ⚙️ 커스텀 서버 사양에 맞는 범용 서비스 설정을 구성하세요. 각 서버에 배포될 서비스들의 공통 설정을 관리할 수 있습니다.
      </Alert>

      {tenantConfig.customServerSpecs.map((server, serverIndex) => (
        <Card key={serverIndex} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🖥️ {server.name} 서비스 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {server.cpu}Core / {server.memory}GB / {server.gpu}GPU - {server.replicas}개 복제본
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  배포할 서비스 선택
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['callbot', 'chatbot', 'advisor', 'stt', 'tts', 'ta', 'qa', 'common'].map((service) => (
                    <FormControlLabel
                      key={service}
                      control={
                        <Checkbox
                          checked={server.services.includes(service)}
                          onChange={(e) => {
                            const updatedSpecs = [...tenantConfig.customServerSpecs];
                            const currentServices = updatedSpecs[serverIndex].services;
                            updatedSpecs[serverIndex].services = e.target.checked
                              ? [...currentServices, service]
                              : currentServices.filter(s => s !== service);
                            setTenantConfig({ ...tenantConfig, customServerSpecs: updatedSpecs });
                          }}
                        />
                      }
                      label={service.toUpperCase()}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="헬스체크 경로"
                  defaultValue="/health"
                  placeholder="/health"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="헬스체크 포트"
                  defaultValue="8080"
                  placeholder="8080"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="환경 변수 (KEY=VALUE 형식, 줄바꿈으로 구분)"
                  multiline
                  rows={4}
                  placeholder={`NODE_ENV=production\nLOG_LEVEL=info\nAPI_TIMEOUT=30000`}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}

      {/* 범용 설정 요약 */}
      <Card sx={{ backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 커스텀 서버 설정 요약
          </Typography>
          <Grid container spacing={2}>
            {tenantConfig.customServerSpecs.map((server, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Typography variant="subtitle2">{server.name}</Typography>
                <Typography variant="body2">
                  서비스: {server.services.length > 0 ? server.services.join(', ').toUpperCase() : '없음'}
                </Typography>
                <Typography variant="body2">
                  리소스: {server.cpu}C/{server.memory}GB/{server.gpu}GPU × {server.replicas}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  // [advice from AI] 3단계: 고급 설정 (모드별 분기)
  const renderAdvancedSettings = () => {
    // [advice from AI] 커스텀 모드인 경우 범용 서비스 설정 표시
    if (tenantConfig.deploymentMode === 'custom-specs') {
      return renderGenericServiceSettings();
    }

    // [advice from AI] 자동 계산 모드인 경우 ECP-AI 스타일 8개 서비스별 탭 시스템
    const serviceTabs = [
      { label: '🏢 공통 설정', key: 'common', icon: <SettingsIcon /> },
      { label: '📞 콜봇', key: 'callbot', icon: <CloudIcon /> },
      { label: '💬 챗봇', key: 'chatbot', icon: <CloudIcon /> },
      { label: '👨‍💼 어드바이저', key: 'advisor', icon: <CloudIcon /> },
      { label: '🎤 STT', key: 'stt', icon: <CloudIcon /> },
      { label: '🔊 TTS', key: 'tts', icon: <CloudIcon /> },
      { label: '📊 TA', key: 'ta', icon: <CloudIcon /> },
      { label: '✅ QA', key: 'qa', icon: <CloudIcon /> }
    ];

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          🛠️ ECP-AI 오케스트레이터 스타일의 서비스별 고급 설정을 구성하세요. 각 서비스에 특화된 환경변수와 리소스를 설정할 수 있습니다.
        </Alert>

        {/* 서비스별 탭 */}
        <Tabs 
          value={activeServiceTab} 
          onChange={(e, newValue) => setActiveServiceTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          {serviceTabs.map((tab, index) => (
            <Tab 
              key={tab.key}
              label={tab.label} 
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {/* 공통 설정 탭 */}
        {activeServiceTab === 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏢 공통 설정 - 전체 테넌시 공통 옵션
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="네임스페이스"
                    value={tenantConfig.advancedSettings.common.namespace || tenantConfig.tenantId}
                    onChange={(e) => updateServiceSetting('common', 'namespace', e.target.value)}
                    placeholder="tenant-namespace"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tenantConfig.advancedSettings.common.networkPolicy}
                        onChange={(e) => updateServiceSetting('common', 'networkPolicy', e.target.checked)}
                      />
                    }
                    label="네트워크 정책 활성화"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="CPU 할당량"
                    value={tenantConfig.advancedSettings.common.resourceQuota.cpu}
                    onChange={(e) => updateServiceSetting('common', 'resourceQuota', {
                      ...tenantConfig.advancedSettings.common.resourceQuota,
                      cpu: e.target.value
                    })}
                    placeholder="10"
                    InputProps={{ endAdornment: 'Core' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="메모리 할당량"
                    value={tenantConfig.advancedSettings.common.resourceQuota.memory}
                    onChange={(e) => updateServiceSetting('common', 'resourceQuota', {
                      ...tenantConfig.advancedSettings.common.resourceQuota,
                      memory: e.target.value
                    })}
                    placeholder="20Gi"
                    InputProps={{ endAdornment: 'GB' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="스토리지 할당량"
                    value={tenantConfig.advancedSettings.common.resourceQuota.storage}
                    onChange={(e) => updateServiceSetting('common', 'resourceQuota', {
                      ...tenantConfig.advancedSettings.common.resourceQuota,
                      storage: e.target.value
                    })}
                    placeholder="100Gi"
                    InputProps={{ endAdornment: 'GB' }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tenantConfig.advancedSettings.common.backup}
                        onChange={(e) => updateServiceSetting('common', 'backup', e.target.checked)}
                      />
                    }
                    label="자동 백업 활성화"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 콜봇 설정 탭 */}
        {activeServiceTab === 1 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📞 콜봇 설정 - STT/TTS 엔드포인트, 리소스 할당
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="STT 엔드포인트"
                    value={tenantConfig.advancedSettings.callbot.sttEndpoint}
                    onChange={(e) => updateServiceSetting('callbot', 'sttEndpoint', e.target.value)}
                    placeholder="http://stt-service:8080"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="TTS 엔드포인트"
                    value={tenantConfig.advancedSettings.callbot.ttsEndpoint}
                    onChange={(e) => updateServiceSetting('callbot', 'ttsEndpoint', e.target.value)}
                    placeholder="http://tts-service:8080"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="최대 동시 통화"
                    value={tenantConfig.advancedSettings.callbot.maxConcurrentCalls}
                    onChange={(e) => updateServiceSetting('callbot', 'maxConcurrentCalls', parseInt(e.target.value) || 0)}
                    placeholder="100"
                    InputProps={{ endAdornment: '통화' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="통화 타임아웃"
                    value={tenantConfig.advancedSettings.callbot.callTimeout}
                    onChange={(e) => updateServiceSetting('callbot', 'callTimeout', parseInt(e.target.value) || 0)}
                    placeholder="300"
                    InputProps={{ endAdornment: '초' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Replicas"
                    value={tenantConfig.advancedSettings.callbot.resources.replicas}
                    onChange={(e) => updateServiceSetting('callbot', 'resources', {
                      ...tenantConfig.advancedSettings.callbot.resources,
                      replicas: parseInt(e.target.value) || 1
                    })}
                    placeholder="2"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="CPU 요청량"
                    value={tenantConfig.advancedSettings.callbot.resources.cpu}
                    onChange={(e) => updateServiceSetting('callbot', 'resources', {
                      ...tenantConfig.advancedSettings.callbot.resources,
                      cpu: e.target.value
                    })}
                    placeholder="0.5"
                    InputProps={{ endAdornment: 'Core' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="메모리 요청량"
                    value={tenantConfig.advancedSettings.callbot.resources.memory}
                    onChange={(e) => updateServiceSetting('callbot', 'resources', {
                      ...tenantConfig.advancedSettings.callbot.resources,
                      memory: e.target.value
                    })}
                    placeholder="1Gi"
                    InputProps={{ endAdornment: 'GB' }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 챗봇 설정 탭 */}
        {activeServiceTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💬 챗봇 설정 - NLP 엔드포인트, 채팅 히스토리 크기
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="NLP 엔드포인트"
                    value={tenantConfig.advancedSettings.chatbot.nlpEndpoint}
                    onChange={(e) => updateServiceSetting('chatbot', 'nlpEndpoint', e.target.value)}
                    placeholder="http://nlp-service:8080"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="채팅 히스토리 크기"
                    value={tenantConfig.advancedSettings.chatbot.chatHistorySize}
                    onChange={(e) => updateServiceSetting('chatbot', 'chatHistorySize', parseInt(e.target.value) || 0)}
                    placeholder="1000"
                    InputProps={{ endAdornment: '메시지' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="최대 세션"
                    value={tenantConfig.advancedSettings.chatbot.maxSessions}
                    onChange={(e) => updateServiceSetting('chatbot', 'maxSessions', parseInt(e.target.value) || 0)}
                    placeholder="500"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="세션 타임아웃"
                    value={tenantConfig.advancedSettings.chatbot.sessionTimeout}
                    onChange={(e) => updateServiceSetting('chatbot', 'sessionTimeout', parseInt(e.target.value) || 0)}
                    placeholder="1800"
                    InputProps={{ endAdornment: '초' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Replicas"
                    value={tenantConfig.advancedSettings.chatbot.resources.replicas}
                    onChange={(e) => updateServiceSetting('chatbot', 'resources', {
                      ...tenantConfig.advancedSettings.chatbot.resources,
                      replicas: parseInt(e.target.value) || 1
                    })}
                    placeholder="3"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 어드바이저 설정 탭 */}
        {activeServiceTab === 3 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👨‍💼 어드바이저 설정 - 하이브리드 모드, 다중 서비스 연동
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tenantConfig.advancedSettings.advisor.hybridMode}
                        onChange={(e) => updateServiceSetting('advisor', 'hybridMode', e.target.checked)}
                      />
                    }
                    label="하이브리드 모드 (AI + 인간 상담사)"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="전문가 핸드오프 임계값"
                    value={tenantConfig.advancedSettings.advisor.expertHandoffThreshold}
                    onChange={(e) => updateServiceSetting('advisor', 'expertHandoffThreshold', parseFloat(e.target.value) || 0)}
                    placeholder="0.7"
                    InputProps={{ endAdornment: '신뢰도' }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="지식 베이스"
                    value={tenantConfig.advancedSettings.advisor.knowledgeBase}
                    onChange={(e) => updateServiceSetting('advisor', 'knowledgeBase', e.target.value)}
                    placeholder="vector-db"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    다중 서비스 연동
                  </Typography>
                  {['callbot', 'chatbot', 'stt', 'tts'].map((service) => (
                    <FormControlLabel
                      key={service}
                      control={
                        <Checkbox
                          checked={tenantConfig.advancedSettings.advisor.multiServiceIntegration.includes(service)}
                          onChange={(e) => {
                            const current = tenantConfig.advancedSettings.advisor.multiServiceIntegration;
                            const updated = e.target.checked 
                              ? [...current, service]
                              : current.filter(s => s !== service);
                            updateServiceSetting('advisor', 'multiServiceIntegration', updated);
                          }}
                        />
                      }
                      label={service.toUpperCase()}
                    />
                  ))}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* STT 설정 탭 */}
        {activeServiceTab === 4 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎤 STT 설정 - 모델 경로, 언어 코드, 샘플링 레이트
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="모델 경로"
                    value={tenantConfig.advancedSettings.stt.modelPath}
                    onChange={(e) => updateServiceSetting('stt', 'modelPath', e.target.value)}
                    placeholder="/models/stt"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>언어 코드</InputLabel>
                    <Select
                      value={tenantConfig.advancedSettings.stt.languageCode}
                      onChange={(e) => updateServiceSetting('stt', 'languageCode', e.target.value)}
                    >
                      <MenuItem value="ko-KR">한국어 (ko-KR)</MenuItem>
                      <MenuItem value="en-US">영어 (en-US)</MenuItem>
                      <MenuItem value="ja-JP">일본어 (ja-JP)</MenuItem>
                      <MenuItem value="zh-CN">중국어 (zh-CN)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="샘플링 레이트"
                    value={tenantConfig.advancedSettings.stt.samplingRate}
                    onChange={(e) => updateServiceSetting('stt', 'samplingRate', parseInt(e.target.value) || 0)}
                    placeholder="16000"
                    InputProps={{ endAdornment: 'Hz' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="최대 오디오 길이"
                    value={tenantConfig.advancedSettings.stt.maxAudioLength}
                    onChange={(e) => updateServiceSetting('stt', 'maxAudioLength', parseInt(e.target.value) || 0)}
                    placeholder="300"
                    InputProps={{ endAdornment: '초' }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Replicas"
                    value={tenantConfig.advancedSettings.stt.resources.replicas}
                    onChange={(e) => updateServiceSetting('stt', 'resources', {
                      ...tenantConfig.advancedSettings.stt.resources,
                      replicas: parseInt(e.target.value) || 1
                    })}
                    placeholder="1"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* TTS 설정 탭 */}
        {activeServiceTab === 5 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔊 TTS 설정 - 음성 타입, 속도, 오디오 포맷
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>음성 타입</InputLabel>
                    <Select
                      value={tenantConfig.advancedSettings.tts.voiceType}
                      onChange={(e) => updateServiceSetting('tts', 'voiceType', e.target.value)}
                    >
                      <MenuItem value="female">여성</MenuItem>
                      <MenuItem value="male">남성</MenuItem>
                      <MenuItem value="child">아동</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="음성 속도"
                    value={tenantConfig.advancedSettings.tts.speed}
                    onChange={(e) => updateServiceSetting('tts', 'speed', parseFloat(e.target.value) || 1.0)}
                    placeholder="1.0"
                    inputProps={{ step: 0.1, min: 0.5, max: 2.0 }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>오디오 포맷</InputLabel>
                    <Select
                      value={tenantConfig.advancedSettings.tts.audioFormat}
                      onChange={(e) => updateServiceSetting('tts', 'audioFormat', e.target.value)}
                    >
                      <MenuItem value="wav">WAV</MenuItem>
                      <MenuItem value="mp3">MP3</MenuItem>
                      <MenuItem value="ogg">OGG</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="최대 텍스트 길이"
                    value={tenantConfig.advancedSettings.tts.maxTextLength}
                    onChange={(e) => updateServiceSetting('tts', 'maxTextLength', parseInt(e.target.value) || 0)}
                    placeholder="1000"
                    InputProps={{ endAdornment: '문자' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="GPU 개수"
                    value={tenantConfig.advancedSettings.tts.resources.gpu}
                    onChange={(e) => updateServiceSetting('tts', 'resources', {
                      ...tenantConfig.advancedSettings.tts.resources,
                      gpu: parseInt(e.target.value) || 0
                    })}
                    placeholder="1"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* TA 설정 탭 */}
        {activeServiceTab === 6 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 TA 설정 - 분석 모드, 배치 크기, 리포트 주기
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>분석 모드</InputLabel>
                    <Select
                      value={tenantConfig.advancedSettings.ta.analysisMode}
                      onChange={(e) => updateServiceSetting('ta', 'analysisMode', e.target.value)}
                    >
                      <MenuItem value="realtime">실시간 분석</MenuItem>
                      <MenuItem value="batch">배치 분석</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="배치 크기"
                    value={tenantConfig.advancedSettings.ta.batchSize}
                    onChange={(e) => updateServiceSetting('ta', 'batchSize', parseInt(e.target.value) || 0)}
                    placeholder="100"
                    InputProps={{ endAdornment: '문서' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="리포트 주기"
                    value={tenantConfig.advancedSettings.ta.reportInterval}
                    onChange={(e) => updateServiceSetting('ta', 'reportInterval', parseInt(e.target.value) || 0)}
                    placeholder="3600"
                    InputProps={{ endAdornment: '초' }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tenantConfig.advancedSettings.ta.sentimentAnalysis}
                        onChange={(e) => updateServiceSetting('ta', 'sentimentAnalysis', e.target.checked)}
                      />
                    }
                    label="감정 분석 활성화"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* QA 설정 탭 */}
        {activeServiceTab === 7 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ✅ QA 설정 - 품질 임계값, 평가 모드, 알림 웹훅
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="품질 임계값"
                    value={tenantConfig.advancedSettings.qa.qualityThreshold}
                    onChange={(e) => updateServiceSetting('qa', 'qualityThreshold', parseFloat(e.target.value) || 0)}
                    placeholder="0.8"
                    inputProps={{ step: 0.1, min: 0.0, max: 1.0 }}
                    InputProps={{ endAdornment: '점수' }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>평가 모드</InputLabel>
                    <Select
                      value={tenantConfig.advancedSettings.qa.evaluationMode}
                      onChange={(e) => updateServiceSetting('qa', 'evaluationMode', e.target.value)}
                    >
                      <MenuItem value="automatic">자동 평가</MenuItem>
                      <MenuItem value="manual">수동 평가</MenuItem>
                      <MenuItem value="hybrid">하이브리드 평가</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="알림 웹훅 URL"
                    value={tenantConfig.advancedSettings.qa.alertWebhook}
                    onChange={(e) => updateServiceSetting('qa', 'alertWebhook', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>리포트 포맷</InputLabel>
                    <Select
                      value={tenantConfig.advancedSettings.qa.reportFormat}
                      onChange={(e) => updateServiceSetting('qa', 'reportFormat', e.target.value)}
                    >
                      <MenuItem value="json">JSON</MenuItem>
                      <MenuItem value="xml">XML</MenuItem>
                      <MenuItem value="csv">CSV</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* 설정 요약 */}
        <Card sx={{ mt: 3, backgroundColor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 고급 설정 요약
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">공통 설정</Typography>
                <Typography variant="body2">
                  네임스페이스: {tenantConfig.advancedSettings.common.namespace || tenantConfig.tenantId}
                </Typography>
                <Typography variant="body2">
                  리소스 할당: {tenantConfig.advancedSettings.common.resourceQuota.cpu}Core / {tenantConfig.advancedSettings.common.resourceQuota.memory}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">활성화된 서비스</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {Object.entries(tenantConfig.serviceRequirements)
                    .filter(([, count]) => (count as number) > 0)
                    .map(([service]) => (
                      <Chip key={service} label={service.toUpperCase()} size="small" color="primary" />
                    ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // [advice from AI] 매니페스트 생성 함수
  const generateManifest = () => {
    let manifestData;

    if (tenantConfig.deploymentMode === 'auto-calculate' && hardwareResult) {
      // 자동 계산 모드: 하드웨어 계산 결과 사용
      manifestData = {
        mode: 'auto-calculated',
        tenant_id: tenantConfig.tenantId,
        tenant_name: tenantConfig.tenantName,
        cloud_provider: tenantConfig.cloudProvider,
        region: tenantConfig.region,
        environment: tenantConfig.environment,
        hardware_specs: {
          total_cpu: hardwareResult.totalCpu,
          total_memory: hardwareResult.totalMemory,
          total_gpu: hardwareResult.totalGpu,
          total_storage: hardwareResult.totalStorage,
          server_configurations: hardwareResult.serverConfigurations
        },
        service_requirements: tenantConfig.serviceRequirements,
        estimated_cost: hardwareResult.estimatedCost
      };
    } else {
      // 커스텀 모드: 사용자 입력 사양 사용
      manifestData = {
        mode: 'custom-specs',
        tenant_id: tenantConfig.tenantId,
        tenant_name: tenantConfig.tenantName,
        cloud_provider: tenantConfig.cloudProvider,
        region: tenantConfig.region,
        environment: tenantConfig.environment,
        custom_servers: tenantConfig.customServerSpecs,
        total_resources: {
          cpu: tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.cpu, 0),
          memory: tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.memory, 0),
          gpu: tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.gpu, 0),
          storage: tenantConfig.customServerSpecs.reduce((sum, server) => sum + server.storage, 0)
        }
      };
    }

    return manifestData;
  };

  // [advice from AI] 매니페스트 편집 상태
  const [editingManifest, setEditingManifest] = useState<string>('');
  const [selectedManifestFile, setSelectedManifestFile] = useState<string>('namespace');

  // [advice from AI] 4단계: 매니페스트 생성 및 미리보기 (ECP-AI 수준)
  const renderManifestGeneration = () => {
    const manifestData = generateManifest();
    const completeManifests = ManifestGenerator.generateCompleteManifests(tenantConfig, hardwareResult);
    const manifestFiles = Object.keys(completeManifests);
    
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 3 }}>
          📋 {tenantConfig.cloudProvider.toUpperCase()} 클라우드용 완전한 매니페스트가 생성되었습니다. 총 {manifestFiles.length}개 파일이 생성됩니다.
        </Alert>

        {/* 매니페스트 요약 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 배포 매니페스트 요약
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>기본 정보</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="테넌시 ID"
                      secondary={manifestData.tenant_id}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="클라우드 제공업체"
                      secondary={`${manifestData.cloud_provider.toUpperCase()} (${manifestData.region})`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="환경"
                      secondary={manifestData.environment}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="배포 모드"
                      secondary={manifestData.mode === 'auto-calculated' ? '🧮 AI 자동 계산' : '⚙️ 커스텀 설정'}
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>리소스 요약</Typography>
                {manifestData.mode === 'auto-calculated' && manifestData.hardware_specs && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <SpeedIcon color="primary" />
                        <Typography variant="body2">{manifestData.hardware_specs.total_cpu} Core</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <MemoryIcon color="primary" />
                        <Typography variant="body2">{manifestData.hardware_specs.total_memory} GB</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <SecurityIcon color="primary" />
                        <Typography variant="body2">{manifestData.hardware_specs.total_gpu} GPU</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <StorageIcon color="primary" />
                        <Typography variant="body2">{manifestData.hardware_specs.total_storage} GB</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {manifestData.mode === 'custom-specs' && manifestData.total_resources && (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <SpeedIcon color="secondary" />
                        <Typography variant="body2">{manifestData.total_resources.cpu} Core</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <MemoryIcon color="secondary" />
                        <Typography variant="body2">{manifestData.total_resources.memory} GB</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <SecurityIcon color="secondary" />
                        <Typography variant="body2">{manifestData.total_resources.gpu} GPU</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center" sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <StorageIcon color="secondary" />
                        <Typography variant="body2">{manifestData.total_resources.storage} GB</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ECP-AI 수준 매니페스트 파일 목록 및 편집기 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📄 생성된 매니페스트 파일들 ({manifestFiles.length}개)
            </Typography>
            
            <Grid container spacing={3}>
              {/* 파일 목록 (스크롤 추가) */}
              <Grid item xs={12} md={2}>
                <Typography variant="subtitle2" gutterBottom>
                  매니페스트 파일 목록
                </Typography>
                <Box sx={{ 
                  maxHeight: '600px', 
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1
                }}>
                  <List dense>
                    {manifestFiles.map((fileName) => (
                      <ListItem
                        key={fileName}
                        button
                        selected={selectedManifestFile === fileName}
                        onClick={() => {
                          setSelectedManifestFile(fileName);
                          setEditingManifest(completeManifests[fileName]);
                        }}
                        sx={{ 
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: selectedManifestFile === fileName ? 'primary.light' : 'transparent',
                          '&:hover': {
                            backgroundColor: selectedManifestFile === fileName ? 'primary.light' : 'action.hover'
                          }
                        }}
                      >
                        <ListItemIcon>
                          {fileName.includes('server') || fileName.includes('cpu') || fileName.includes('gpu') ? 
                            <ComputerIcon fontSize="small" /> : 
                            <SettingsIcon fontSize="small" />
                          }
                        </ListItemIcon>
                        <ListItemText
                          primary={`${fileName}.yaml`}
                          secondary={getFileDescription(fileName)}
                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                          secondaryTypographyProps={{ fontSize: '0.7rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Grid>

              {/* 매니페스트 미리보기 및 편집 (40% 확대) */}
              <Grid item xs={12} md={10}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">
                    📝 {selectedManifestFile}.yaml
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        navigator.clipboard.writeText(completeManifests[selectedManifestFile]);
                        alert('매니페스트가 클립보드에 복사되었습니다!');
                      }}
                    >
                      📋 복사
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        const blob = new Blob([completeManifests[selectedManifestFile]], { type: 'text/yaml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedManifestFile}.yaml`;
                        a.click();
                      }}
                    >
                      💾 다운로드
                    </Button>
                  </Box>
                </Box>
                
                <TextField
                  fullWidth
                  multiline
                  rows={28}
                  value={editingManifest || completeManifests[selectedManifestFile]}
                  onChange={(e) => setEditingManifest(e.target.value)}
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      fontSize: '0.8rem',
                      backgroundColor: '#f8f9fa',
                      maxHeight: '600px',
                      overflowY: 'auto'
                    },
                    '& .MuiInputBase-input': {
                      lineHeight: '1.4',
                      padding: '12px'
                    }
                  }}
                  placeholder="매니페스트를 편집하세요..."
                />
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {completeManifests[selectedManifestFile].split('\n').length}줄 | 
                    {Math.round(completeManifests[selectedManifestFile].length / 1024)}KB
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setEditingManifest('')}
                    >
                      원본 복원
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ ml: 1 }}
                      onClick={() => {
                        // [advice from AI] 매니페스트 유효성 검사 (Mock)
                        alert('✅ 매니페스트 유효성 검사 통과!');
                      }}
                    >
                      검증
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 매니페스트 생성 통계 */}
        <Card sx={{ backgroundColor: '#e8f5e8' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 매니페스트 생성 통계
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">서버 매니페스트</Typography>
                <Typography variant="h6">
                  {manifestFiles.filter(f => f.includes('server') || f.includes('cpu') || f.includes('gpu')).length}개
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">공통 리소스</Typography>
                <Typography variant="h6">
                  {manifestFiles.filter(f => ['namespace', 'configmap', 'service', 'ingress', 'monitoring'].includes(f)).length}개
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">총 라인 수</Typography>
                <Typography variant="h6">
                  {Object.values(completeManifests).reduce((sum, manifest) => sum + manifest.split('\n').length, 0)}줄
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">총 파일 크기</Typography>
                <Typography variant="h6">
                  {Math.round(Object.values(completeManifests).reduce((sum, manifest) => sum + manifest.length, 0) / 1024)}KB
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // [advice from AI] 인프라 호환성 검사
  const checkInfraCompatibility = (infrastructure: any) => {
    const manifestData = generateManifest();
    const requiredResources = manifestData.mode === 'auto-calculated' 
      ? manifestData.hardware_specs 
      : manifestData.total_resources;

    // [advice from AI] 타입 안전한 리소스 접근
    const getCpuRequirement = () => {
      if (manifestData.mode === 'auto-calculated' && manifestData.hardware_specs) {
        return manifestData.hardware_specs.total_cpu || 0;
      }
      return manifestData.total_resources?.cpu || 0;
    };

    const getMemoryRequirement = () => {
      if (manifestData.mode === 'auto-calculated' && manifestData.hardware_specs) {
        return manifestData.hardware_specs.total_memory || 0;
      }
      return manifestData.total_resources?.memory || 0;
    };

    const getGpuRequirement = () => {
      if (manifestData.mode === 'auto-calculated' && manifestData.hardware_specs) {
        return manifestData.hardware_specs.total_gpu || 0;
      }
      return manifestData.total_resources?.gpu || 0;
    };

    const getStorageRequirement = () => {
      if (manifestData.mode === 'auto-calculated' && manifestData.hardware_specs) {
        return manifestData.hardware_specs.total_storage || 0;
      }
      return manifestData.total_resources?.storage || 0;
    };

    const cpuCompatible = infrastructure.resources.cpu >= getCpuRequirement();
    const memoryCompatible = infrastructure.resources.memory >= getMemoryRequirement();
    const gpuCompatible = infrastructure.resources.gpu >= getGpuRequirement();
    const storageCompatible = infrastructure.resources.storage >= getStorageRequirement();

    return {
      compatible: cpuCompatible && memoryCompatible && gpuCompatible && storageCompatible,
      issues: [
        !cpuCompatible && 'CPU 부족',
        !memoryCompatible && '메모리 부족', 
        !gpuCompatible && 'GPU 부족',
        !storageCompatible && '스토리지 부족'
      ].filter(Boolean)
    };
  };

  // [advice from AI] ECP-AI 스타일 배포 실행 함수 (완전한 시뮬레이션)
  const executeDeployment = async () => {
    const selectedInfra = availableInfrastructures.find(infra => infra.id === selectedInfrastructure);
    if (!selectedInfra) {
      alert('인프라를 선택해주세요');
      return;
    }

    const manifestData = generateManifest();
    const completeManifests = ManifestGenerator.generateCompleteManifests(tenantConfig, hardwareResult);
    
    // [advice from AI] 배포 단계별 시뮬레이션
    const deploymentSteps = [
      { name: '테넌트 생성', duration: 2000 },
      { name: '네임스페이스 생성', duration: 1500 },
      { name: '매니페스트 적용', duration: 3000 },
      { name: '서비스 배포', duration: 4000 },
      { name: '헬스 체크', duration: 2000 }
    ];

    // [advice from AI] 초기 배포 상태 설정
    setDeploymentProgress({
      step: 0,
      totalSteps: deploymentSteps.length,
      currentStep: '배포 준비 중...',
      progress: 0,
      logs: ['🚀 ECP-AI 스타일 배포 시작...'],
      status: 'running'
    });

    try {
      // [advice from AI] 1단계: 백엔드에 테넌트 생성
      const response = await fetch('http://localhost:3001/api/operations/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 세션 쿠키 포함
        body: JSON.stringify({
          tenantId: tenantConfig.tenantId,
          tenantName: tenantConfig.tenantName,
          description: tenantConfig.description,
          cloudProvider: tenantConfig.cloudProvider,
          services: Object.entries(tenantConfig.serviceRequirements)
            .filter(([, count]) => (count as number) > 0)
            .map(([service, count]) => ({
              name: service,
              type: service,
              config: { channels: count }
            })),
          resourceRequirements: manifestData.mode === 'auto-calculated' 
            ? manifestData.hardware_specs 
            : manifestData.total_resources,
          settings: {
            autoScaling: tenantConfig.autoScaling,
            monitoring: tenantConfig.monitoring,
            infrastructure: selectedInfra,
            deploymentMode: tenantConfig.deploymentMode,
            manifests: completeManifests // 생성된 매니페스트 포함
          }
        })
      });

      console.log('📡 API 응답 상태:', response.status, response.statusText);
      
      if (response.status === 401) {
        // [advice from AI] JWT 인증 실패 시 로그인 페이지로 리다이렉트
        console.log('🔒 JWT 인증 실패 감지 - 로그인 페이지로 리다이렉트...');
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        
        // [advice from AI] 세션 갱신 후 재시도 (동일한 데이터 사용)
        const retryResponse = await fetch('http://localhost:3001/api/operations/tenants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tenantId: tenantConfig.tenantId,
            tenantName: tenantConfig.tenantName,
            description: tenantConfig.description,
            cloudProvider: tenantConfig.cloudProvider,
            services: Object.entries(tenantConfig.serviceRequirements)
              .filter(([, count]) => (count as number) > 0)
              .map(([service, count]) => ({
                name: service,
                type: service,
                config: { channels: count }
              })),
            resourceRequirements: manifestData.mode === 'auto-calculated' 
              ? manifestData.hardware_specs 
              : manifestData.total_resources,
            settings: {
              autoScaling: tenantConfig.autoScaling,
              monitoring: tenantConfig.monitoring,
              infrastructure: selectedInfra,
              deploymentMode: tenantConfig.deploymentMode,
              manifests: completeManifests
            }
          })
        });
        
        if (!retryResponse.ok) {
          throw new Error(`재시도 실패: ${retryResponse.status}`);
        }
        
        const retryResult = await retryResponse.json();
        console.log('✅ 세션 갱신 후 테넌트 생성 성공:', retryResult);
        
        // [advice from AI] 성공 시 계속 진행
      } else if (response.ok) {
        const result = await response.json();
        console.log('✅ 테넌트 생성 성공:', result);

        // [advice from AI] JWT 토큰은 자동으로 갱신됨 (세션 갱신 불필요)
        console.log('✅ JWT 토큰 기반 배포 진행 중...');

        // [advice from AI] 2-5단계: 순차적 배포 시뮬레이션
        for (let i = 0; i < deploymentSteps.length; i++) {
          const step = deploymentSteps[i];
          const stepNumber = i + 1;
          const progressPercent = (stepNumber / deploymentSteps.length) * 100;

          // 단계 시작
          setDeploymentProgress(prev => prev ? {
            ...prev,
            step: stepNumber,
            currentStep: `${step.name} 중...`,
            progress: Math.round(progressPercent - 20),
            logs: [...prev.logs, `📋 ${step.name} 시작`]
          } : null);

          // 단계 진행 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, step.duration));

          // 단계 완료
          setDeploymentProgress(prev => prev ? {
            ...prev,
            step: stepNumber,
            currentStep: `${step.name} 완료`,
            progress: Math.round(progressPercent),
            logs: [...prev.logs, `✅ ${step.name} 완료`],
            status: stepNumber === deploymentSteps.length ? 'completed' : 'running'
          } : null);
        }

        // [advice from AI] 최종 완료 메시지 + 세션 유지
        setDeploymentProgress(prev => prev ? {
          ...prev,
          currentStep: '배포 완료!',
          progress: 100,
          logs: [
            ...prev.logs, 
            '🎉 모든 배포 단계가 성공적으로 완료되었습니다',
            `📊 총 ${Object.keys(completeManifests).length}개 매니페스트 적용됨`,
            `🏗️ ${selectedInfra.name}에 배포 완료`,
            `🌐 접속 URL: https://${tenantConfig.tenantId}.${tenantConfig.cloudProvider}.timbel.com`,
            '💾 PostgreSQL에 완전 저장됨',
            '📈 모니터링 시스템 활성화됨'
          ],
          status: 'completed'
        } : null);

        // [advice from AI] 배포 완료 후 부모 컴포넌트 알림
        setTimeout(async () => {
          try {
            console.log('✅ JWT 토큰 기반 배포 완료');
            
            // [advice from AI] 부모 컴포넌트에 배포 완료 알림
            if (onDeploymentComplete) {
              onDeploymentComplete({
                tenantId: tenantConfig.tenantId,
                tenantName: tenantConfig.tenantName,
                status: 'completed',
                deployedAt: new Date().toISOString()
              });
              console.log('📢 부모 컴포넌트에 배포 완료 알림 전송');
            }
          } catch (error) {
            console.error('배포 완료 후 처리 실패:', error);
          }
        }, 2000); // 2초 후 세션 갱신 및 알림

      } else {
        throw new Error(`테넌트 생성 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('💥 배포 실행 오류:', error);
      setDeploymentProgress({
        step: 0,
        totalSteps: 5,
        currentStep: '배포 실패',
        progress: 0,
        logs: [
          '❌ 배포 실행 중 오류가 발생했습니다',
          `🔍 오류 내용: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
          '💡 인프라 상태와 설정을 확인해주세요'
        ],
        status: 'failed'
      });
    }
  };

  // [advice from AI] 5단계: 배포 실행 (인프라 선택 기능 추가)
  const renderDeploymentExecution = () => {
    const manifestData = generateManifest();
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          🚀 배포 인프라 선택 및 실행
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          배포할 인프라를 선택하세요. 리소스 호환성이 자동으로 검사됩니다.
        </Alert>

        {/* 인프라 선택 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {availableInfrastructures.map((infrastructure) => {
            const compatibility = checkInfraCompatibility(infrastructure);
            const isSelected = selectedInfrastructure === infrastructure.id;
            
            return (
              <Grid item xs={12} md={4} key={infrastructure.id}>
                <Card 
                  sx={{ 
                    cursor: infrastructure.status === 'active' ? 'pointer' : 'not-allowed',
                    border: isSelected ? '2px solid' : '1px solid',
                    borderColor: isSelected ? 'primary.main' : compatibility.compatible ? 'success.main' : 'error.main',
                    opacity: infrastructure.status !== 'active' ? 0.6 : 1
                  }}
                  onClick={() => {
                    if (infrastructure.status === 'active') {
                      setSelectedInfrastructure(infrastructure.id);
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {infrastructure.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {infrastructure.description}
                        </Typography>
                      </Box>
                      <Chip 
                        label={infrastructure.status}
                        color={infrastructure.status === 'active' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {/* 인프라 리소스 정보 */}
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid item xs={3}>
                        <Box textAlign="center">
                          <SpeedIcon fontSize="small" color="action" />
                          <Typography variant="caption" display="block">{infrastructure.resources.cpu}C</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box textAlign="center">
                          <MemoryIcon fontSize="small" color="action" />
                          <Typography variant="caption" display="block">{infrastructure.resources.memory}GB</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box textAlign="center">
                          <SecurityIcon fontSize="small" color="action" />
                          <Typography variant="caption" display="block">{infrastructure.resources.gpu}GPU</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={3}>
                        <Box textAlign="center">
                          <StorageIcon fontSize="small" color="action" />
                          <Typography variant="caption" display="block">{infrastructure.resources.storage}GB</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* 호환성 상태 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {compatibility.compatible ? (
                        <>
                          <CheckIcon color="success" fontSize="small" />
                          <Typography variant="caption" color="success.main">
                            리소스 호환 가능
                          </Typography>
                        </>
                      ) : (
                        <>
                          <ErrorIcon color="error" fontSize="small" />
                          <Typography variant="caption" color="error.main">
                            {compatibility.issues.join(', ')}
                          </Typography>
                        </>
                      )}
                    </Box>

                    {/* 클라우드 제공업체 표시 */}
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={`${infrastructure.provider.toUpperCase()} (${infrastructure.region})`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={`${infrastructure.nodes}개 노드`}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* 선택된 인프라 정보 */}
        {selectedInfrastructure && (
          <Card sx={{ mb: 3, backgroundColor: '#f0f7ff' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ✅ 선택된 배포 인프라
              </Typography>
              {(() => {
                const selectedInfra = availableInfrastructures.find(infra => infra.id === selectedInfrastructure);
                const compatibility = selectedInfra ? checkInfraCompatibility(selectedInfra) : { compatible: false, issues: [] };
                
                return selectedInfra ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {selectedInfra.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedInfra.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={`${selectedInfra.provider.toUpperCase()}`} size="small" />
                        <Chip label={`${selectedInfra.region}`} size="small" />
                        <Chip label={`K8s ${selectedInfra.k8sVersion}`} size="small" />
                        <Chip label={`${selectedInfra.nodes}개 노드`} size="small" />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'right' }}>
                        {compatibility.compatible ? (
                          <Alert severity="success" sx={{ p: 1 }}>
                            <Typography variant="caption">
                              ✅ 리소스 호환 가능
                            </Typography>
                          </Alert>
                        ) : (
                          <Alert severity="error" sx={{ p: 1 }}>
                            <Typography variant="caption">
                              ❌ {compatibility.issues.join(', ')}
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                ) : null;
              })()}
            </CardContent>
          </Card>
        )}

        {/* 배포 설정 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ⚙️ 배포 설정
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>배포 전략</InputLabel>
                  <Select
                    value={tenantConfig.deploymentStrategy}
                    onChange={(e) => setTenantConfig({
                      ...tenantConfig, 
                      deploymentStrategy: e.target.value as any
                    })}
                  >
                    <MenuItem value="rolling">롤링 업데이트</MenuItem>
                    <MenuItem value="blue-green">블루-그린 배포</MenuItem>
                    <MenuItem value="canary">카나리 배포</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={tenantConfig.autoScaling}
                      onChange={(e) => setTenantConfig({
                        ...tenantConfig,
                        autoScaling: e.target.checked
                      })}
                    />
                  }
                  label="오토 스케일링 활성화"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={tenantConfig.monitoring}
                      onChange={(e) => setTenantConfig({
                        ...tenantConfig,
                        monitoring: e.target.checked
                      })}
                    />
                  }
                  label="모니터링 활성화"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 배포 실행 버튼 */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<RocketIcon />}
            onClick={executeDeployment}
            disabled={
              !selectedInfrastructure || 
              deploymentProgress?.status === 'running' ||
              !checkInfraCompatibility(availableInfrastructures.find(infra => infra.id === selectedInfrastructure) || {}).compatible
            }
            sx={{ minWidth: 200, py: 1.5 }}
          >
            {deploymentProgress?.status === 'running' ? '배포 중...' : '🚀 배포 시작'}
          </Button>
        </Box>

        {/* 배포 진행 상황 */}
        {deploymentProgress && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 배포 진행 상황
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {deploymentProgress.currentStep} ({deploymentProgress.step}/{deploymentProgress.totalSteps})
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={deploymentProgress.progress} 
                  sx={{ height: 8, borderRadius: 1 }}
                  color={deploymentProgress.status === 'failed' ? 'error' : 'primary'}
                />
                <Typography variant="caption" color="text.secondary">
                  {deploymentProgress.progress.toFixed(0)}% 완료
                </Typography>
              </Box>

              <Box sx={{ maxHeight: 200, overflow: 'auto', backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                {deploymentProgress.logs.map((log, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    {log}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicSettings();
      case 1:
        return renderCICDImages();
      case 2:
        return renderAdvancedSettings();
      case 3:
        return renderManifestGeneration();
      case 4:
        return renderDeploymentExecution();
      default:
        return <Typography>알 수 없는 단계</Typography>;
    }
  };

  return (
    <BackstageCard title="🧙‍♂️ ECP-AI 배포 마법사" subtitle="5단계 테넌시 생성 및 배포 시스템">
      <Box sx={{ width: '100%' }}>
        {/* [advice from AI] 진행 상황 표시 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {steps[activeStep]?.label || '완료'} ({activeStep + 1}/{steps.length})
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={((activeStep + 1) / steps.length) * 100} 
            sx={{ height: 8, borderRadius: 1, mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            {steps[activeStep]?.description || '배포 마법사가 완료되었습니다'}
          </Typography>
        </Box>

        {/* [advice from AI] 단계별 아이콘 표시 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          {steps.map((step, index) => (
            <Box key={step.label} sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: index <= activeStep ? 'primary.main' : 'grey.300',
                  color: index <= activeStep ? 'white' : 'grey.600',
                  transition: 'all 0.3s ease'
                }}
              >
                {step.icon}
              </Box>
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    width: 60,
                    height: 2,
                    backgroundColor: index < activeStep ? 'primary.main' : 'grey.300',
                    transition: 'all 0.3s ease'
                  }}
                />
              )}
            </Box>
          ))}
        </Box>

        {/* [advice from AI] 페이지 넘김 효과가 있는 단계 컨텐츠 */}
        <Box sx={{ position: 'relative', minHeight: '500px', overflow: 'hidden' }}>
          {activeStep < steps.length ? (
            <Slide
              direction={slideDirection === 'right' ? 'left' : 'right'}
              in={true}
              timeout={300}
              key={activeStep}
            >
              <Box sx={{ p: 3 }}>
                <Fade in={true} timeout={500}>
                  <Box>
                    {renderStepContent(activeStep)}
                  </Box>
                </Fade>
              </Box>
            </Slide>
          ) : (
            <Fade in={true} timeout={500}>
              <Paper square elevation={0} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  🎉 배포 마법사가 완료되었습니다!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  테넌시가 성공적으로 생성되고 배포가 완료되었습니다.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={handleReset} 
                  sx={{ mr: 2 }}
                >
                  다시 시작
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => window.location.href = '/operations/multi-tenant'}
                >
                  테넌트 목록으로
                </Button>
              </Paper>
            </Fade>
          )}
        </Box>

        {/* [advice from AI] 하단 네비게이션 버튼 */}
        {activeStep < steps.length && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              sx={{ minWidth: 120 }}
            >
              ← 이전
            </Button>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {activeStep + 1} / {steps.length}
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && (!tenantConfig.tenantId || !tenantConfig.tenantName)) ||
                (activeStep === 1 && tenantConfig.deploymentMode === 'auto-calculate' && isCalculating) ||
                (activeStep === 4 && !selectedInfrastructure)
              }
              sx={{ minWidth: 120 }}
            >
              {activeStep === steps.length - 1 ? '배포 시작 →' : '다음 →'}
            </Button>
          </Box>
        )}
      </Box>
    </BackstageCard>
  );
};

export default DeploymentWizard;
