import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Domain as DomainIcon,
  Storage as SystemIcon,
  Extension as ComponentIcon,
  Api as ApiIcon,
  Folder as ResourceIcon,
  Group as GroupIcon,
  Person as UserIcon,
  Build as CICDIcon,
  Description as DocsIcon,
  Cloud as K8sIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import CatalogPage from './CatalogPage';
import EntityDetailPage from './EntityDetailPage';

// [advice from AI] Backstage.io 스타일의 카탈로그 센터
const CatalogCenter: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 0:
        return <CatalogPage />;
      case 1:
        return <EntityDetailPage />;
      case 2:
        return <CICDDashboard />;
      case 3:
        return <APIDashboard />;
      case 4:
        return <DependenciesDashboard />;
      case 5:
        return <DocsDashboard />;
      case 6:
        return <KubernetesDashboard />;
      case 7:
        return <SettingsDashboard />;
      default:
        return <CatalogPage />;
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
      {/* [advice from AI] 헤더 영역 */}
      <Box sx={{ 
        bgcolor: '#2d2d2d', 
        p: 2, 
        borderBottom: '1px solid #404040',
        background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: '#1976d2', mr: 2, width: 40, height: 40 }}>
              <SearchIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                My Company Catalog
              </Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Discover and manage your software assets
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: '#1976d2', 
                mr: 1,
                '&:hover': { bgcolor: '#1565c0' }
              }}
            >
              CREATE
            </Button>
            <Button 
              variant="outlined" 
              sx={{ 
                color: 'white', 
                borderColor: '#404040',
                '&:hover': { borderColor: '#666' }
              }}
            >
              ? SUPPORT
            </Button>
          </Box>
        </Box>
      </Box>

      {/* [advice from AI] 탭 네비게이션 */}
      <Box sx={{ bgcolor: '#2d2d2d', borderBottom: '1px solid #404040' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': { color: '#888' },
            '& .Mui-selected': { color: 'white' },
            '& .MuiTabs-indicator': { bgcolor: '#1976d2' }
          }}
        >
          <Tab label="Catalog" />
          <Tab label="Entity Details" />
          <Tab label="CI/CD" />
          <Tab label="APIs" />
          <Tab label="Dependencies" />
          <Tab label="Docs" />
          <Tab label="Kubernetes" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* [advice from AI] 메인 콘텐츠 */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {renderTabContent()}
      </Box>
    </Box>
  );
};

// [advice from AI] CI/CD 대시보드 컴포넌트
const CICDDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ color: 'white', mb: 3 }}>
        CI/CD Pipelines
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CICDIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6">Active Pipelines</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#4caf50' }}>12</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Currently running pipelines
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimelineIcon sx={{ mr: 1, color: '#ff9800' }} />
                <Typography variant="h6">Success Rate</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#4caf50' }}>94%</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// [advice from AI] API 대시보드 컴포넌트
const APIDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ color: 'white', mb: 3 }}>
        API Documentation
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ApiIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6">OpenAPI</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#1976d2' }}>8</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                REST APIs documented
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ApiIcon sx={{ mr: 1, color: '#9c27b0' }} />
                <Typography variant="h6">GraphQL</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#9c27b0' }}>3</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                GraphQL schemas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ApiIcon sx={{ mr: 1, color: '#ff5722' }} />
                <Typography variant="h6">gRPC</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#ff5722' }}>2</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                gRPC services
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// [advice from AI] 의존성 대시보드 컴포넌트
const DependenciesDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ color: 'white', mb: 3 }}>
        Dependencies
      </Typography>
      
      <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Dependency Graph</Typography>
          <Box sx={{ 
            height: 400, 
            bgcolor: '#1a1a1a', 
            borderRadius: 1, 
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #404040'
          }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Interactive dependency graph will be displayed here
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// [advice from AI] 문서 대시보드 컴포넌트
const DocsDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ color: 'white', mb: 3 }}>
        Documentation
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DocsIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6">TechDocs</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#1976d2' }}>24</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                Technical documents
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DocsIcon sx={{ mr: 1, color: '#4caf50' }} />
                <Typography variant="h6">User Guides</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#4caf50' }}>12</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>
                User documentation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// [advice from AI] Kubernetes 대시보드 컴포넌트
const KubernetesDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ color: 'white', mb: 3 }}>
        Kubernetes Resources
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <K8sIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6">Deployments</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#1976d2' }}>15</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <K8sIcon sx={{ mr: 1, color: '#4caf50' }} />
                <Typography variant="h6">Services</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#4caf50' }}>8</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <K8sIcon sx={{ mr: 1, color: '#ff9800' }} />
                <Typography variant="h6">ConfigMaps</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#ff9800' }}>12</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <K8sIcon sx={{ mr: 1, color: '#f44336' }} />
                <Typography variant="h6">Secrets</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#f44336' }}>5</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// [advice from AI] 설정 대시보드 컴포넌트
const SettingsDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, bgcolor: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" sx={{ color: 'white', mb: 3 }}>
        Catalog Settings
      </Typography>
      
      <Card sx={{ bgcolor: '#2d2d2d', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Configuration</Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Catalog settings and configuration options will be available here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CatalogCenter;
