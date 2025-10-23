// [advice from AI] 도메인 & SSL 인증서 통합 관리 컴포넌트
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Language as DomainIcon,
  Security as SecurityIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

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

interface Domain {
  domain_name: string;
  subdomain: string;
  cluster_name: string;
}

interface TLSCertificate {
  id: string;
  domain: string;
  certificate_type: string;
  issuer?: string;
  subject?: string;
  issued_date?: string;
  expiry_date: string;
  status: string;
  secret_name: string;
  namespace: string;
  cluster_id?: string;
  days_until_expiry: number;
  created_at: string;
}

const DomainSSLManager: React.FC = () => {
  const { token } = useJwtAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 도메인 관리
  const [domains, setDomains] = useState<Domain[]>([]);
  const [ingressDialogOpen, setIngressDialogOpen] = useState(false);
  const [ingressFormData, setIngressFormData] = useState({
    rule_name: '',
    host: '',
    service_name: '',
    service_port: 80,
    path: '/',
    namespace: 'default',
    tls_enabled: false,
    cert_issuer: 'selfsigned-issuer'
  });
  
  // SSL 인증서 관리
  const [certificates, setCertificates] = useState<TLSCertificate[]>([]);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<TLSCertificate | null>(null);
  const [certFormData, setCertFormData] = useState({
    domain: '',
    cert_data: '',
    key_data: '',
    ca_cert: '',
    issuer: '',
    subject: '',
    expiry_date: ''
  });

  useEffect(() => {
    loadDomains();
    loadCertificates();
  }, []);

  // 도메인 목록 로드
  const loadDomains = async () => {
    try {
      setLoading(true);
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/ingress/domains`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDomains(data.data || []);
        console.log('✅ 도메인 목록 로드:', data.data?.length || 0, '개');
      }
    } catch (error) {
      console.error('❌ 도메인 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // TLS 인증서 목록 로드
  const loadCertificates = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/ingress/certificates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCertificates(data.data || []);
        console.log('✅ TLS 인증서 로드:', data.data?.length || 0, '개');
      }
    } catch (error) {
      console.error('❌ TLS 인증서 로드 실패:', error);
    }
  };

  // TLS 인증서 추가
  const handleSaveCertificate = async () => {
    if (!certFormData.domain || !certFormData.cert_data || !certFormData.key_data || !certFormData.expiry_date) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/ingress/certificates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(certFormData)
      });
      
      if (response.ok) {
        await loadCertificates();
        setCertDialogOpen(false);
        setCertFormData({
          domain: '',
          cert_data: '',
          key_data: '',
          ca_cert: '',
          issuer: '',
          subject: '',
          expiry_date: ''
        });
        alert('TLS 인증서가 추가되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`추가 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ TLS 인증서 추가 오류:', error);
      alert('추가 중 오류가 발생했습니다.');
    }
  };

  // TLS 인증서 삭제
  const handleDeleteCertificate = async (id: string) => {
    if (!window.confirm('정말로 이 인증서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/ingress/certificates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await loadCertificates();
        alert('TLS 인증서가 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`삭제 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ TLS 인증서 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // Ingress 생성
  const handleCreateIngress = async () => {
    if (!ingressFormData.rule_name || !ingressFormData.host || !ingressFormData.service_name) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;
      
      const response = await fetch(`${apiUrl}/api/ingress/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ingressFormData)
      });
      
      if (response.ok) {
        await loadDomains();
        setIngressDialogOpen(false);
        setIngressFormData({
          rule_name: '',
          host: '',
          service_name: '',
          service_port: 80,
          path: '/',
          namespace: 'default',
          tls_enabled: false,
          cert_issuer: 'selfsigned-issuer'
        });
        alert('Ingress가 생성되고 Kubernetes에 적용되었습니다.');
      } else {
        const errorData = await response.json();
        alert(`생성 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ Ingress 생성 오류:', error);
      alert('생성 중 오류가 발생했습니다.');
    }
  };

  // 인증서 상태에 따른 색상
  const getCertificateStatusColor = (days: number) => {
    if (days < 0) return 'error';
    if (days <= 7) return 'error';
    if (days <= 30) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab icon={<DomainIcon />} label="도메인 관리" />
        <Tab icon={<SecurityIcon />} label="SSL 인증서 관리" />
      </Tabs>

      {/* 도메인 관리 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
            클러스터에 등록된 서비스들의 도메인을 관리합니다. Ingress를 생성하여 Kubernetes에 자동 배포됩니다.
          </Alert>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIngressDialogOpen(true)}
          >
            Ingress 생성
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : domains.length === 0 ? (
          <Alert severity="warning">
            등록된 클러스터가 없습니다. 먼저 클러스터를 등록해주세요.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>도메인</TableCell>
                  <TableCell>서브도메인</TableCell>
                  <TableCell>클러스터</TableCell>
                  <TableCell align="center">SSL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domains.map((domain, index) => {
                  const cert = certificates.find(c => c.domain === domain.domain_name);
                  return (
                    <TableRow key={index}>
                      <TableCell>{domain.domain_name}</TableCell>
                      <TableCell>
                        <Chip label={domain.subdomain} size="small" />
                      </TableCell>
                      <TableCell>{domain.cluster_name}</TableCell>
                      <TableCell align="center">
                        {cert ? (
                          <Chip 
                            icon={<CheckCircleIcon />} 
                            label="설정됨" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            icon={<ErrorIcon />} 
                            label="미설정" 
                            color="default" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* SSL 인증서 관리 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            SSL/TLS 인증서 목록
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCertDialogOpen(true)}
          >
            인증서 추가
          </Button>
        </Box>

        {certificates.length === 0 ? (
          <Alert severity="info">
            등록된 SSL 인증서가 없습니다. "인증서 추가" 버튼을 클릭하여 인증서를 등록하세요.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>도메인</TableCell>
                  <TableCell>발급자</TableCell>
                  <TableCell>만료일</TableCell>
                  <TableCell>남은 기간</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon fontSize="small" />
                        {cert.domain}
                      </Box>
                    </TableCell>
                    <TableCell>{cert.issuer || 'N/A'}</TableCell>
                    <TableCell>{new Date(cert.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${cert.days_until_expiry}일`} 
                        color={getCertificateStatusColor(cert.days_until_expiry)}
                        size="small"
                        icon={cert.days_until_expiry <= 30 ? <WarningIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={cert.status} 
                        color={cert.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteCertificate(cert.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Ingress 생성 다이얼로그 */}
      <Dialog open={ingressDialogOpen} onClose={() => setIngressDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DomainIcon />
            Kubernetes Ingress 생성
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Ingress를 생성하면 Kubernetes 클러스터에 자동으로 배포됩니다. TLS를 활성화하면 cert-manager가 자동으로 인증서를 발급합니다.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ingress 이름"
                value={ingressFormData.rule_name}
                onChange={(e) => setIngressFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                placeholder="my-app-ingress"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="네임스페이스"
                value={ingressFormData.namespace}
                onChange={(e) => setIngressFormData(prev => ({ ...prev, namespace: e.target.value }))}
                placeholder="default"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="호스트 (도메인)"
                value={ingressFormData.host}
                onChange={(e) => setIngressFormData(prev => ({ ...prev, host: e.target.value }))}
                placeholder="myapp.example.com"
                required
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="서비스 이름"
                value={ingressFormData.service_name}
                onChange={(e) => setIngressFormData(prev => ({ ...prev, service_name: e.target.value }))}
                placeholder="my-service"
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="서비스 포트"
                value={ingressFormData.service_port}
                onChange={(e) => setIngressFormData(prev => ({ ...prev, service_port: parseInt(e.target.value) }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="경로 (Path)"
                value={ingressFormData.path}
                onChange={(e) => setIngressFormData(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ingressFormData.tls_enabled}
                    onChange={(e) => setIngressFormData(prev => ({ ...prev, tls_enabled: e.target.checked }))}
                  />
                }
                label="TLS/SSL 활성화 (HTTPS)"
              />
            </Grid>
            {ingressFormData.tls_enabled && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>인증서 발급자</InputLabel>
                  <Select
                    value={ingressFormData.cert_issuer}
                    label="인증서 발급자"
                    onChange={(e) => setIngressFormData(prev => ({ ...prev, cert_issuer: e.target.value }))}
                  >
                    <MenuItem value="selfsigned-issuer">Self-Signed (로컬 개발)</MenuItem>
                    <MenuItem value="letsencrypt-staging">Let's Encrypt Staging (테스트)</MenuItem>
                    <MenuItem value="letsencrypt-prod">Let's Encrypt Production (운영)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIngressDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleCreateIngress} 
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!ingressFormData.rule_name || !ingressFormData.host || !ingressFormData.service_name}
          >
            생성 및 배포
          </Button>
        </DialogActions>
      </Dialog>

      {/* TLS 인증서 추가 다이얼로그 */}
      <Dialog open={certDialogOpen} onClose={() => setCertDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            TLS 인증서 추가
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            인증서 파일(.crt)과 개인키 파일(.key)의 내용을 붙여넣기 하세요.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="도메인"
                value={certFormData.domain}
                onChange={(e) => setCertFormData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="example.com"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="발급자 (Issuer)"
                value={certFormData.issuer}
                onChange={(e) => setCertFormData(prev => ({ ...prev, issuer: e.target.value }))}
                placeholder="Let's Encrypt, DigiCert 등"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="만료일"
                type="date"
                value={certFormData.expiry_date}
                onChange={(e) => setCertFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="인증서 (Certificate)"
                value={certFormData.cert_data}
                onChange={(e) => setCertFormData(prev => ({ ...prev, cert_data: e.target.value }))}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="개인키 (Private Key)"
                value={certFormData.key_data}
                onChange={(e) => setCertFormData(prev => ({ ...prev, key_data: e.target.value }))}
                placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                required
                type="password"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="CA 인증서 (선택사항)"
                value={certFormData.ca_cert}
                onChange={(e) => setCertFormData(prev => ({ ...prev, ca_cert: e.target.value }))}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertDialogOpen(false)}>취소</Button>
          <Button 
            onClick={handleSaveCertificate} 
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={!certFormData.domain || !certFormData.cert_data || !certFormData.key_data || !certFormData.expiry_date}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DomainSSLManager;
