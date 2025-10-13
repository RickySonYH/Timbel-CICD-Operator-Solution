// [advice from AI] 프로젝트 관리 페이지 - 도메인과 시스템 중간 계층

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Avatar, Divider, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel
} from '@mui/material';
import {
  Assignment as ProjectIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Business as DomainIcon,
  Computer as SystemIcon,
  Schedule as DeadlineIcon,
  PriorityHigh as UrgencyIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import { useRoleBasedVisibility } from '../../hooks/usePermissions';

// [advice from AI] 프로젝트 정보 인터페이스
interface ProjectInfo {
  id: string;
  name: string;
  domain_id?: string;
  domain_name?: string;
  project_overview?: string;
  target_system_name?: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  deadline?: string;
  project_status: 'planning' | 'in_progress' | 'development' | 'testing' | 'completed' | 'on_hold' | 'cancelled';
  approval_status: 'pending' | 'approved' | 'rejected' | 'draft';
  created_by_name?: string;
  approved_by_name?: string;
  approved_at?: string;
  connected_systems_count?: number;
  created_at: string;
  updated_at: string;
  // 새로 추가된 상세 정보
  documents?: ProjectDocument[];
  work_groups?: WorkGroup[];
  similar_systems?: SystemOption[];
  metadata?: any;
}

// [advice from AI] 도메인 정보 인터페이스
interface DomainOption {
  id: string;
  name: string;
}

// [advice from AI] 시스템 정보 인터페이스 - 유사 시스템 선택용
interface SystemOption {
  id: string;
  name: string;
  title?: string;
  description?: string;
  version?: string;
}

// [advice from AI] 프로젝트 문서 인터페이스
interface ProjectDocument {
  id?: string;
  document_type: 'voc' | 'requirements' | 'design';
  file?: File; // 새로 업로드할 때만 사용
  title: string;
  description?: string;
  // 서버에서 가져온 문서 정보 (DB 직접 저장 방식)
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

// [advice from AI] 작업 그룹 인터페이스
interface WorkGroup {
  id?: string;
  name: string;
  description?: string;
  assigned_pe?: string;
  // 서버에서 가져온 작업 그룹 정보
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'on_hold';
  order_index?: number;
  created_by?: string;
  created_by_name?: string;
  assigned_pe_name?: string;
  created_at?: string;
}

const ProjectManagement: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useJwtAuthStore();
  const { showManageButtons, permissions } = useRoleBasedVisibility();

  // [advice from AI] 상태 관리
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectInfo[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [selectedSimilarSystems, setSelectedSimilarSystems] = useState<SystemOption[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  // 수정용 상태
  const [editSimilarSystems, setEditSimilarSystems] = useState<SystemOption[]>([]);
  const [editProjectDocuments, setEditProjectDocuments] = useState<ProjectDocument[]>([]);
  const [editWorkGroups, setEditWorkGroups] = useState<WorkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // [advice from AI] 다이얼로그 상태
  const [detailDialog, setDetailDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null);
  const [editProject, setEditProject] = useState<Partial<ProjectInfo>>({});
  const [newProject, setNewProject] = useState<Partial<ProjectInfo>>({
    name: '',
    domain_id: '',
    project_overview: '',
    target_system_name: '',
    urgency_level: 'medium',
    deadline: '',
    project_status: 'planning',
    is_urgent_development: false,
    urgent_reason: '',
    expected_completion_hours: ''
  });

  // [advice from AI] 필터 상태
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // [advice from AI] 동적 API URL 결정 로직 (수정됨)
  const getApiUrl = (): string => {
    const currentHost = window.location.host;
    console.log('🌐 현재 호스트:', currentHost);
    
    if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
      console.log('🏠 로컬 환경 - 직접 백엔드 포트 사용');
      return 'http://localhost:3001';
    } else {
      console.log('🌍 외부 환경 - 포트 3001 사용');
      return `http://${currentHost.split(':')[0]}:3001`;
    }
  };

  // [advice from AI] 프로젝트 목록 조회
  const fetchProjects = async () => {
    try {
      console.log('🔄 프로젝트 목록 요청 시작...');
      console.log(`  - 요청 URL: ${getApiUrl()}/api/projects`);
      console.log(`  - 요청 헤더: {Authorization: 'Bearer ${token?.substring(0, 50)}...'}`);

      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects` : '/api/projects';
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📡 API 응답 상태:', response.status);
      console.log('📡 API 응답 헤더:', Object.fromEntries(response.headers));

      if (!response.ok) {
        throw new Error(`프로젝트 목록을 불러올 수 없습니다 (상태: ${response.status})`);
      }

      const result = await response.json();
      console.log('📊 받은 데이터:', result);
      console.log('📊 데이터 타입:', typeof result);
      console.log('📊 success 필드:', result.success);
      console.log('📊 data 필드:', result.data);
      console.log('📊 data 배열 길이:', result.data?.length);

      if (result.success) {
        const projectsData = result.data || [];
        setProjects(projectsData);
        setFilteredProjects(projectsData);
        console.log('✅ 프로젝트 데이터 설정 완료:', projectsData.length, '개');
      } else {
        setError('프로젝트 데이터를 처리할 수 없습니다');
      }
    } catch (err) {
      console.error('❌ 프로젝트 로딩 오류:', err);
      console.error('❌ 오류 스택:', (err as Error).stack);
      setError(err instanceof Error ? err.message : '프로젝트 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      console.log('🏁 로딩 상태 해제');
      setLoading(false);
    }
  };

  // [advice from AI] 도메인 목록 조회 (프로젝트 생성 시 사용)
  const fetchDomains = async () => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/domains` : '/api/domains';
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDomains(result.data || []);
        }
      }
    } catch (error) {
      console.error('도메인 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 시스템 목록 조회 (유사 시스템 선택용)
  const fetchSystems = async () => {
    try {
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/catalog/systems` : '/api/catalog/systems';
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSystems(result.data?.systems || result.data || []);
        }
      }
    } catch (error) {
      console.error('시스템 목록 로드 실패:', error);
    }
  };

  // [advice from AI] 유사 시스템 관리 함수들
  const addSimilarSystem = (systemId: string) => {
    const system = systems.find(s => s.id === systemId);
    if (system && !selectedSimilarSystems.find(s => s.id === systemId)) {
      setSelectedSimilarSystems([...selectedSimilarSystems, system]);
    }
  };

  const removeSimilarSystem = (systemId: string) => {
    setSelectedSimilarSystems(selectedSimilarSystems.filter(s => s.id !== systemId));
  };

  // [advice from AI] 문서 관리 함수들
  const addProjectDocument = (documentType: 'voc' | 'requirements' | 'design', file: File, title: string, description?: string) => {
    const newDocument: ProjectDocument = {
      id: `temp-${Date.now()}`,
      document_type: documentType,
      file,
      title,
      description
    };
    setProjectDocuments([...projectDocuments, newDocument]);
  };

  const removeProjectDocument = (documentId: string) => {
    setProjectDocuments(projectDocuments.filter(doc => doc.id !== documentId));
  };

  // [advice from AI] 작업 그룹 관리 함수들
  const addWorkGroup = (name: string, description?: string) => {
    const newWorkGroup: WorkGroup = {
      id: `temp-${Date.now()}`,
      name,
      description
    };
    setWorkGroups([...workGroups, newWorkGroup]);
  };

  const removeWorkGroup = (groupId: string) => {
    setWorkGroups(workGroups.filter(group => group.id !== groupId));
  };

  const updateWorkGroup = (groupId: string, updates: Partial<WorkGroup>) => {
    setWorkGroups(workGroups.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    ));
  };

  // [advice from AI] 문서 다운로드 함수 - 개선된 버전
  const handleDownloadDocument = async (projectId: string, documentId: string, filename: string) => {
    try {
      console.log('🚀 문서 다운로드 시작:', { projectId, documentId, filename });
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects/${projectId}/documents/${documentId}/download` : `/api/projects/${projectId}/documents/${documentId}/download`;
      
      console.log('📡 다운로드 URL:', fullUrl);
      
      // 다운로드 시작 알림
      const downloadingAlert = setTimeout(() => {
        alert('문서를 다운로드하고 있습니다. 잠시만 기다려주세요...');
      }, 1000);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/octet-stream'
        }
      });
      
      clearTimeout(downloadingAlert);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('❌ 서버 응답 오류 (JSON):', response.status, errorData);
        } catch {
          errorData = await response.text();
          console.error('❌ 서버 응답 오류 (텍스트):', response.status, errorData);
        }
        throw new Error(`문서 다운로드에 실패했습니다 (${response.status}): ${errorData.message || errorData}`);
      }
      
      // Content-Type 및 파일 크기 확인
      const contentType = response.headers.get('Content-Type');
      const contentLength = response.headers.get('Content-Length');
      console.log('📄 파일 정보:', { contentType, contentLength });
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('다운로드된 파일이 비어있습니다.');
      }
      
      // 파일 다운로드 실행
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 메모리 정리
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ 문서 다운로드 완료:', filename, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // 성공 알림
      alert(`문서 "${filename}"가 성공적으로 다운로드되었습니다.`);
      
    } catch (error) {
      console.error('❌ 문서 다운로드 실패:', error);
      alert(`문서 다운로드에 실패했습니다:\n${(error as Error).message}\n\n다시 시도해주세요.`);
    }
  };

  // [advice from AI] 프로젝트 생성 다이얼로그 초기화
  const resetCreateDialog = () => {
    setNewProject({
      name: '',
      domain_id: '',
      project_overview: '',
      target_system_name: '',
      urgency_level: 'medium',
      deadline: '',
      project_status: 'planning'
    });
    setSelectedSimilarSystems([]);
    setProjectDocuments([]);
    setWorkGroups([]);
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    console.log('🎯 ProjectManagement 마운트됨');
    console.log('  - isAuthenticated:', !!token);
    console.log('  - user:', user);
    console.log('  - token 존재:', !!token);

    if (token) {
      fetchProjects();
      fetchDomains();
      fetchSystems();
    }
  }, [token]);

  // [advice from AI] 필터링 로직
  useEffect(() => {
    let filtered = projects;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.project_status === filterStatus);
    }

    if (filterUrgency !== 'all') {
      filtered = filtered.filter(project => project.urgency_level === filterUrgency);
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.project_overview?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.target_system_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  }, [projects, filterStatus, filterUrgency, searchTerm]);

  // [advice from AI] 프로젝트 상세 보기 - 강화된 로깅
  const handleViewProject = async (project: ProjectInfo) => {
    try {
      console.log('🔍 프로젝트 상세 조회 시작:', project.id, project.name);
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects/${project.id}` : `/api/projects/${project.id}`;
      
      console.log('📡 상세 조회 URL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📥 응답 상태:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 응답 데이터:', result);
        
        if (result.success) {
          console.log('✅ 상세 데이터 로드 성공');
          console.log('📊 전체 응답 데이터:', JSON.stringify(result.data, null, 2));
          console.log('  - 문서 개수:', result.data.documents?.length || 0);
          console.log('  - 작업 그룹 개수:', result.data.work_groups?.length || 0);
          console.log('  - 유사 시스템 개수:', result.data.similar_systems?.length || 0);
          
          // 문서 데이터 상세 로그
          if (result.data.documents && result.data.documents.length > 0) {
            console.log('📁 문서 상세 정보:');
            result.data.documents.forEach((doc: any, index: number) => {
              console.log(`  문서 ${index + 1}:`, {
                id: doc.id,
                title: doc.title,
                type: doc.document_type,
                filename: doc.original_filename,
                size: doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)}MB` : 'unknown'
              });
            });
          } else {
            console.log('❌ 문서 데이터가 비어있습니다');
            console.log('❌ result.data.documents 값:', result.data.documents);
            console.log('❌ result.data 전체 키들:', Object.keys(result.data));
          }
          
          // 강제로 데이터 설정 확인
          console.log('🔧 setSelectedProject 호출 전 데이터 검증:');
          console.log('  - documents 존재:', !!result.data.documents);
          console.log('  - work_groups 존재:', !!result.data.work_groups);
          
          setSelectedProject(result.data);
        } else {
          console.warn('⚠️ API 응답 실패, 기본 데이터 사용:', result);
          setSelectedProject(project);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP 오류:', response.status, errorText);
        setSelectedProject(project);
      }
    } catch (error) {
      console.error('❌ 프로젝트 상세 정보 로드 실패:', error);
      setSelectedProject(project);
    }
    
    setDetailDialog(true);
  };

  // [advice from AI] 프로젝트 생성 - 파일 업로드 및 작업 그룹 지원
  const handleCreateProject = async () => {
    try {
      if (!newProject.name || !newProject.domain_id) {
        alert('프로젝트명과 소속 도메인을 입력해주세요.');
        return;
      }

      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects` : '/api/projects';
      
      // [advice from AI] FormData 생성하여 파일과 데이터 함께 전송
      const formData = new FormData();
      
      // 기본 프로젝트 정보
      formData.append('name', newProject.name);
      formData.append('domain_id', newProject.domain_id);
      formData.append('project_overview', newProject.project_overview || '');
      formData.append('target_system_name', newProject.target_system_name || '');
      formData.append('urgency_level', newProject.urgency_level || 'medium');
      formData.append('deadline', newProject.deadline || '');
      
      // 유사 시스템 정보
      formData.append('similar_systems', JSON.stringify(selectedSimilarSystems.map(system => ({
        id: system.id,
        name: system.name,
        version: system.version,
        description: system.description
      }))));
      
      // 작업 그룹 정보
      formData.append('work_groups', JSON.stringify(workGroups.map(group => ({
        name: group.name,
        description: group.description
      }))));
      
      // 문서 파일들 및 메타데이터
      const documentMetadata: any[] = [];
      let actualFileCount = 0;
      
      projectDocuments.forEach((doc, index) => {
        console.log(`📄 문서 ${index + 1}:`, {
          title: doc.title,
          type: doc.document_type,
          hasFile: !!doc.file,
          fileName: doc.file?.name,
          fileSize: doc.file?.size
        });
        
        if (doc.file) {
          formData.append('documents', doc.file);
          documentMetadata.push({
            document_type: doc.document_type,
            title: doc.title,
            description: doc.description
          });
          actualFileCount++;
          console.log(`✅ 파일 ${actualFileCount} FormData에 추가:`, doc.file.name);
        }
      });
      
      formData.append('document_metadata', JSON.stringify(documentMetadata));
      
      console.log('🚀 프로젝트 생성 요청 전송...');
      console.log('  - 전체 문서 개수:', projectDocuments.length);
      console.log('  - 실제 파일 개수:', actualFileCount);
      console.log('  - 작업 그룹 개수:', workGroups.length);
      console.log('  - 유사 시스템 개수:', selectedSimilarSystems.length);
      console.log('  - FormData 키들:', Array.from(formData.keys()));
      
      // FormData 내용 상세 로그
      const formDataEntries = Array.from(formData.entries());
      formDataEntries.forEach(([key, value]) => {
        if (value instanceof File) {
          console.log(`📎 FormData[${key}]:`, value.name, `(${value.size} bytes)`);
        } else {
          console.log(`📝 FormData[${key}]:`, typeof value === 'string' ? value.substring(0, 100) + '...' : value);
        }
      });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Content-Type은 FormData 사용 시 자동 설정됨
        },
        body: formData
      });

      console.log('📥 서버 응답 상태:', response.status, response.statusText);
      
      let result;
      try {
        result = await response.json();
        console.log('📊 서버 응답 데이터:', result);
      } catch (parseError) {
        console.error('❌ 응답 JSON 파싱 실패:', parseError);
        const responseText = await response.text();
        console.error('❌ 응답 원본 텍스트:', responseText);
        throw new Error(`서버 응답을 처리할 수 없습니다: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error('❌ HTTP 오류:', response.status, result);
        throw new Error(result.message || `프로젝트 생성에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        // 목록 새로고침
        await fetchProjects();
        setCreateDialog(false);
        resetCreateDialog();
        
        // 생성된 프로젝트 상세보기 자동 열기
        console.log('🔍 생성된 프로젝트 상세 정보 조회:', result.data.id);
        await handleViewProject(result.data);
        
        alert('프로젝트가 성공적으로 생성되었습니다.');
        console.log('✅ 프로젝트 생성 완료:', result.data.name);
      }
    } catch (error) {
      console.error('❌ 프로젝트 생성 오류:', error);
      alert(`프로젝트 생성에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 프로젝트 수정 - 파일 업로드 및 모든 데이터 포함
  const handleUpdateProject = async () => {
    try {
      if (!editProject.name || !editProject.domain_id) {
        alert('프로젝트명과 소속 도메인을 입력해주세요.');
        return;
      }

      const apiUrl = getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/projects/${editProject.id}` : `/api/projects/${editProject.id}`;
      
      // [advice from AI] FormData 생성하여 파일과 데이터 함께 전송
      const formData = new FormData();
      
      // 기본 프로젝트 정보
      formData.append('name', editProject.name);
      formData.append('domain_id', editProject.domain_id);
      formData.append('project_overview', editProject.project_overview || '');
      formData.append('target_system_name', editProject.target_system_name || '');
      formData.append('urgency_level', editProject.urgency_level || 'medium');
      formData.append('deadline', editProject.deadline || '');
      formData.append('project_status', editProject.project_status || 'planning');
      
      // 유사 시스템 정보
      formData.append('similar_systems', JSON.stringify(editSimilarSystems.map(system => ({
        id: system.id,
        name: system.name,
        version: system.version,
        description: system.description
      }))));
      
      // 작업 그룹 정보 (기존 + 새로 추가된 것들)
      formData.append('work_groups', JSON.stringify(editWorkGroups.map(group => ({
        id: group.id?.startsWith('temp-') ? undefined : group.id, // 임시 ID는 제거
        name: group.name,
        description: group.description,
        assigned_pe: group.assigned_pe,
        status: group.status
      }))));
      
      // 새로 추가된 문서 파일들 및 메타데이터
      const documentMetadata: any[] = [];
      const newDocuments = editProjectDocuments.filter(doc => doc.file); // 새로 업로드된 문서만
      
      newDocuments.forEach((doc) => {
        if (doc.file) {
          formData.append('new_documents', doc.file);
          documentMetadata.push({
            document_type: doc.document_type,
            title: doc.title,
            description: doc.description
          });
        }
      });
      formData.append('new_document_metadata', JSON.stringify(documentMetadata));
      
      // 삭제된 문서 ID들 (기존 문서 중 제거된 것들)
      const originalDocuments = selectedProject?.documents || [];
      const removedDocuments = originalDocuments.filter(
        originalDoc => !editProjectDocuments.find(editDoc => editDoc.id === originalDoc.id)
      );
      formData.append('removed_document_ids', JSON.stringify(removedDocuments.map(doc => doc.id)));
      
      console.log('🚀 프로젝트 수정 요청 전송...');
      console.log('  - 새 문서 개수:', newDocuments.length);
      console.log('  - 삭제된 문서 개수:', removedDocuments.length);
      console.log('  - 작업 그룹 개수:', editWorkGroups.length);
      console.log('  - 유사 시스템 개수:', editSimilarSystems.length);
      
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // Content-Type은 FormData 사용 시 자동 설정됨
        },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `프로젝트 수정에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        // 목록 새로고침
        await fetchProjects();
        setEditDialog(false);
        setEditProject({});
        setEditSimilarSystems([]);
        setEditProjectDocuments([]);
        setEditWorkGroups([]);
        
        // 수정된 프로젝트 상세보기 자동 새로고침
        console.log('🔍 수정된 프로젝트 상세 정보 새로고침:', result.data.id);
        await handleViewProject(result.data);
        
        alert('프로젝트가 성공적으로 수정되었습니다.');
        console.log('✅ 프로젝트 수정 완료:', result.data.name);
      }
    } catch (error) {
      console.error('❌ 프로젝트 수정 오류:', error);
      alert(`프로젝트 수정에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 프로젝트 삭제 요청 (이중 승인 시스템)
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const reason = window.prompt(
      `"${projectName}" 프로젝트 삭제를 요청합니다.\n\n` +
      `🔒 이중 승인 시스템:\n` +
      `1. 담당 PO 승인\n` +
      `2. 할당된 PE 승인\n` +
      `3. 관리자 최종 승인\n\n` +
      `삭제 사유를 입력해주세요 (10자 이상):`
    );
    
    if (!reason || reason.trim().length < 10) {
      alert('삭제 사유를 10자 이상 입력해주세요.');
      return;
    }
    
    try {
      console.log('🗑️ 프로젝트 삭제 요청 시작:', projectId, projectName);
      
      const apiUrl = getApiUrl();
      const fullUrl = apiUrl 
        ? `${apiUrl}/api/project-deletion/projects/${projectId}/request-deletion` 
        : `/api/project-deletion/projects/${projectId}/request-deletion`;
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_reason: reason.trim()
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `삭제 요청에 실패했습니다 (상태: ${response.status})`);
      }

      if (result.success) {
        // 목록 새로고침
        await fetchProjects();
        setDetailDialog(false);
        setSelectedProject(null);
        
        alert(
          `프로젝트 "${projectName}" 삭제 요청이 생성되었습니다.\n\n` +
          `📋 다음 단계: ${result.data.next_step}\n` +
          `🔒 PO 승인 필요: ${result.data.po_approval_required ? '예' : '아니오'}\n` +
          `🔒 PE 승인 필요: ${result.data.pe_approval_required ? '예' : '아니오'}\n\n` +
          `관련자들에게 승인 요청 알림이 전송되었습니다.`
        );
        
        console.log('✅ 프로젝트 삭제 요청 완료:', result.data);
      }
    } catch (error) {
      console.error('❌ 프로젝트 삭제 요청 오류:', error);
      alert(`프로젝트 삭제 요청에 실패했습니다: ${(error as Error).message}`);
    }
  };

  // [advice from AI] 긴급도 색상 반환
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // [advice from AI] 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': case 'development': return 'primary';
      case 'testing': return 'info';
      case 'planning': return 'warning';
      case 'on_hold': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* [advice from AI] 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          프로젝트 (기획) 카탈로그
        </Typography>
        <Typography variant="body1" color="text.secondary">
          도메인별 프로젝트를 조회하고 관리합니다. 각 프로젝트는 고객 요구사항부터 시스템 개발까지의 전체 과정을 관리합니다.
        </Typography>
      </Box>

      {/* [advice from AI] 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="프로젝트 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="프로젝트명, 개요, 시스템명으로 검색"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>프로젝트 상태</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="프로젝트 상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="planning">기획</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="development">개발</MenuItem>
                  <MenuItem value="testing">테스트</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>긴급도</InputLabel>
                <Select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  label="긴급도"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="critical">긴급</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              {showManageButtons && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialog(true)}
                >
                  새 프로젝트
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* [advice from AI] 프로젝트 목록 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleViewProject(project)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: getUrgencyColor(project.urgency_level), width: 32, height: 32 }}>
                        <ProjectIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          {project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.domain_name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Chip 
                        label={project.urgency_level} 
                        size="small" 
                        sx={{ 
                          bgcolor: getUrgencyColor(project.urgency_level), 
                          color: 'white',
                          fontSize: '0.7rem'
                        }} 
                      />
                      <Chip 
                        label={project.project_status} 
                        size="small" 
                        color={getStatusColor(project.project_status) as any}
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {project.project_overview || '프로젝트 개요가 없습니다.'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      목표 시스템
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {project.target_system_name || '미정'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      연결된 시스템
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {project.connected_systems_count || 0}개
                    </Typography>
                  </Box>

                  {project.deadline && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        완료 예정일
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {new Date(project.deadline).toLocaleDateString('ko-KR')}
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      생성자: {project.created_by_name || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(project.created_at).toLocaleDateString('ko-KR')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* [advice from AI] 빈 상태 */}
      {!loading && !error && filteredProjects.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ProjectIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || filterStatus !== 'all' || filterUrgency !== 'all' 
              ? '조건에 맞는 프로젝트가 없습니다' 
              : '등록된 프로젝트가 없습니다'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {showManageButtons 
              ? '새 프로젝트를 생성하여 도메인별 개발 프로젝트를 관리하세요'
              : '관리자에게 프로젝트 생성을 요청하세요'
            }
          </Typography>
          {showManageButtons && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialog(true)}
            >
              첫 번째 프로젝트 생성
            </Button>
          )}
        </Box>
      )}

      {/* [advice from AI] 프로젝트 생성 다이얼로그 */}
      <Dialog 
        open={createDialog} 
        onClose={() => {
          setCreateDialog(false);
          resetCreateDialog();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            새 프로젝트 생성
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="프로젝트명"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="예: 모바일 뱅킹 앱 개발"
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel>소속 도메인</InputLabel>
              <Select
                value={newProject.domain_id}
                onChange={(e) => setNewProject({...newProject, domain_id: e.target.value})}
                label="소속 도메인"
              >
                {domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* [advice from AI] 유사 시스템(솔루션) 선택 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                유사 시스템(솔루션) 선택
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                이 프로젝트와 유사한 기존 시스템들을 선택하여 참조할 수 있습니다.
              </Typography>
              
              {/* 선택된 시스템들 표시 */}
              {selectedSimilarSystems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    선택된 유사 시스템 ({selectedSimilarSystems.length}개)
                  </Typography>
                  {selectedSimilarSystems.map((system) => (
                    <Box 
                      key={system.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {system.name}
                          {system.version && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              (v{system.version})
                            </Typography>
                          )}
                        </Typography>
                        {system.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {system.description.length > 80 
                              ? `${system.description.substring(0, 80)}...` 
                              : system.description
                            }
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => removeSimilarSystem(system.id)}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 시스템 추가 섹션 */}
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="similar-system-select-label">유사 시스템 추가</InputLabel>
                <Select
                  labelId="similar-system-select-label"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addSimilarSystem(e.target.value as string);
                    }
                  }}
                  label="유사 시스템 추가"
                >
                  {systems
                    .filter(system => !selectedSimilarSystems.find(s => s.id === system.id))
                    .map((system) => (
                      <MenuItem key={system.id} value={system.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {system.name}
                            {system.version && ` (v${system.version})`}
                          </Typography>
                          {system.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {system.description.length > 60 
                                ? `${system.description.substring(0, 60)}...` 
                                : system.description
                              }
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
                {systems.filter(system => !selectedSimilarSystems.find(s => s.id === system.id)).length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                    추가할 수 있는 시스템이 없습니다.
                  </Typography>
                )}
              </FormControl>
            </Box>
            
            {/* [advice from AI] 프로젝트 문서 업로드 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                📁 프로젝트 문서 등록
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                VoC 문서, 요구사양서, 디자인 기획서 등을 업로드할 수 있습니다.
              </Typography>
              
              {/* 업로드된 문서들 표시 */}
              {projectDocuments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    업로드된 문서 ({projectDocuments.length}개)
                  </Typography>
                  {projectDocuments.map((doc) => (
                    <Box 
                      key={doc.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {doc.title}
                          <Typography component="span" variant="caption" color="primary" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'primary.50', borderRadius: 0.5 }}>
                            {doc.document_type === 'voc' ? 'VoC' : 
                             doc.document_type === 'requirements' ? '요구사양서' : '디자인기획서'}
                          </Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {doc.file?.name} ({doc.file ? (doc.file.size / 1024 / 1024).toFixed(2) : 0} MB)
                        </Typography>
                        {doc.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {doc.description}
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => removeProjectDocument(doc.id!)}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 문서 업로드 버튼들 */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    VoC 문서 업로드
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            addProjectDocument('voc', file, title, description || undefined);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    요구사양서 업로드
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            addProjectDocument('requirements', file, title, description || undefined);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    디자인 기획서 업로드
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            addProjectDocument('design', file, title, description || undefined);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="프로젝트 개요"
              value={newProject.project_overview}
              onChange={(e) => setNewProject({...newProject, project_overview: e.target.value})}
              placeholder="이 프로젝트의 목적, 범위, 기대효과를 설명하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="목표 시스템명 (향후 솔루션명)"
              value={newProject.target_system_name}
              onChange={(e) => setNewProject({...newProject, target_system_name: e.target.value})}
              placeholder="예: SmartBank Mobile v1.0"
              sx={{ mb: 2 }}
            />

            {/* [advice from AI] 작업자를 위한 추가 정보 섹션 */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                📋 개발자를 위한 상세 정보
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                아래 정보들은 작업 시작 시 개발자에게 도움이 됩니다. 가능한 한 상세히 입력해 주세요.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="권장 기술 스택"
                    value={newProject.metadata?.tech_stack || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, tech_stack: e.target.value }
                    })}
                    placeholder="예: React, Node.js, PostgreSQL, Docker"
                    helperText="주요 프로그래밍 언어, 프레임워크, 데이터베이스 등"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="개발 환경 요구사항"
                    value={newProject.metadata?.dev_environment || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, dev_environment: e.target.value }
                    })}
                    placeholder="예: Node.js 18+, Docker, Git"
                    helperText="필수 개발 도구 및 버전 요구사항"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="API 명세 및 연동 정보"
                    value={newProject.metadata?.api_specs || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, api_specs: e.target.value }
                    })}
                    placeholder="예: REST API 기반, JWT 인증, Swagger 문서 제공 예정"
                    helperText="외부 API 연동, 인증 방식, 데이터 포맷 등"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="데이터베이스 정보"
                    value={newProject.metadata?.database_info || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, database_info: e.target.value }
                    })}
                    placeholder="예: PostgreSQL 15, Redis 캐시 활용"
                    helperText="DB 종류, 스키마 설계 방향"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="성능 및 보안 요구사항"
                    value={newProject.metadata?.performance_security || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, performance_security: e.target.value }
                    })}
                    placeholder="예: 동시 사용자 1000명, HTTPS 필수"
                    helperText="성능 목표, 보안 수준, 규정 준수"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="특별 고려사항 및 제약조건"
                    value={newProject.metadata?.special_notes || ''}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      metadata: { ...newProject.metadata, special_notes: e.target.value }
                    })}
                    placeholder="예: 기존 레거시 시스템과의 호환성 유지 필요, 24/7 무중단 서비스"
                    helperText="개발 시 특별히 주의해야 할 사항들"
                    sx={{ mb: 1 }}
                  />
                </Grid>
              </Grid>
            </Box>
            
            {/* [advice from AI] 작업 그룹 관리 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                👥 작업 그룹 설정
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                대형 프로젝트를 세부 시스템으로 나누어 PE에게 할당할 수 있습니다. (예: 콜봇 시스템, 어드바이저 시스템)
              </Typography>
              
              {/* 생성된 작업 그룹들 표시 */}
              {workGroups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    생성된 작업 그룹 ({workGroups.length}개)
                  </Typography>
                  {workGroups.map((group, index) => (
                    <Box 
                      key={group.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {index + 1}. {group.name}
                        </Typography>
                        {group.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {group.description}
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => removeWorkGroup(group.id!)}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 작업 그룹 추가 */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  label="작업 그룹명"
                  placeholder="예: 콜봇 시스템"
                  sx={{ flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      const name = target.value.trim();
                      if (name) {
                        const description = prompt('작업 그룹 설명을 입력하세요 (선택사항):', '');
                        addWorkGroup(name, description || undefined);
                        target.value = '';
                      }
                    }
                  }}
                />
                <Button 
                  variant="outlined" 
                  sx={{ minWidth: 'auto', px: 2, py: 1.5 }}
                  onClick={() => {
                    const name = prompt('작업 그룹명을 입력하세요:', '');
                    if (name?.trim()) {
                      const description = prompt('작업 그룹 설명을 입력하세요 (선택사항):', '');
                      addWorkGroup(name.trim(), description || undefined);
                    }
                  }}
                >
                  추가
                </Button>
              </Box>
              
              {workGroups.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                  작업 그룹을 추가하지 않으면 전체 프로젝트가 하나의 작업으로 관리됩니다.
                </Typography>
              )}
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>긴급도</InputLabel>
                  <Select
                    value={newProject.urgency_level}
                    onChange={(e) => setNewProject({...newProject, urgency_level: e.target.value as any})}
                    label="긴급도"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="완료 예정일"
                  value={newProject.deadline?.split('T')[0] || ''}
                  onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
            
            {/* [advice from AI] 긴급 개발 옵션 */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.main', mb: 2 }}>
                🚨 긴급 개발 프로젝트
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newProject.is_urgent_development || false}
                    onChange={(e) => setNewProject({
                      ...newProject, 
                      is_urgent_development: e.target.checked,
                      urgency_level: e.target.checked ? 'critical' : newProject.urgency_level
                    })}
                    color="error"
                  />
                }
                label="이 프로젝트는 긴급 개발이 필요합니다"
                sx={{ mb: 2 }}
              />

              {newProject.is_urgent_development && (
                <Box>
                  <TextField
                    fullWidth
                    label="긴급 개발 사유 *"
                    multiline
                    rows={3}
                    value={newProject.urgent_reason || ''}
                    onChange={(e) => setNewProject({...newProject, urgent_reason: e.target.value})}
                    placeholder="긴급하게 개발이 필요한 사유를 상세히 입력해주세요. (예: 고객 요구사항 변경, 시장 상황 급변, 보안 이슈 등)"
                    sx={{ mb: 2 }}
                    required
                  />
                  
                  <TextField
                    fullWidth
                    type="number"
                    label="예상 완료 시간 (시간) *"
                    value={newProject.expected_completion_hours || ''}
                    onChange={(e) => setNewProject({...newProject, expected_completion_hours: e.target.value})}
                    placeholder="24"
                    helperText="긴급 개발 완료까지 예상되는 시간을 입력해주세요"
                    sx={{ mb: 2 }}
                    required
                  />

                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>긴급 개발 프로젝트 주의사항:</strong><br />
                      • 최고 우선순위로 처리되며 다른 작업보다 우선 할당됩니다<br />
                      • PO 대시보드의 긴급 처리 사항에 실시간으로 표시됩니다<br />
                      • 완료 시간 추적 및 성과 분석이 별도로 진행됩니다
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>고객사 요구사항</strong>과 <strong>디자인 요구사항</strong> 파일 업로드는 향후 추가 예정입니다.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateProject}
            disabled={!newProject.name || !newProject.domain_id}
          >
            프로젝트 생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 상세 정보 다이얼로그 */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ProjectIcon />
            프로젝트 상세 정보
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProject ? (
            <div>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600, width: '30%' }}>
                      프로젝트명
                    </TableCell>
                    <TableCell>{selectedProject.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      소속 도메인
                    </TableCell>
                    <TableCell>{selectedProject.domain_name || '미지정'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      목표 시스템명
                    </TableCell>
                    <TableCell>{selectedProject.target_system_name || '미정'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      프로젝트 개요
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedProject.project_overview || '개요가 없습니다.'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      프로젝트 상태
                    </TableCell>
                    <TableCell>
                        <Chip 
                        label={
                          selectedProject.project_status === 'planning' ? '계획' :
                          selectedProject.project_status === 'in_progress' ? '진행 중' :
                          selectedProject.project_status === 'development' ? '개발' :
                          selectedProject.project_status === 'testing' ? '테스트' :
                          selectedProject.project_status === 'completed' ? '완료' :
                          selectedProject.project_status === 'on_hold' ? '보류' :
                          selectedProject.project_status === 'cancelled' ? '취소' :
                          selectedProject.project_status
                        } 
                          color={getStatusColor(selectedProject.project_status) as any}
                          size="small"
                        />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      승인 상태
                    </TableCell>
                    <TableCell>
                        <Chip 
                        label={
                          selectedProject.approval_status === 'pending' ? '승인 대기' :
                          selectedProject.approval_status === 'approved' ? '승인됨' :
                          selectedProject.approval_status === 'rejected' ? '거부됨' :
                          selectedProject.approval_status === 'draft' ? '초안' :
                          selectedProject.approval_status
                        }
                          variant="outlined"
                          size="small"
                        color={
                          selectedProject.approval_status === 'approved' ? 'success' :
                          selectedProject.approval_status === 'rejected' ? 'error' :
                          selectedProject.approval_status === 'pending' ? 'warning' :
                          'default'
                        }
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      긴급도
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          selectedProject.urgency_level === 'low' ? '낮음' :
                          selectedProject.urgency_level === 'medium' ? '보통' :
                          selectedProject.urgency_level === 'high' ? '높음' :
                          selectedProject.urgency_level === 'critical' ? '긴급' :
                          selectedProject.urgency_level
                        } 
                        size="small" 
                        sx={{ 
                          bgcolor: getUrgencyColor(selectedProject.urgency_level), 
                          color: 'white' 
                        }} 
                      />
                    </TableCell>
                  </TableRow>
                  {selectedProject.deadline && (
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        완료 예정일
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {new Date(selectedProject.deadline).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                          {new Date(selectedProject.deadline) < new Date() && (
                            <Chip label="기한 초과" color="error" size="small" />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      연결된 시스템
                    </TableCell>
                    <TableCell>
                      {selectedProject.connected_systems_count || 0}개
                    </TableCell>
                  </TableRow>
                  {/* 추가 정보 표시 */}
                  {selectedProject.metadata && Object.keys(selectedProject.metadata).length > 0 && (
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        추가 정보
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {selectedProject.metadata.similar_systems && selectedProject.metadata.similar_systems.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              유사 시스템: {selectedProject.metadata.similar_systems.length}개 참조
                            </Typography>
                          )}
                          {selectedProject.metadata.custom_fields && (
                            <Typography variant="caption" color="text.secondary">
                              사용자 정의 필드: {Object.keys(selectedProject.metadata.custom_fields).length}개
                            </Typography>
                          )}
                          {selectedProject.metadata.tags && selectedProject.metadata.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {selectedProject.metadata.tags.map((tag: string, index: number) => (
                                <Chip key={index} label={tag} size="small" variant="outlined" />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                      생성 정보
                    </TableCell>
                    <TableCell>
                      {selectedProject.created_by_name || 'Unknown'} • {' '}
                      {new Date(selectedProject.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                  {selectedProject.approved_by_name && (
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 600 }}>
                        승인 정보
                      </TableCell>
                      <TableCell>
                        {selectedProject.approved_by_name} • {' '}
                        {selectedProject.approved_at && new Date(selectedProject.approved_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* [advice from AI] 유사 시스템 정보 */}
            {selectedProject && selectedProject.similar_systems && selectedProject.similar_systems.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  유사 시스템
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedProject.similar_systems.map((system) => (
                    <Chip
                      key={system.id}
                      label={`${system.name}${system.version ? ` (v${system.version})` : ''}`}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {/* [advice from AI] 프로젝트 문서 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                프로젝트 문서 
                <Chip 
                  label={selectedProject && selectedProject.documents ? selectedProject.documents.length : 0} 
                  size="small" 
                  color="primary" 
                />
              </Typography>
              
              {selectedProject && selectedProject.documents && selectedProject.documents.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableBody>
                      {selectedProject.documents.map((doc, index) => (
                        <TableRow key={doc.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              {doc.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {doc.original_filename} • {doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) : '0'} MB
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              업로드: {doc.uploaded_by_name} • {new Date(doc.created_at!).toLocaleDateString('ko-KR')}
                            </Typography>
                            {doc.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                {doc.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ width: '80px' }}>
                            <Chip 
                              label={doc.document_type === 'voc' ? 'VoC' : 
                                   doc.document_type === 'requirements' ? '요구사양서' : '디자인기획서'}
                              size="small"
                              color={doc.document_type === 'voc' ? 'success' : 
                                    doc.document_type === 'requirements' ? 'info' : 'warning'}
                            />
                          </TableCell>
                          <TableCell sx={{ width: '120px' }}>
                            <Button 
                              size="small" 
                              variant="contained"
                              color="primary"
                              onClick={() => handleDownloadDocument(selectedProject.id, doc.id!, doc.original_filename!)}
                              sx={{ minWidth: 'auto', px: 2 }}
                            >
                              다운로드
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    업로드된 프로젝트 문서가 없습니다.
                  </Typography>
                </Alert>
              )}
            </Box>
            
            {/* [advice from AI] 작업 그룹 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                작업 그룹 
                <Chip 
                  label={selectedProject && selectedProject.work_groups ? selectedProject.work_groups.length : 0} 
                  size="small" 
                  color="secondary" 
                />
              </Typography>
              
              {selectedProject && selectedProject.work_groups && selectedProject.work_groups.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      {selectedProject.work_groups.map((group, index) => (
                        <TableRow key={group.id} hover>
                          <TableCell sx={{ width: '40px', textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {index + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              {group.name}
                            </Typography>
                            {group.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {group.description}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              생성자: {group.created_by_name} • {new Date(group.created_at!).toLocaleDateString('ko-KR')}
                            </Typography>
                            {group.assigned_pe_name && (
                              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                                할당된 PE: {group.assigned_pe_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ width: '100px' }}>
                            <Chip 
                              label={
                                group.status === 'pending' ? '대기' :
                                group.status === 'assigned' ? '할당됨' :
                                group.status === 'in_progress' ? '진행 중' :
                                group.status === 'completed' ? '완료' :
                                group.status === 'on_hold' ? '보류' :
                                group.status || '대기'
                              } 
                              size="small" 
                              color={
                                group.status === 'completed' ? 'success' :
                                group.status === 'in_progress' ? 'primary' :
                                group.status === 'assigned' ? 'info' :
                                group.status === 'on_hold' ? 'warning' :
                                'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  <Typography variant="body2">
                    설정된 작업 그룹이 없습니다. 프로젝트 전체가 하나의 작업으로 관리됩니다.
                  </Typography>
                </Alert>
              )}
            </Box>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          {showManageButtons && selectedProject && (
            <>
              <Button
                startIcon={<EditIcon />}
                onClick={() => {
                  // 기본 프로젝트 정보 설정
                  setEditProject(selectedProject);
                  
                  // 유사 시스템 정보 설정
                  setEditSimilarSystems(selectedProject.similar_systems || []);
                  
                  // 문서 정보 설정 (기존 문서들)
                  setEditProjectDocuments(selectedProject.documents || []);
                  
                  // 작업 그룹 정보 설정
                  setEditWorkGroups(selectedProject.work_groups || []);
                  
                  setDetailDialog(false);
                  setEditDialog(true);
                }}
              >
                수정
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}
              >
                삭제 요청 (이중 승인)
              </Button>
            </>
          )}
          <Button onClick={() => setDetailDialog(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 프로젝트 수정 다이얼로그 - 생성창과 동일한 구조 */}
      <Dialog 
        open={editDialog} 
        onClose={() => {
          setEditDialog(false);
          setEditProject({});
          setEditSimilarSystems([]);
          setEditProjectDocuments([]);
          setEditWorkGroups([]);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            프로젝트 수정
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="프로젝트명"
              value={editProject.name || ''}
              onChange={(e) => setEditProject({...editProject, name: e.target.value})}
              placeholder="예: 모바일 뱅킹 앱 개발"
              sx={{ mb: 2 }}
              required
            />
            
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel>소속 도메인</InputLabel>
              <Select
                value={editProject.domain_id || ''}
                onChange={(e) => setEditProject({...editProject, domain_id: e.target.value})}
                label="소속 도메인"
              >
                {domains.map((domain) => (
                  <MenuItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* [advice from AI] 유사 시스템(솔루션) 선택 섹션 - 수정용 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                유사 시스템(솔루션) 선택
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                이 프로젝트와 유사한 기존 시스템들을 선택하여 참조할 수 있습니다.
              </Typography>
              
              {/* 선택된 시스템들 표시 */}
              {editSimilarSystems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    선택된 유사 시스템 ({editSimilarSystems.length}개)
                  </Typography>
                  {editSimilarSystems.map((system) => (
                    <Box 
                      key={system.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {system.name}
                          {system.version && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              (v{system.version})
                            </Typography>
                          )}
                        </Typography>
                        {system.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {system.description.length > 80 
                              ? `${system.description.substring(0, 80)}...` 
                              : system.description
                            }
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => setEditSimilarSystems(editSimilarSystems.filter(s => s.id !== system.id))}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 시스템 추가 섹션 */}
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="edit-similar-system-select-label">유사 시스템 추가</InputLabel>
                <Select
                  labelId="edit-similar-system-select-label"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const system = systems.find(s => s.id === e.target.value);
                      if (system && !editSimilarSystems.find(s => s.id === system.id)) {
                        setEditSimilarSystems([...editSimilarSystems, system]);
                      }
                    }
                  }}
                  label="유사 시스템 추가"
                >
                  {systems
                    .filter(system => !editSimilarSystems.find(s => s.id === system.id))
                    .map((system) => (
                      <MenuItem key={system.id} value={system.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {system.name}
                            {system.version && ` (v${system.version})`}
                          </Typography>
                          {system.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {system.description.length > 60 
                                ? `${system.description.substring(0, 60)}...` 
                                : system.description
                              }
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
                {systems.filter(system => !editSimilarSystems.find(s => s.id === system.id)).length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                    추가할 수 있는 시스템이 없습니다.
                  </Typography>
                )}
              </FormControl>
            </Box>
            
            {/* [advice from AI] 기존 프로젝트 문서 관리 섹션 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                📁 프로젝트 문서 관리
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                기존 문서를 확인하고 새 문서를 추가할 수 있습니다.
              </Typography>
              
              {/* 기존 문서들 표시 */}
              {editProjectDocuments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    등록된 문서 ({editProjectDocuments.length}개)
                  </Typography>
                  {editProjectDocuments.map((doc) => (
                    <Box 
                      key={doc.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {doc.title}
                          <Typography component="span" variant="caption" color="primary" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'primary.50', borderRadius: 0.5 }}>
                            {doc.document_type === 'voc' ? 'VoC' : 
                             doc.document_type === 'requirements' ? '요구사양서' : '디자인기획서'}
                          </Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {doc.original_filename || doc.file?.name} 
                          {doc.file_size && ` (${(doc.file_size / 1024 / 1024).toFixed(2)} MB)`}
                          {doc.file && ` (${(doc.file.size / 1024 / 1024).toFixed(2)} MB)`}
                        </Typography>
                        {doc.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {doc.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {doc.original_filename && (
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => handleDownloadDocument(editProject.id!, doc.id!, doc.original_filename!)}
                            sx={{ minWidth: 'auto', px: 1.5 }}
                          >
                            다운로드
                          </Button>
                        )}
                        <Button 
                          size="small" 
                          color="error"
                          variant="outlined"
                          onClick={() => setEditProjectDocuments(editProjectDocuments.filter(d => d.id !== doc.id))}
                          sx={{ minWidth: 'auto', px: 1.5 }}
                        >
                          제거
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 새 문서 업로드 버튼들 */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    VoC 문서 추가
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            const newDoc: ProjectDocument = {
                              id: `temp-${Date.now()}`,
                              document_type: 'voc',
                              file,
                              title,
                              description: description || undefined
                            };
                            setEditProjectDocuments([...editProjectDocuments, newDoc]);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    요구사양서 추가
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            const newDoc: ProjectDocument = {
                              id: `temp-${Date.now()}`,
                              document_type: 'requirements',
                              file,
                              title,
                              description: description || undefined
                            };
                            setEditProjectDocuments([...editProjectDocuments, newDoc]);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    component="label"
                    sx={{ py: 1.5, textAlign: 'center' }}
                  >
                    디자인 기획서 추가
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.hwp,.ppt,.pptx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const title = prompt('문서 제목을 입력하세요:', file.name.split('.')[0]);
                          if (title) {
                            const description = prompt('문서 설명을 입력하세요 (선택사항):', '');
                            const newDoc: ProjectDocument = {
                              id: `temp-${Date.now()}`,
                              document_type: 'design',
                              file,
                              title,
                              description: description || undefined
                            };
                            setEditProjectDocuments([...editProjectDocuments, newDoc]);
                          }
                        }
                      }}
                    />
                  </Button>
                </Grid>
              </Grid>
            </Box>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="프로젝트 개요"
              value={editProject.project_overview || ''}
              onChange={(e) => setEditProject({...editProject, project_overview: e.target.value})}
              placeholder="이 프로젝트의 목적, 범위, 기대효과를 설명하세요"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="목표 시스템명 (향후 솔루션명)"
              value={editProject.target_system_name || ''}
              onChange={(e) => setEditProject({...editProject, target_system_name: e.target.value})}
              placeholder="예: SmartBank Mobile v1.0"
              sx={{ mb: 2 }}
            />
            
            {/* [advice from AI] 작업 그룹 관리 섹션 - 수정용 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                👥 작업 그룹 설정
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                대형 프로젝트를 세부 시스템으로 나누어 PE에게 할당할 수 있습니다.
              </Typography>
              
              {/* 생성된 작업 그룹들 표시 */}
              {editWorkGroups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    설정된 작업 그룹 ({editWorkGroups.length}개)
                  </Typography>
                  {editWorkGroups.map((group, index) => (
                    <Box 
                      key={group.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        p: 1.5,
                        mb: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'grey.50'
                      }}
                    >
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                          {index + 1}. {group.name}
                          {group.status && (
                            <Chip 
                              label={
                                group.status === 'pending' ? '대기' :
                                group.status === 'assigned' ? '할당됨' :
                                group.status === 'in_progress' ? '진행 중' :
                                group.status === 'completed' ? '완료' :
                                group.status === 'on_hold' ? '보류' :
                                group.status
                              } 
                              size="small" 
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        {group.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {group.description}
                          </Typography>
                        )}
                        {group.assigned_pe_name && (
                          <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                            할당: {group.assigned_pe_name}
                          </Typography>
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        color="error"
                        variant="outlined"
                        onClick={() => setEditWorkGroups(editWorkGroups.filter(g => g.id !== group.id))}
                        sx={{ minWidth: 'auto', px: 1.5 }}
                      >
                        제거
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* 작업 그룹 추가 */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  label="작업 그룹명"
                  placeholder="예: 콜봇 시스템"
                  sx={{ flex: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      const name = target.value.trim();
                      if (name) {
                        const description = prompt('작업 그룹 설명을 입력하세요 (선택사항):', '');
                        const newGroup: WorkGroup = {
                          id: `temp-${Date.now()}`,
                          name,
                          description: description || undefined
                        };
                        setEditWorkGroups([...editWorkGroups, newGroup]);
                        target.value = '';
                      }
                    }
                  }}
                />
                <Button 
                  variant="outlined" 
                  sx={{ minWidth: 'auto', px: 2, py: 1.5 }}
                  onClick={() => {
                    const name = prompt('작업 그룹명을 입력하세요:', '');
                    if (name?.trim()) {
                      const description = prompt('작업 그룹 설명을 입력하세요 (선택사항):', '');
                      const newGroup: WorkGroup = {
                        id: `temp-${Date.now()}`,
                        name: name.trim(),
                        description: description || undefined
                      };
                      setEditWorkGroups([...editWorkGroups, newGroup]);
                    }
                  }}
                >
                  추가
                </Button>
              </Box>
              
              {editWorkGroups.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                  작업 그룹을 추가하지 않으면 전체 프로젝트가 하나의 작업으로 관리됩니다.
                </Typography>
              )}
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>긴급도</InputLabel>
                  <Select
                    value={editProject.urgency_level || 'medium'}
                    onChange={(e) => setEditProject({...editProject, urgency_level: e.target.value as any})}
                    label="긴급도"
                  >
                    <MenuItem value="low">낮음</MenuItem>
                    <MenuItem value="medium">보통</MenuItem>
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="critical">긴급</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="완료 예정일"
                  value={editProject.deadline?.split('T')[0] || ''}
                  onChange={(e) => setEditProject({...editProject, deadline: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>프로젝트 상태</InputLabel>
              <Select
                value={editProject.project_status || 'planning'}
                onChange={(e) => setEditProject({...editProject, project_status: e.target.value as any})}
                label="프로젝트 상태"
              >
                <MenuItem value="planning">계획</MenuItem>
                <MenuItem value="in_progress">진행 중</MenuItem>
                <MenuItem value="development">개발</MenuItem>
                <MenuItem value="testing">테스트</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
                <MenuItem value="on_hold">보류</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>주의:</strong> 문서 및 작업 그룹 변경사항은 수정 완료 시 함께 저장됩니다.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialog(false);
            setEditProject({});
            setEditSimilarSystems([]);
            setEditProjectDocuments([]);
            setEditWorkGroups([]);
          }}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateProject}
            disabled={!editProject.name || !editProject.domain_id}
          >
            수정 완료
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectManagement;
