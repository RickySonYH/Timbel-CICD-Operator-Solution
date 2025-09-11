import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  AccountTree as ArchitectureIcon,
  Share as DependencyIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

// [advice from AI] 백스테이지IO 스타일 시스템 다이어그램 컴포넌트
interface DiagramNode {
  id: string;
  label: string;
  type: 'service' | 'api' | 'component' | 'database' | 'external';
  status: 'active' | 'inactive' | 'deprecated' | 'development';
  dependencies: string[];
  metadata: {
    version?: string;
    description?: string;
    owner?: string;
    lastUpdated?: string;
  };
}

interface SystemDiagramProps {
  nodes: DiagramNode[];
  title?: string;
  onNodeClick?: (node: DiagramNode) => void;
  onRefresh?: () => void;
}

const SystemDiagram: React.FC<SystemDiagramProps> = ({
  nodes,
  title = "시스템 아키텍처",
  onNodeClick,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // [advice from AI] 노드 타입별 색상 및 아이콘
  const getNodeStyle = (node: DiagramNode) => {
    const baseStyle = {
      padding: '8px 12px',
      borderRadius: '8px',
      border: '2px solid',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minWidth: '120px',
      textAlign: 'center' as const,
      position: 'relative' as const
    };

    const typeStyles = {
      service: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
        color: '#1976d2'
      },
      api: {
        backgroundColor: '#f3e5f5',
        borderColor: '#9c27b0',
        color: '#7b1fa2'
      },
      component: {
        backgroundColor: '#e8f5e8',
        borderColor: '#4caf50',
        color: '#388e3c'
      },
      database: {
        backgroundColor: '#fff3e0',
        borderColor: '#ff9800',
        color: '#f57c00'
      },
      external: {
        backgroundColor: '#fce4ec',
        borderColor: '#e91e63',
        color: '#c2185b'
      }
    };

    const statusStyles = {
      active: { opacity: 1 },
      inactive: { opacity: 0.6 },
      deprecated: { opacity: 0.4, textDecoration: 'line-through' },
      development: { opacity: 0.8, borderStyle: 'dashed' }
    };

    return {
      ...baseStyle,
      ...typeStyles[node.type],
      ...statusStyles[node.status]
    };
  };

  // [advice from AI] 의존성 그래프 생성
  const generateDependencyGraph = () => {
    const graph = nodes.map(node => ({
      ...node,
      dependencies: node.dependencies || []
    }));
    return graph;
  };

  // [advice from AI] 서비스 토폴로지 맵 생성
  const generateServiceTopology = () => {
    const services = nodes.filter(node => node.type === 'service');
    const apis = nodes.filter(node => node.type === 'api');
    const databases = nodes.filter(node => node.type === 'database');
    
    return { services, apis, databases };
  };

  const handleNodeClick = (node: DiagramNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderArchitectureDiagram = () => {
    const dependencyGraph = generateDependencyGraph();
    
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          시스템 아키텍처 다이어그램
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          justifyContent: 'center',
          minHeight: '400px',
          alignItems: 'center'
        }}>
          {dependencyGraph.map((node) => (
            <Box
              key={node.id}
              sx={getNodeStyle(node)}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {node.label}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                {node.type.toUpperCase()}
              </Typography>
              {node.metadata.version && (
                <Chip 
                  label={`v${node.metadata.version}`} 
                  size="small" 
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          ))}
        </Box>

        {/* 의존성 연결선 표시 */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            의존성 관계
          </Typography>
          <Grid container spacing={2}>
            {dependencyGraph.map((node) => (
              <Grid item xs={12} sm={6} md={4} key={node.id}>
                <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    {node.label}
                  </Typography>
                  {node.dependencies.length > 0 ? (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        의존성:
                      </Typography>
                      {node.dependencies.map((depId) => {
                        const depNode = nodes.find(n => n.id === depId);
                        return depNode ? (
                          <Chip 
                            key={depId}
                            label={depNode.label}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ) : null;
                      })}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      의존성 없음
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    );
  };

  const renderDependencyGraph = () => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          의존성 그래프
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            시스템 구성 요소 간의 의존성 관계를 시각화합니다. 
            각 노드는 서비스, API, 컴포넌트를 나타내며, 화살표는 의존성 방향을 표시합니다.
          </Typography>
        </Alert>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          minHeight: '400px'
        }}>
          {nodes.map((node, index) => (
            <Box key={node.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: '200px' }}>
                <Box sx={getNodeStyle(node)} onClick={() => handleNodeClick(node)}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {node.label}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {node.type.toUpperCase()}
                  </Typography>
                </Box>
              </Box>
              
              {node.dependencies.length > 0 && (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    →
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {node.dependencies.map((depId) => {
                      const depNode = nodes.find(n => n.id === depId);
                      return depNode ? (
                        <Chip 
                          key={depId}
                          label={depNode.label}
                          size="small"
                          variant="outlined"
                          onClick={() => handleNodeClick(depNode)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ) : null;
                    })}
                  </Box>
                </>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderServiceTopology = () => {
    const { services, apis, databases } = generateServiceTopology();
    
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          서비스 토폴로지 맵
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
                서비스 ({services.length})
              </Typography>
              {services.map((service) => (
                <Box key={service.id} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {service.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {service.metadata.description || '설명 없음'}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, backgroundColor: '#f3e5f5' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#7b1fa2' }}>
                API ({apis.length})
              </Typography>
              {apis.map((api) => (
                <Box key={api.id} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {api.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {api.metadata.version ? `v${api.metadata.version}` : '버전 정보 없음'}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#f57c00' }}>
                데이터베이스 ({databases.length})
              </Typography>
              {databases.map((db) => (
                <Box key={db.id} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {db.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {db.metadata.description || '설명 없음'}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Card sx={{ height: isFullscreen ? '100vh' : 'auto' }}>
      <CardContent sx={{ p: 0 }}>
        {/* 헤더 */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Box>
            <Tooltip title="새로고침">
              <IconButton onClick={onRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? "축소" : "전체화면"}>
              <IconButton onClick={() => setIsFullscreen(!isFullscreen)} size="small">
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="다이어그램 다운로드">
              <IconButton size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 탭 메뉴 */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              icon={<ArchitectureIcon />} 
              label="아키텍처" 
              iconPosition="start"
            />
            <Tab 
              icon={<DependencyIcon />} 
              label="의존성 그래프" 
              iconPosition="start"
            />
            <Tab 
              icon={<TimelineIcon />} 
              label="서비스 토폴로지" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* 다이어그램 내용 */}
        <Box sx={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px', overflow: 'auto' }}>
          {activeTab === 0 && renderArchitectureDiagram()}
          {activeTab === 1 && renderDependencyGraph()}
          {activeTab === 2 && renderServiceTopology()}
        </Box>

        {/* 선택된 노드 정보 */}
        {selectedNode && (
          <Box sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            backgroundColor: 'grey.50'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              {selectedNode.label} 상세 정보
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  타입: {selectedNode.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  상태: {selectedNode.status}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  버전: {selectedNode.metadata.version || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  소유자: {selectedNode.metadata.owner || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
            {selectedNode.metadata.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {selectedNode.metadata.description}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemDiagram;
