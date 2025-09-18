// [advice from AI] 공통 승인 신청 폼 컴포넌트 - 여러 곳에서 재사용 가능

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent, Typography, Box, Grid,
  TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, Chip, List, ListItem, ListItemText, ListItemIcon,
  CircularProgress, Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

interface ApprovalRequestData {
  type: 'system_registration' | 'knowledge_asset' | 'code_component' | 'design_asset';
  title: string;
  description: string;
  systemInfo?: any;
  extractionResult?: any;
  metadata?: any;
}

interface ApprovalRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (approvalData: any) => Promise<void>;
  data: ApprovalRequestData;
}

const ApprovalRequestForm: React.FC<ApprovalRequestFormProps> = ({
  open,
  onClose,
  onSubmit,
  data
}) => {
  const { user } = useJwtAuthStore();
  const [approvalPriority, setApprovalPriority] = useState('medium');
  const [approvalReason, setApprovalReason] = useState('');
  const [selectedPO, setSelectedPO] = useState('auto');
  const [selectedQA, setSelectedQA] = useState('auto');
  const [selectedExecutive, setSelectedExecutive] = useState('auto');
  const [approvalDuration, setApprovalDuration] = useState('7');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableApprovers, setAvailableApprovers] = useState({
    pos: [],
    qas: [],
    executives: []
  });

  // [advice from AI] 승인자 목록 로드
  useEffect(() => {
    if (open) {
      loadAvailableApprovers();
    }
  }, [open]);

  const loadAvailableApprovers = async () => {
    try {
      // 실제 사용자 목록을 가져오는 API 호출
      const response = await fetch('http://localhost:3001/api/users/approvers', {
        headers: {
          'Authorization': `Bearer ${useJwtAuthStore.getState().token}`
        }
      });
      
      if (response.ok) {
        const approvers = await response.json();
        setAvailableApprovers(approvers.data || { pos: [], qas: [], executives: [] });
      }
    } catch (error) {
      console.warn('승인자 목록 로드 실패:', error);
    }
  };

  const handleSubmit = async () => {
    if (!approvalReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const approvalData = {
        type: data.type,
        title: data.title,
        description: `${data.description}\n\n승인 요청 사유:\n${approvalReason}`,
        priority: approvalPriority,
        requesterId: user?.id,
        requesterEmail: user?.email,
        approvers: {
          po: selectedPO,
          qa: selectedQA,
          executive: selectedExecutive
        },
        duration: parseInt(approvalDuration),
        metadata: {
          ...data.metadata,
          systemInfo: data.systemInfo,
          extractionResult: data.extractionResult,
          requestedBy: user?.fullName,
          requestedAt: new Date().toISOString()
        }
      };

      await onSubmit(approvalData);
      onClose();
    } catch (error) {
      console.error('승인 신청 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'system_registration': return '시스템 등록';
      case 'knowledge_asset': return '지식 자산';
      case 'code_component': return '코드 컴포넌트';
      case 'design_asset': return '디자인 자산';
      default: return type;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        bgcolor: 'primary.main',
        color: 'primary.contrastText'
      }}>
        <AssignmentIcon />
        승인 신청
        <Box sx={{ ml: 'auto' }}>
          <Chip 
            label={getTypeLabel(data.type)}
            size="small"
            sx={{ 
              bgcolor: 'primary.contrastText',
              color: 'primary.main'
            }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        {/* 시스템 정보 요약 */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 신청 대상 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">시스템명</Typography>
                <Typography variant="body1" fontWeight={600}>{data.title}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">타입</Typography>
                <Typography variant="body1">{getTypeLabel(data.type)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">설명</Typography>
                <Typography variant="body1">{data.description}</Typography>
              </Grid>
            </Grid>
            
            {/* 추출 결과 요약 */}
            {data.extractionResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>추출된 자산</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`코드 ${data.extractionResult.summary?.codeComponents || 0}개`} />
                  <Chip size="small" label={`문서 ${data.extractionResult.summary?.documents || 0}개`} />
                  <Chip size="small" label={`디자인 ${data.extractionResult.summary?.designAssets || 0}개`} />
                  <Chip size="small" label={`카탈로그 ${data.extractionResult.summary?.catalogComponents || 0}개`} />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 승인 신청 정보 입력 */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={approvalPriority}
                onChange={(e) => setApprovalPriority(e.target.value)}
                label="우선순위"
              >
                <MenuItem value="low">낮음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="urgent">긴급</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>예상 승인 기간</InputLabel>
              <Select
                value={approvalDuration}
                onChange={(e) => setApprovalDuration(e.target.value)}
                label="예상 승인 기간"
              >
                <MenuItem value="1">1일 이내</MenuItem>
                <MenuItem value="3">3일 이내</MenuItem>
                <MenuItem value="7">1주 이내</MenuItem>
                <MenuItem value="14">2주 이내</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="승인 요청 사유"
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              multiline
              rows={4}
              placeholder="이 시스템/자산의 승인이 필요한 이유를 상세히 설명해주세요."
              required
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>1차 승인자 (QC/QA)</InputLabel>
              <Select
                value={selectedQA}
                onChange={(e) => setSelectedQA(e.target.value)}
                label="1차 승인자 (QC/QA)"
              >
                <MenuItem value="auto">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    자동 선택
                  </Box>
                </MenuItem>
                {availableApprovers.qas.map((qa: any) => (
                  <MenuItem key={qa.id} value={qa.id}>
                    {qa.full_name} ({qa.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>2차 승인자 (PO)</InputLabel>
              <Select
                value={selectedPO}
                onChange={(e) => setSelectedPO(e.target.value)}
                label="2차 승인자 (PO)"
              >
                <MenuItem value="auto">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    자동 선택
                  </Box>
                </MenuItem>
                {availableApprovers.pos.map((po: any) => (
                  <MenuItem key={po.id} value={po.id}>
                    {po.full_name} ({po.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>3차 승인자 (경영진)</InputLabel>
              <Select
                value={selectedExecutive}
                onChange={(e) => setSelectedExecutive(e.target.value)}
                label="3차 승인자 (경영진)"
              >
                <MenuItem value="auto">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon fontSize="small" />
                    자동 선택
                  </Box>
                </MenuItem>
                {availableApprovers.executives.map((exec: any) => (
                  <MenuItem key={exec.id} value={exec.id}>
                    {exec.full_name} ({exec.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* 승인 절차 안내 */}
        <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon />
              승인 절차 안내
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    bgcolor: 'info.contrastText', color: 'info.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 'bold'
                  }}>1</Box>
                </ListItemIcon>
                <ListItemText 
                  primary="1차 승인 (QC/QA)"
                  secondary="품질 검증 및 기술적 적합성 평가"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    bgcolor: 'info.contrastText', color: 'info.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 'bold'
                  }}>2</Box>
                </ListItemIcon>
                <ListItemText 
                  primary="2차 승인 (PO)"
                  secondary="시스템 전체 검토 및 비즈니스 가치 평가"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    bgcolor: 'info.contrastText', color: 'info.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 'bold'
                  }}>3</Box>
                </ListItemIcon>
                <ListItemText 
                  primary="3차 승인 (경영진)"
                  secondary="전략적 가치 및 리소스 배정 결정"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    bgcolor: 'info.contrastText', color: 'info.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 'bold'
                  }}>4</Box>
                </ListItemIcon>
                <ListItemText 
                  primary="승인 완료"
                  secondary="정식 카탈로그 등록 및 GitHub 스타일 레포지토리 뷰 제공"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!approvalReason.trim() || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckIcon />}
        >
          {isSubmitting ? '승인 신청 중...' : '승인 신청 제출'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalRequestForm;
