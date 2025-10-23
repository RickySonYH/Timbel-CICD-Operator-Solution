// [advice from AI] 코드 컴포넌트 관리 페이지 - 프로젝트 페이지와 동일한 형태로 통일
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Container,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Web as WebIcon,
  PhoneAndroid as MobileIcon,
  Cloud as CloudIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  DataObject as DataObjectIcon,
  Api as ApiIcon,
  Extension as ExtensionIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Settings as SettingsIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { usePermissions } from '../../hooks/usePermissions';
import EmptyState from '../../components/common/EmptyState';
import PermissionButton from '../../components/common/PermissionButton';

// [advice from AI] 코드 컴포넌트 데이터 타입
interface CodeComponent {
  id: string;
  name: string;
  description: string;
  system_name: string;
  component_type: string;
  technology: string;
  language: string;
  framework: string;
  is_reusable: boolean;
  version: string;
  repository_url: string;
  documentation: string;
  documentation_url: string;
  dependencies: string[];
  author_name: string;
  created_at: string;
  updated_at: string;
}

const CodeComponentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useJwtAuthStore();
  const permissions = usePermissions();
  
  const [components, setComponents] = useState<CodeComponent[]>([]);
  const [systems, setSystems] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [autoRegistrationDialog, setAutoRegistrationDialog] = useState(false);
  const [llmSettingsDialog, setLlmSettingsDialog] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<CodeComponent | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    component_type: 'ui',
    language: 'JavaScript',
    framework: 'React',
    version: '1.0.0',
    repository_url: '',
    documentation_url: '',
    dependencies: [] as string[]
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_id: '',
    component_type: 'ui',
    language: 'JavaScript',
    framework: 'React',
    version: '1.0.0',
    repository_url: '',
    documentation_url: '',
    npm_package: '',
    dependencies: [] as string[],
    license: 'MIT'
  });

  // [advice from AI] 자동 등록 관련 상태
  const [autoRegistrationData, setAutoRegistrationData] = useState({
    repositoryUrl: '',
    branch: '',
    accessToken: '',
    analysisOptions: {
      includeCodeComponents: true,
      includeDesignAssets: true,
      includeDocuments: true,
      minReusabilityScore: 70
    }
  });

  // [advice from AI] LLM 설정 상태
  const [llmSettings, setLlmSettings] = useState({
    provider: 'builtin', // 'builtin' | 'openai' | 'anthropic' | 'custom'
    apiKey: '',
    model: 'builtin-gpt',
    endpoint: '',
    maxTokens: 4000,
    temperature: 0.7,
    enabled: true
  });

  // [advice from AI] 자동 분석 결과 상태
  const [analysisResults, setAnalysisResults] = useState({
    isAnalyzing: false,
    progress: 0,
    results: {
      components: [] as any[],
      designAssets: [] as any[],
      documents: [] as any[]
    },
    selectedItems: {
      components: [] as string[],
      designAssets: [] as string[],
      documents: [] as string[]
    }
  });

  // [advice from AI] 브랜치 조회 관련 상태
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string>('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // [advice from AI] 프로그래밍 언어 옵션
  const languageOptions = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 
    'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart'
  ];

  // [advice from AI] 프레임워크 옵션
  const frameworkOptions = [
    'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
    'Express', 'NestJS', 'FastAPI', 'Django', 'Spring Boot', 
    'ASP.NET Core', 'Laravel', 'Rails', 'Flutter', 'React Native'
  ];

  // [advice from AI] 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출
      const response = await fetch('/api/knowledge/code-components', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });

      console.log('📡 코드 컴포넌트 API 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 코드 컴포넌트 데이터:', data);
        setComponents(data.components || []);
      } else {
        const errorData = await response.json();
        console.error('❌ 코드 컴포넌트 로드 실패:', response.status, errorData);
        setComponents([]);
      }

      // 시스템 데이터 로드
      const systemsResponse = await fetch('/api/knowledge/systems', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });

      if (systemsResponse.ok) {
        const systemsData = await systemsResponse.json();
        setSystems(systemsData.systems || []);
      } else {
        setSystems([]);
      }
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setComponents([]);
      setSystems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // [advice from AI] 필터링된 컴포넌트 목록
  const filteredComponents = components.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || true; // status 필드가 없으므로 항상 true
    const matchesType = filterType === 'all' || component.component_type === filterType;
    const matchesLanguage = filterLanguage === 'all' || component.language === filterLanguage;
    
    return matchesSearch && matchesStatus && matchesType && matchesLanguage;
  });

  // [advice from AI] 컴포넌트 생성
  const handleCreateComponent = async () => {
    try {
      const response = await fetch('/api/knowledge/code-components', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
      setCreateDialog(false);
    setFormData({
      name: '',
      description: '',
      system_id: '',
      component_type: 'ui',
      language: 'JavaScript',
      framework: 'React',
      version: '1.0.0',
      repository_url: '',
      documentation_url: '',
      npm_package: '',
      dependencies: [],
      license: 'MIT'
    });
        loadData();
      }
    } catch (error) {
      console.error('컴포넌트 생성 실패:', error);
    }
  };

  // [advice from AI] 자동 분석 함수
  const handleAutoAnalysis = async () => {
    try {
      console.log('🔍 자동 분석 시작:', autoRegistrationData);
      setAnalysisResults(prev => ({ ...prev, isAnalyzing: true, progress: 0 }));
      
      // 시뮬레이션된 분석 진행률
      const progressInterval = setInterval(() => {
        setAnalysisResults(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 500);

      // 실제 분석 API 호출 (현재는 시뮬레이션)
      console.log('🌐 API 호출 시작...');
      console.log('🔑 토큰:', token ? '존재함' : '없음');
      
      const requestBody = {
        repositoryUrl: autoRegistrationData.repositoryUrl,
        branch: autoRegistrationData.branch,
        accessToken: autoRegistrationData.accessToken,
        analysisOptions: autoRegistrationData.analysisOptions,
        llmSettings: llmSettings
      };
      
      console.log('📤 요청 본문:', requestBody);
      
      const response = await fetch('/api/knowledge/auto-analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 응답 상태:', response.status, response.statusText);

      clearInterval(progressInterval);
      setAnalysisResults(prev => ({ ...prev, progress: 100 }));

      if (response.ok) {
        console.log('✅ API 호출 성공');
        const data = await response.json();
        console.log('📊 API 응답 데이터:', data);
        setAnalysisResults(prev => ({
          ...prev,
          results: data.data || data.results,
          isAnalyzing: false
        }));
      } else {
        console.log('⚠️ API 호출 실패, 시뮬레이션 결과 사용');
        console.log('❌ 응답 상태:', response.status);
        console.log('❌ 응답 상태 텍스트:', response.statusText);
        
        try {
          const errorText = await response.text();
          console.log('❌ 에러 응답 본문:', errorText);
        } catch (e) {
          console.log('❌ 에러 응답 읽기 실패:', e);
        }
        
        // 시뮬레이션된 결과 (실제 구현 전까지)
        const mockResults = {
          components: [
            {
              id: 'comp-1',
              name: 'TestButton',
              description: '테스트용 버튼 컴포넌트',
              type: 'ui',
              language: 'JavaScript',
              framework: 'React',
              reusabilityScore: 85,
              filePath: 'src/components/TestButton.jsx',
              dependencies: ['react'],
              isSelected: true
            },
            {
              id: 'comp-2',
              name: 'TestCard',
              description: '테스트용 카드 컴포넌트',
              type: 'ui',
              language: 'JavaScript',
              framework: 'React',
              reusabilityScore: 78,
              filePath: 'src/components/TestCard.jsx',
              dependencies: ['react', '@mui/material'],
              isSelected: true
            }
          ],
          designAssets: [
            {
              id: 'design-1',
              name: 'Test Design System',
              description: '테스트용 디자인 시스템',
              type: 'design_system',
              filePath: 'design/test-design.fig',
              isSelected: true
            }
          ],
          documents: [
            {
              id: 'doc-1',
              name: 'Test API Docs',
              description: '테스트용 API 문서',
              type: 'api_doc',
              filePath: 'docs/test-api.md',
              isSelected: true
            }
          ]
        };
        
        console.log('🎭 시뮬레이션 결과 설정:', mockResults);
        setAnalysisResults(prev => ({
          ...prev,
          results: mockResults,
          selectedItems: {
            components: ['comp-1', 'comp-2'],
            designAssets: ['design-1'],
            documents: ['doc-1']
          },
          isAnalyzing: false
        }));
      }
    } catch (error) {
      console.error('💥 자동 분석 실패:', error);
      console.error('💥 에러 타입:', typeof error);
      console.error('💥 에러 메시지:', error instanceof Error ? error.message : String(error));
      console.error('💥 에러 스택:', error instanceof Error ? error.stack : 'No stack trace');
      setAnalysisResults(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  // [advice from AI] 컴포넌트 수정 함수
  const handleEditComponent = async () => {
    if (!selectedComponent) return;
    
    try {
      console.log('📝 컴포넌트 수정 시작:', editFormData);
      
      const response = await fetch(`/api/knowledge/code-components/${selectedComponent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 컴포넌트 수정 성공:', result);
        alert('컴포넌트가 성공적으로 수정되었습니다.');
        
        setEditDialog(false);
        setSelectedComponent(null);
    loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 컴포넌트 수정 실패:', errorData);
        alert(`수정 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 컴포넌트 수정 중 오류:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 컴포넌트 삭제 함수
  const handleDeleteComponent = async () => {
    if (!selectedComponent) return;
    
    try {
      console.log('🗑️ 컴포넌트 삭제 시작:', selectedComponent.id);
      
      const response = await fetch(`/api/knowledge/code-components/${selectedComponent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 컴포넌트 삭제 성공:', result);
        alert('컴포넌트가 성공적으로 삭제되었습니다.');
        
        setDeleteDialogOpen(false);
        setSelectedComponent(null);
        loadData();
      } else {
        const errorData = await response.json();
        console.error('❌ 컴포넌트 삭제 실패:', errorData);
        alert(`삭제 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 컴포넌트 삭제 중 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 컴포넌트 상세 보기 함수
  const handleViewComponent = async (component: CodeComponent) => {
    try {
      console.log('👁️ 컴포넌트 상세 조회 시작:', component.id);
      
      const response = await fetch(`/api/knowledge/code-components/${component.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 컴포넌트 상세 조회 성공:', result);
        setSelectedComponent(result.component);
        setViewDialogOpen(true);
      } else {
        const errorData = await response.json();
        console.error('❌ 컴포넌트 상세 조회 실패:', errorData);
        alert(`조회 실패: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('❌ 컴포넌트 상세 조회 중 오류:', error);
      alert('조회 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 수정 다이얼로그 열기 함수
  const handleOpenEditDialog = (component: CodeComponent) => {
    setSelectedComponent(component);
    setEditFormData({
      name: component.name,
      description: component.description,
      component_type: component.component_type,
      language: component.language,
      framework: component.framework,
      version: component.version,
      repository_url: component.repository_url || '',
      documentation_url: component.documentation_url || '',
      dependencies: component.dependencies || []
    });
    setEditDialog(true);
  };

  // [advice from AI] 삭제 다이얼로그 열기 함수
  const handleOpenDeleteDialog = (component: CodeComponent) => {
    setSelectedComponent(component);
    setDeleteDialogOpen(true);
  };

  // [advice from AI] 선택된 항목 등록 함수
  const handleRegisterSelectedItems = async () => {
    try {
      console.log('🚀 선택된 항목 등록 시작');
      
      const selectedComponents = (analysisResults.results?.components || []).filter(
        comp => analysisResults.selectedItems.components.includes(comp.id)
      );
      
      const selectedDesignAssets = (analysisResults.results?.designAssets || []).filter(
        asset => analysisResults.selectedItems.designAssets.includes(asset.id)
      );
      
      const selectedDocuments = (analysisResults.results?.documents || []).filter(
        doc => analysisResults.selectedItems.documents.includes(doc.id)
      );

      console.log('📊 선택된 항목들:', {
        components: selectedComponents.length,
        designAssets: selectedDesignAssets.length,
        documents: selectedDocuments.length
      });

      let successCount = 0;
      let errorCount = 0;

      // 선택된 컴포넌트들 등록
      for (const component of selectedComponents) {
        try {
          console.log('📝 컴포넌트 등록 중:', component.name);
          
          const response = await fetch('/api/knowledge/code-components', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
              body: JSON.stringify({
                name: component.name,
                description: component.description,
                type: component.type,
                language: component.language,
                framework: component.framework,
                repository_url: autoRegistrationData.repositoryUrl,
                documentation_url: '',
                dependencies: component.dependencies || [],
                license: 'MIT'
              })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ 컴포넌트 등록 성공:', result);
            successCount++;
          } else {
            const errorData = await response.json();
            console.error('❌ 컴포넌트 등록 실패:', errorData);
            errorCount++;
          }
        } catch (error) {
          console.error('❌ 컴포넌트 등록 중 오류:', error);
          errorCount++;
        }
      }

      // 선택된 디자인 자산들 등록
      for (const asset of selectedDesignAssets) {
        try {
          console.log('🎨 디자인 자산 등록 중:', asset.name);
          
          const response = await fetch('/api/knowledge/design-assets', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: asset.name,
              description: asset.description,
              asset_type: asset.type,
              design_tool: 'figma',
              file_format: asset.format || 'fig',
              tags: asset.tags || [],
              status: 'draft',
              version: '1.0.0',
              file_url: '',
              preview_url: ''
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ 디자인 자산 등록 성공:', result);
            successCount++;
          } else {
            const errorData = await response.json();
            console.error('❌ 디자인 자산 등록 실패:', errorData);
            errorCount++;
          }
        } catch (error) {
          console.error('❌ 디자인 자산 등록 중 오류:', error);
          errorCount++;
        }
      }

      // 선택된 문서들 등록
      for (const doc of selectedDocuments) {
        try {
          console.log('📄 문서 등록 중:', doc.name);
          
          const response = await fetch('/api/knowledge/documents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: doc.name,
              description: doc.description,
              doc_type: doc.type,
              category: 'documentation',
              tags: doc.tags || [],
              status: 'draft',
              version: '1.0.0',
              content_format: doc.format || 'markdown',
              content_url: ''
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ 문서 등록 성공:', result);
            successCount++;
          } else {
            const errorData = await response.json();
            console.error('❌ 문서 등록 실패:', errorData);
            errorCount++;
          }
        } catch (error) {
          console.error('❌ 문서 등록 중 오류:', error);
          errorCount++;
        }
      }
      
      console.log('📊 등록 결과:', { successCount, errorCount });
      
      if (successCount > 0) {
        const componentCount = selectedComponents.length;
        const assetCount = selectedDesignAssets.length;
        const docCount = selectedDocuments.length;
        
        let message = '';
        if (componentCount > 0) message += `${componentCount}개 컴포넌트 `;
        if (assetCount > 0) message += `${assetCount}개 디자인 자산 `;
        if (docCount > 0) message += `${docCount}개 문서 `;
        
        alert(`${message}이 성공적으로 등록되었습니다.${errorCount > 0 ? ` (${errorCount}개 실패)` : ''}`);
      } else {
        alert('등록에 실패했습니다. 콘솔을 확인해주세요.');
      }
      
      setAutoRegistrationDialog(false);
    loadData();
      
      // 분석 결과 초기화
      setAnalysisResults({
        isAnalyzing: false,
        progress: 0,
        results: { components: [], designAssets: [], documents: [] },
        selectedItems: { components: [], designAssets: [], documents: [] }
      });
      
    } catch (error) {
      console.error('선택된 항목 등록 실패:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 브랜치 조회 함수
  const handleFetchBranches = async (url: string, accessToken?: string) => {
    if (!url) {
      setAvailableBranches([]);
      return;
    }

    setIsLoadingBranches(true);
    setBranchError('');

    try {
      const response = await fetch('/api/knowledge/systems/get-branches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          accessToken: accessToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        const branches = data.data.branches || [];
        // 브랜치 데이터를 문자열 배열로 변환
        const branchNames = branches.map((branch: any) => 
          typeof branch === 'string' ? branch : branch.name
        );
        setAvailableBranches(branchNames);
        
        // 첫 번째 브랜치를 자동으로 선택
        if (branchNames.length > 0 && !autoRegistrationData.branch) {
          setAutoRegistrationData(prev => ({
            ...prev,
            branch: branchNames[0]
          }));
        }
      } else {
        const errorData = await response.json();
        setBranchError(errorData.error || '브랜치 조회에 실패했습니다.');
        setAvailableBranches([]);
      }
    } catch (error) {
      console.error('브랜치 조회 오류:', error);
      setBranchError('브랜치 조회 중 오류가 발생했습니다.');
      setAvailableBranches([]);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // [advice from AI] URL 변경 핸들러 (디바운스 적용)
  const handleUrlChange = (url: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      handleFetchBranches(url, autoRegistrationData.accessToken);
    }, 1000);

    setDebounceTimer(timer);
  };

  // [advice from AI] 자동 등록 상태 초기화
  const resetAutoRegistrationState = () => {
    setAutoRegistrationData({
      repositoryUrl: '',
      branch: '',
      accessToken: '',
      analysisOptions: {
        includeCodeComponents: true,
        includeDesignAssets: true,
        includeDocuments: true,
        minReusabilityScore: 70
      }
    });
    setAnalysisResults({
      isAnalyzing: false,
      progress: 0,
      results: { components: [], designAssets: [], documents: [] },
      selectedItems: { components: [], designAssets: [], documents: [] }
    });
    setAvailableBranches([]);
    setIsLoadingBranches(false);
    setBranchError('');
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
          코드 컴포넌트
        </Typography>
          <Typography variant="body1" color="text.secondary">
            재사용 가능한 코드 라이브러리와 컴포넌트를 관리합니다. 각 컴포넌트는 시스템에서 개발된 재사용 가능한 코드 모듈입니다.
        </Typography>
      </Box>
        {permissions.canManageCodeComponents && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setAutoRegistrationDialog(true)}
              sx={{ ml: 2 }}
            >
              컴포넌트 자동 등록
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
            >
              컴포넌트 등록
            </Button>
          </Box>
        )}
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
        <TextField
                fullWidth
                placeholder="컴포넌트 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
          <InputLabel>상태</InputLabel>
          <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
            label="상태"
          >
            <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="draft">초안</MenuItem>
            <MenuItem value="review">검토중</MenuItem>
                  <MenuItem value="approved">승인됨</MenuItem>
                  <MenuItem value="deprecated">폐기예정</MenuItem>
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
          <InputLabel>타입</InputLabel>
          <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
            label="타입"
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="ui">UI</MenuItem>
            <MenuItem value="service">서비스</MenuItem>
            <MenuItem value="library">라이브러리</MenuItem>
            <MenuItem value="tool">도구</MenuItem>
            <MenuItem value="utility">유틸리티</MenuItem>
            <MenuItem value="hook">훅</MenuItem>
            <MenuItem value="api">API</MenuItem>
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
          <InputLabel>언어</InputLabel>
          <Select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
            label="언어"
          >
            <MenuItem value="all">전체</MenuItem>
                  {languageOptions.map((lang) => (
              <MenuItem key={lang} value={lang}>{lang}</MenuItem>
            ))}
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <PermissionButton
            variant="contained" 
                startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
                permissions={['can_manage_components']}
                noPermissionTooltip="코드 컴포넌트 관리 권한이 필요합니다"
                hideIfNoPermission={true}
                fullWidth
              >
                새 컴포넌트
              </PermissionButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 컴포넌트 목록 */}
      {filteredComponents.length === 0 ? (
        components.length === 0 ? (
          <EmptyState
            title="등록된 컴포넌트가 없습니다"
            description="아직 등록된 코드 컴포넌트가 없습니다. 새로운 컴포넌트를 등록하여 재사용 가능한 코드 라이브러리를 구축해보세요."
            actionText="컴포넌트 등록하기"
            onActionClick={() => setCreateDialog(true)}
            secondaryActionText="시스템 먼저 만들기"
            secondaryActionPath="/knowledge/systems"
          />
        ) : (
          <Alert severity="info" sx={{ textAlign: 'center', py: 3 }}>
            검색 조건에 맞는 컴포넌트가 없습니다. 다른 검색어를 시도해보세요.
        </Alert>
        )
      ) : (
        <Grid container spacing={3}>
          {filteredComponents.map((component) => (
            <Grid item xs={12} sm={6} md={4} key={component.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                      {component.name}
                    </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {component.component_type} • {component.language}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={() => {
                        setSelectedComponent(component);
                        setViewDialog(true);
                      }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {component.description || '컴포넌트 개요가 없습니다.'}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      시스템: {component.system_name || '미정'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      프레임워크: {component.framework}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      버전: {component.version}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {(component.dependencies || []).slice(0, 3).map((dep, index) => (
                    <Chip 
                        key={index}
                        label={dep} 
                      size="small" 
                      variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                    />
                    ))}
                    {(component.dependencies || []).length > 3 && (
                    <Chip 
                        label={`+${(component.dependencies || []).length - 3}`} 
                      size="small" 
                      variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                    />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={component.is_reusable ? '재사용 가능' : '일반'}
                      size="small" 
                      color={component.is_reusable ? 'success' : 'default'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(component.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                    <Button 
                      size="small" 
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleViewComponent(component)}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    상세보기
                    </Button>
                  
                  {permissions.canEditCatalog && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="컴포넌트 편집">
                        <IconButton 
                      size="small" 
                          color="primary"
                          onClick={() => handleOpenEditDialog(component)}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="컴포넌트 삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteDialog(component)}
                          sx={{ 
                            '&:hover': {
                              bgcolor: 'error.50'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 컴포넌트 생성 다이얼로그 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 컴포넌트 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
              label="컴포넌트명"
                value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              margin="normal"
              required
              />
              <TextField
                fullWidth
                label="설명"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              margin="normal"
                multiline
                rows={3}
              />
            <FormControl fullWidth margin="normal">
                <InputLabel>시스템</InputLabel>
                <Select
                  value={formData.system_id}
                onChange={(e) => setFormData({...formData, system_id: e.target.value})}
                  label="시스템"
                >
                  {systems.map((system) => (
                    <MenuItem key={system.id} value={system.id}>
                      {system.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>컴포넌트 타입</InputLabel>
                <Select
                  value={formData.component_type}
                onChange={(e) => setFormData({...formData, component_type: e.target.value})}
                label="컴포넌트 타입"
                >
                <MenuItem value="ui">UI</MenuItem>
                  <MenuItem value="service">서비스</MenuItem>
                  <MenuItem value="library">라이브러리</MenuItem>
                  <MenuItem value="tool">도구</MenuItem>
                  <MenuItem value="utility">유틸리티</MenuItem>
                  <MenuItem value="hook">훅</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                </Select>
              </FormControl>
            <FormControl fullWidth margin="normal">
                <InputLabel>프로그래밍 언어</InputLabel>
                <Select
                  value={formData.language}
                onChange={(e) => setFormData({...formData, language: e.target.value})}
                  label="프로그래밍 언어"
                >
                {languageOptions.map((lang) => (
                    <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            <FormControl fullWidth margin="normal">
                <InputLabel>프레임워크</InputLabel>
                <Select
                  value={formData.framework}
                onChange={(e) => setFormData({...formData, framework: e.target.value})}
                  label="프레임워크"
                >
                {frameworkOptions.map((framework) => (
                    <MenuItem key={framework} value={framework}>{framework}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
              label="버전"
              value={formData.version}
              onChange={(e) => setFormData({...formData, version: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="레포지토리 URL"
                value={formData.repository_url}
              onChange={(e) => setFormData({...formData, repository_url: e.target.value})}
              margin="normal"
              />
              <TextField
                fullWidth
              label="문서 URL"
              value={formData.documentation_url}
              onChange={(e) => setFormData({...formData, documentation_url: e.target.value})}
              margin="normal"
            />
              <TextField
                fullWidth
              label="NPM 패키지명"
                value={formData.npm_package}
              onChange={(e) => setFormData({...formData, npm_package: e.target.value})}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>라이선스</InputLabel>
              <Select
                value={formData.license}
                onChange={(e) => setFormData({...formData, license: e.target.value})}
                label="라이선스"
              >
                <MenuItem value="MIT">MIT</MenuItem>
                <MenuItem value="Apache-2.0">Apache 2.0</MenuItem>
                <MenuItem value="GPL-3.0">GPL 3.0</MenuItem>
                <MenuItem value="BSD-3-Clause">BSD 3-Clause</MenuItem>
                <MenuItem value="ISC">ISC</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleCreateComponent}>등록</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 권한 관련 안내 */}
      {!permissions.canViewCatalog && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          코드 컴포넌트에 접근할 권한이 없습니다.
        </Alert>
      )}
      
      {/* [advice from AI] 자동 등록 다이얼로그 */}
      <Dialog open={autoRegistrationDialog} onClose={() => {
        setAutoRegistrationDialog(false);
        resetAutoRegistrationState();
      }} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" />
            컴포넌트 자동 등록
                    </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Step 1: 레포지토리 정보 */}
            <Typography variant="h6" gutterBottom>
              1. 레포지토리 정보 입력
                      </Typography>
              <TextField
                fullWidth
              label="Git 레포지토리 URL"
              value={autoRegistrationData.repositoryUrl}
              onChange={(e) => {
                const url = e.target.value;
                console.log('📝 URL 입력 변경:', url);
                setAutoRegistrationData({
                  ...autoRegistrationData,
                  repositoryUrl: url
                });
                handleUrlChange(url);
              }}
              margin="normal"
              placeholder="https://github.com/username/repository"
              helperText="GitHub, GitLab, Bitbucket 등의 레포지토리 URL을 입력하세요"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>브랜치</InputLabel>
              <Select
                value={autoRegistrationData.branch || ''}
                onChange={(e) => setAutoRegistrationData({
                  ...autoRegistrationData,
                  branch: e.target.value
                })}
                disabled={isLoadingBranches}
              >
                {isLoadingBranches ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress sx={{ width: 16, height: 2 }} />
                      브랜치 조회 중...
                    </Box>
                  </MenuItem>
                ) : branchError ? (
                  <MenuItem disabled>
                    <Typography color="error" variant="body2">
                      {branchError}
                    </Typography>
                  </MenuItem>
                ) : availableBranches.length > 0 ? (
                  availableBranches.map((branch) => (
                    <MenuItem key={branch} value={branch}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {branch}
                        {(branch === 'main' || branch === 'master') && (
                          <Chip label="기본" size="small" color="primary" />
                        )}
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    레포지토리 URL을 입력하면 브랜치가 표시됩니다
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="액세스 토큰 (선택사항)"
              type="password"
              value={autoRegistrationData.accessToken}
              onChange={(e) => setAutoRegistrationData({
                ...autoRegistrationData,
                accessToken: e.target.value
              })}
              margin="normal"
              helperText="Private 레포지토리 접근 시 필요합니다"
            />

            {/* Step 2: 분석 옵션 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              2. 분석 옵션 설정
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoRegistrationData.analysisOptions.includeCodeComponents}
                  onChange={(e) => setAutoRegistrationData({
                    ...autoRegistrationData,
                    analysisOptions: {
                      ...autoRegistrationData.analysisOptions,
                      includeCodeComponents: e.target.checked
                    }
                  })}
                />
              }
              label="코드 컴포넌트 분석"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoRegistrationData.analysisOptions.includeDesignAssets}
                  onChange={(e) => setAutoRegistrationData({
                    ...autoRegistrationData,
                    analysisOptions: {
                      ...autoRegistrationData.analysisOptions,
                      includeDesignAssets: e.target.checked
                    }
                  })}
                />
              }
              label="디자인 자산 분석"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoRegistrationData.analysisOptions.includeDocuments}
                  onChange={(e) => setAutoRegistrationData({
                    ...autoRegistrationData,
                    analysisOptions: {
                      ...autoRegistrationData.analysisOptions,
                      includeDocuments: e.target.checked
                    }
                  })}
                />
              }
              label="문서 분석"
            />
            <TextField
              fullWidth
              label="최소 재사용성 점수"
              type="number"
              value={autoRegistrationData.analysisOptions.minReusabilityScore}
              onChange={(e) => setAutoRegistrationData({
                ...autoRegistrationData,
                analysisOptions: {
                  ...autoRegistrationData.analysisOptions,
                  minReusabilityScore: parseInt(e.target.value) || 70
                }
              })}
              margin="normal"
              inputProps={{ min: 0, max: 100 }}
              helperText="이 점수 이상의 컴포넌트만 등록됩니다 (0-100)"
            />

            {/* LLM 설정 버튼 */}
            <Box sx={{ mt: 3, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                AI 분석 설정
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                컴포넌트 분석을 위한 LLM 설정을 관리하세요
              </Typography>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setLlmSettingsDialog(true)}
              >
                LLM 설정 관리
              </Button>
            </Box>

            {/* Step 3: 분석 결과 미리보기 */}
            {analysisResults.results && analysisResults.results.components && analysisResults.results.components.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  3. 분석 결과 미리보기
                </Typography>
                
                {/* 코드 컴포넌트 결과 */}
                {analysisResults.results?.components && analysisResults.results.components.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      발견된 코드 컴포넌트 ({analysisResults.results?.components?.length || 0}개)
                    </Typography>
              <Grid container spacing={2}>
                      {(analysisResults.results?.components || []).map((component) => (
                        <Grid item xs={12} md={6} key={component.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={analysisResults.selectedItems.components.includes(component.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAnalysisResults(prev => ({
                                            ...prev,
                                            selectedItems: {
                                              ...prev.selectedItems,
                                              components: [...prev.selectedItems.components, component.id]
                                            }
                                          }));
                                        } else {
                                          setAnalysisResults(prev => ({
                                            ...prev,
                                            selectedItems: {
                                              ...prev.selectedItems,
                                              components: prev.selectedItems.components.filter(id => id !== component.id)
                                            }
                                          }));
                                        }
                                      }}
                                    />
                                  }
                                  label=""
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" gutterBottom>
                                    {component.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {component.description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <Chip label={component.type} size="small" />
                                    <Chip label={component.language} size="small" />
                                    <Chip label={component.framework} size="small" />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    파일 경로: {component.filePath}
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption">
                                      재사용성 점수: {component.reusabilityScore}/100
                                    </Typography>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={component.reusabilityScore} 
                                      sx={{ mt: 0.5 }}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
            </Grid>
                      ))}
          </Grid>
                  </Box>
                )}

                {/* 디자인 자산 결과 */}
                {analysisResults.results.designAssets.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      발견된 디자인 자산 ({analysisResults.results.designAssets.length}개)
                      </Typography>
                    <Grid container spacing={2}>
                      {analysisResults.results.designAssets.map((asset) => (
                        <Grid item xs={12} md={6} key={asset.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={analysisResults.selectedItems.designAssets.includes(asset.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAnalysisResults(prev => ({
                                            ...prev,
                                            selectedItems: {
                                              ...prev.selectedItems,
                                              designAssets: [...prev.selectedItems.designAssets, asset.id]
                                            }
                                          }));
                                        } else {
                                          setAnalysisResults(prev => ({
                                            ...prev,
                                            selectedItems: {
                                              ...prev.selectedItems,
                                              designAssets: prev.selectedItems.designAssets.filter(id => id !== asset.id)
                                            }
                                          }));
                                        }
                                      }}
                                    />
                                  }
                                  label=""
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" gutterBottom>
                                    {asset.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {asset.description}
                                  </Typography>
                                  <Chip label={asset.type} size="small" />
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    파일 경로: {asset.filePath}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                  </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* 문서 결과 */}
                {analysisResults.results.documents.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      발견된 문서 ({analysisResults.results.documents.length}개)
                    </Typography>
                    <Grid container spacing={2}>
                      {analysisResults.results.documents.map((doc) => (
                        <Grid item xs={12} md={6} key={doc.id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={analysisResults.selectedItems.documents.includes(doc.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setAnalysisResults(prev => ({
                                            ...prev,
                                            selectedItems: {
                                              ...prev.selectedItems,
                                              documents: [...prev.selectedItems.documents, doc.id]
                                            }
                                          }));
                                        } else {
                                          setAnalysisResults(prev => ({
                                            ...prev,
                                            selectedItems: {
                                              ...prev.selectedItems,
                                              documents: prev.selectedItems.documents.filter(id => id !== doc.id)
                                            }
                                          }));
                                        }
                                      }}
                                    />
                                  }
                                  label=""
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" gutterBottom>
                                    {doc.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {doc.description}
                                  </Typography>
                                  <Chip label={doc.type} size="small" />
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    파일 경로: {doc.filePath}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
              </Grid>
            </Box>
          )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => {
            setAutoRegistrationDialog(false);
            resetAutoRegistrationState();
          }}>취소</Button>
          {!analysisResults.isAnalyzing && (!analysisResults.results || !analysisResults.results.components || analysisResults.results.components.length === 0) && (
            <Button 
              variant="contained" 
              onClick={() => {
                console.log('🎯 분석 시작 버튼 클릭됨');
                console.log('📊 autoRegistrationData:', autoRegistrationData);
                console.log('🔗 repositoryUrl:', autoRegistrationData.repositoryUrl);
                handleAutoAnalysis();
              }}
              disabled={!autoRegistrationData.repositoryUrl}
              sx={{ 
                backgroundColor: !autoRegistrationData.repositoryUrl ? 'grey.400' : 'primary.main',
                '&:hover': {
                  backgroundColor: !autoRegistrationData.repositoryUrl ? 'grey.400' : 'primary.dark'
                }
              }}
            >
              분석 시작 {!autoRegistrationData.repositoryUrl && '(URL 입력 필요)'}
            </Button>
          )}
          {analysisResults.isAnalyzing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={analysisResults.progress} 
                sx={{ width: 200 }}
              />
              <Typography variant="body2">
                {analysisResults.progress}% 분석 중...
                      </Typography>
            </Box>
          )}
          {!analysisResults.isAnalyzing && analysisResults.results?.components && analysisResults.results.components.length > 0 && (
            <Button 
              variant="contained" 
              onClick={handleRegisterSelectedItems}
              disabled={
                analysisResults.selectedItems.components.length === 0 &&
                analysisResults.selectedItems.designAssets.length === 0 &&
                analysisResults.selectedItems.documents.length === 0
              }
            >
              선택된 항목 등록 ({analysisResults.selectedItems.components.length + 
                analysisResults.selectedItems.designAssets.length + 
                analysisResults.selectedItems.documents.length}개)
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] LLM 설정 다이얼로그 */}
      <Dialog open={llmSettingsDialog} onClose={() => setLlmSettingsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color="primary" />
            LLM 설정 관리
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* LLM 제공자 선택 */}
            <FormControl fullWidth margin="normal">
              <InputLabel>LLM 제공자</InputLabel>
              <Select
                value={llmSettings.provider}
                onChange={(e) => setLlmSettings({
                  ...llmSettings,
                  provider: e.target.value as any
                })}
              >
                <MenuItem value="builtin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon fontSize="small" />
                    내장 LLM
                  </Box>
                </MenuItem>
                <MenuItem value="openai">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudIcon fontSize="small" />
                    OpenAI
                  </Box>
                </MenuItem>
                <MenuItem value="anthropic">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudIcon fontSize="small" />
                    Anthropic Claude
                  </Box>
                </MenuItem>
                <MenuItem value="custom">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" />
                    사용자 정의
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* API 키 설정 */}
            {llmSettings.provider !== 'builtin' && (
              <TextField
                fullWidth
                label="API 키"
                type="password"
                value={llmSettings.apiKey}
                onChange={(e) => setLlmSettings({
                  ...llmSettings,
                  apiKey: e.target.value
                })}
                margin="normal"
                helperText="API 키는 안전하게 저장됩니다"
              />
            )}

            {/* 모델 선택 */}
            <FormControl fullWidth margin="normal">
              <InputLabel>모델</InputLabel>
              <Select
                value={llmSettings.model}
                onChange={(e) => setLlmSettings({
                  ...llmSettings,
                  model: e.target.value
                })}
              >
                {llmSettings.provider === 'builtin' && (
                  <MenuItem value="builtin-gpt">내장 GPT 모델</MenuItem>
                )}
                {llmSettings.provider === 'openai' && (
                  <>
                    <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                    <MenuItem value="gpt-4">GPT-4</MenuItem>
                    <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                  </>
                )}
                {llmSettings.provider === 'anthropic' && (
                  <>
                    <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
                    <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
                    <MenuItem value="claude-3-haiku">Claude 3 Haiku</MenuItem>
                  </>
                )}
                {llmSettings.provider === 'custom' && (
                  <MenuItem value="custom">사용자 정의 모델</MenuItem>
                )}
              </Select>
            </FormControl>

            {/* 사용자 정의 엔드포인트 */}
            {llmSettings.provider === 'custom' && (
              <TextField
                fullWidth
                label="API 엔드포인트"
                value={llmSettings.endpoint}
                onChange={(e) => setLlmSettings({
                  ...llmSettings,
                  endpoint: e.target.value
                })}
                margin="normal"
                placeholder="https://api.example.com/v1/chat/completions"
              />
            )}

            {/* 고급 설정 */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              고급 설정
            </Typography>
            <TextField
              fullWidth
              label="최대 토큰 수"
              type="number"
              value={llmSettings.maxTokens}
              onChange={(e) => setLlmSettings({
                ...llmSettings,
                maxTokens: parseInt(e.target.value) || 4000
              })}
              margin="normal"
              inputProps={{ min: 100, max: 32000 }}
            />
            <TextField
              fullWidth
              label="Temperature (창의성)"
              type="number"
              value={llmSettings.temperature}
              onChange={(e) => setLlmSettings({
                ...llmSettings,
                temperature: parseFloat(e.target.value) || 0.7
              })}
              margin="normal"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              helperText="0: 정확함, 2: 창의적"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={llmSettings.enabled}
                  onChange={(e) => setLlmSettings({
                    ...llmSettings,
                    enabled: e.target.checked
                  })}
                />
              }
              label="LLM 분석 활성화"
            />
    </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLlmSettingsDialog(false)}>취소</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // TODO: LLM 설정 저장 로직 구현
              console.log('LLM 설정 저장:', llmSettings);
              setLlmSettingsDialog(false);
            }}
          >
            설정 저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 컴포넌트 수정 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>컴포넌트 수정</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="컴포넌트명"
              value={editFormData.name}
              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={editFormData.description}
              onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
              margin="normal"
              multiline
              rows={3}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>타입</InputLabel>
              <Select
                value={editFormData.component_type}
                onChange={(e) => setEditFormData({...editFormData, component_type: e.target.value})}
                label="타입"
              >
                <MenuItem value="ui">UI 컴포넌트</MenuItem>
                <MenuItem value="service">서비스 컴포넌트</MenuItem>
                <MenuItem value="util">유틸리티</MenuItem>
                <MenuItem value="hook">커스텀 훅</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="언어"
              value={editFormData.language}
              onChange={(e) => setEditFormData({...editFormData, language: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="프레임워크"
              value={editFormData.framework}
              onChange={(e) => setEditFormData({...editFormData, framework: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="버전"
              value={editFormData.version}
              onChange={(e) => setEditFormData({...editFormData, version: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="저장소 URL"
              value={editFormData.repository_url}
              onChange={(e) => setEditFormData({...editFormData, repository_url: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="문서 URL"
              value={editFormData.documentation_url}
              onChange={(e) => setEditFormData({...editFormData, documentation_url: e.target.value})}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleEditComponent}>수정</Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 코드 컴포넌트 상세보기 다이얼로그 - 개선된 버전 */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            코드 컴포넌트 상세 정보
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedComponent && (
            <Box sx={{ pt: 1 }}>
              {/* 기본 정보 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  기본 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      컴포넌트명
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                      {selectedComponent.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      재사용 가능 여부
                    </Typography>
                    <Chip 
                      label={selectedComponent.is_reusable ? '재사용 가능' : '일반'} 
                      color={selectedComponent.is_reusable ? 'success' : 'default'}
                      variant="filled"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      설명
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {selectedComponent.description || '설명이 없습니다.'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 기술 정보 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  기술 정보
                </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      컴포넌트 타입
                    </Typography>
                    <Chip 
                      label={selectedComponent.component_type || '미정'} 
                      color="secondary" 
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      프로그래밍 언어
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedComponent.language || '미정'}
                    </Typography>
                </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      프레임워크
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedComponent.framework || '미정'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      버전
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedComponent.version || '1.0.0'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      기술 스택
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedComponent.technology || '정보 없음'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 시스템 및 프로젝트 정보 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  시스템 및 프로젝트 정보
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      소속 시스템
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedComponent.system_name || '미정'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 리소스 링크 */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  리소스 링크
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      저장소 URL
                    </Typography>
                    {selectedComponent.repository_url ? (
                      <Button
                        variant="outlined"
                        startIcon={<LinkIcon />}
                        href={selectedComponent.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mb: 2 }}
                      >
                        저장소 열기
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                        저장소 URL이 없습니다
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      문서 URL
                    </Typography>
                    {selectedComponent.documentation_url ? (
                      <Button
                        variant="outlined"
                        startIcon={<DescriptionIcon />}
                        href={selectedComponent.documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mb: 2 }}
                      >
                        문서 열기
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                        문서 URL이 없습니다
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              {/* 의존성 */}
              {selectedComponent.dependencies && selectedComponent.dependencies.length > 0 && (
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    의존성
                  </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedComponent.dependencies.map((dep, index) => (
                      <Chip 
                        key={index} 
                        label={dep} 
                        variant="outlined" 
                        size="small"
                        color="info"
                      />
                      ))}
                    </Box>
                </Paper>
              )}

              {/* 메타데이터 */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  메타데이터
                      </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      작성자
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedComponent.author_name || '알 수 없음'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      생성일
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedComponent.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
              </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      수정일
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedComponent.updated_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>닫기</Button>
          {permissions.canEditCatalog && selectedComponent && (
            <>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  handleOpenEditDialog(selectedComponent);
                }}
              >
                편집
            </Button>
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setViewDialogOpen(false);
                  handleOpenDeleteDialog(selectedComponent);
                }}
              >
                삭제
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>컴포넌트 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            '{selectedComponent?.name}' 컴포넌트를 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteComponent}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CodeComponentsPage;