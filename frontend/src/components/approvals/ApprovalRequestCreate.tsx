// [advice from AI] 승인 요청 생성 컴포넌트
// 상세한 내용을 포함한 승인 요청을 생성할 수 있는 기능

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  BugReport as BugIcon,
  Architecture as ArchitectureIcon,
  RocketLaunch as DeployIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import ApproverSelector from './ApproverSelector';

interface ApprovalRequestCreateProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ApprovalRequestData {
  title: string;
  description: string;
  type: string;
  priority: string;
  component_name?: string;
  version?: string;
  due_date?: string;
  metadata: {
    requirements?: string;
    impact_analysis?: string;
    risk_assessment?: string;
    rollback_plan?: string;
    testing_notes?: string;
    additional_info?: string;
  };
  approvers: any[];
}

const ApprovalRequestCreate: React.FC<ApprovalRequestCreateProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ApprovalRequestData>({
    title: '',
    description: '',
    type: 'code_component',
    priority: 'medium',
    component_name: '',
    version: '',
    due_date: '',
    metadata: {
      requirements: '',
      impact_analysis: '',
      risk_assessment: '',
      rollback_plan: '',
      testing_notes: '',
      additional_info: ''
    },
    approvers: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approverSelectorOpen, setApproverSelectorOpen] = useState(false);
  const { token } = useJwtAuthStore();

  // [advice from AI] 폼 데이터 업데이트
  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // [advice from AI] 승인 요청 생성
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('제목과 설명은 필수입니다.');
      return;
    }

    if (formData.approvers.length === 0) {
      setError('최소 1명의 승인자를 선택해야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/approvals/requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onSuccess();
          onClose();
          // 폼 초기화
          setFormData({
            title: '',
            description: '',
            type: 'code_component',
            priority: 'medium',
            component_name: '',
            version: '',
            due_date: '',
            metadata: {
              requirements: '',
              impact_analysis: '',
              risk_assessment: '',
              rollback_plan: '',
              testing_notes: '',
              additional_info: ''
            },
            approvers: []
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || '승인 요청 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('승인 요청 생성 실패:', error);
      setError('승인 요청 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // [advice from AI] 승인 유형별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code_component': return <AssignmentIcon />;
      case 'bug_fix': return <BugIcon />;
      case 'architecture_change': return <ArchitectureIcon />;
      case 'solution_deployment': return <DeployIcon />;
      default: return <AssignmentIcon />;
    }
  };

  // [advice from AI] 승인자 제거
  const removeApprover = (index: number) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.filter((_, i) => i !== index)
    }));
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getTypeIcon(formData.type)}
            <Typography variant="h6">승인 요청 생성</Typography>
            <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* [advice from AI] 기본 정보 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    기본 정보
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="제목"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>유형</InputLabel>
                        <Select
                          value={formData.type}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                        >
                          <MenuItem value="code_component">코드 컴포넌트</MenuItem>
                          <MenuItem value="bug_fix">버그 수정</MenuItem>
                          <MenuItem value="architecture_change">아키텍처 변경</MenuItem>
                          <MenuItem value="solution_deployment">솔루션 배포</MenuItem>
                          <MenuItem value="release_approval">릴리스 승인</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>우선순위</InputLabel>
                        <Select
                          value={formData.priority}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                        >
                          <MenuItem value="low">낮음</MenuItem>
                          <MenuItem value="medium">보통</MenuItem>
                          <MenuItem value="high">높음</MenuItem>
                          <MenuItem value="urgent">긴급</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="컴포넌트명"
                        value={formData.component_name}
                        onChange={(e) => handleInputChange('component_name', e.target.value)}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="버전"
                        value={formData.version}
                        onChange={(e) => handleInputChange('version', e.target.value)}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="마감일"
                        value={formData.due_date}
                        onChange={(e) => handleInputChange('due_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* [advice from AI] 상세 설명 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    상세 설명
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="요청 내용"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="승인을 요청하는 내용을 상세히 설명해주세요..."
                    required
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* [advice from AI] 상세 정보 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    상세 정보
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="요구사항"
                        value={formData.metadata.requirements}
                        onChange={(e) => handleInputChange('metadata.requirements', e.target.value)}
                        placeholder="구체적인 요구사항을 입력하세요..."
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="영향도 분석"
                        value={formData.metadata.impact_analysis}
                        onChange={(e) => handleInputChange('metadata.impact_analysis', e.target.value)}
                        placeholder="변경사항이 시스템에 미치는 영향을 분석해주세요..."
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="위험도 평가"
                        value={formData.metadata.risk_assessment}
                        onChange={(e) => handleInputChange('metadata.risk_assessment', e.target.value)}
                        placeholder="예상되는 위험요소와 대응방안을 설명해주세요..."
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="롤백 계획"
                        value={formData.metadata.rollback_plan}
                        onChange={(e) => handleInputChange('metadata.rollback_plan', e.target.value)}
                        placeholder="문제 발생 시 롤백 계획을 설명해주세요..."
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="테스트 노트"
                        value={formData.metadata.testing_notes}
                        onChange={(e) => handleInputChange('metadata.testing_notes', e.target.value)}
                        placeholder="테스트 결과 및 검증 사항을 입력하세요..."
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="추가 정보"
                        value={formData.metadata.additional_info}
                        onChange={(e) => handleInputChange('metadata.additional_info', e.target.value)}
                        placeholder="기타 참고사항을 입력하세요..."
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* [advice from AI] 승인자 선택 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    승인자 선택
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setApproverSelectorOpen(true)}
                    sx={{ mb: 2 }}
                  >
                    승인자 추가
                  </Button>
                  
                  {formData.approvers.length > 0 && (
                    <Box>
                      {formData.approvers.map((approver, index) => (
                        <Chip
                          key={index}
                          label={`${index + 1}. ${approver.full_name} (${approver.role_type})`}
                          onDelete={() => removeApprover(index)}
                          deleteIcon={<DeleteIcon />}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim() || !formData.description.trim()}
          >
            {loading ? '생성 중...' : '승인 요청 생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 승인자 선택 다이얼로그 */}
      <ApproverSelector
        open={approverSelectorOpen}
        onClose={() => setApproverSelectorOpen(false)}
        onApproversSelected={(approvers) => {
          setFormData(prev => ({
            ...prev,
            approvers: [...prev.approvers, ...approvers]
          }));
          setApproverSelectorOpen(false);
        }}
        approvalType={formData.type}
        initialApprovers={formData.approvers}
      />
    </>
  );
};

export default ApprovalRequestCreate;
