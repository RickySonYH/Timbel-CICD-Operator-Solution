import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Menu,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon
} from '@mui/icons-material';

// [advice from AI] 다이어그램 캔버스 컴포넌트 - 드래그 앤 드롭으로 다이어그램 그리기
interface DiagramNode {
  id: string;
  label: string;
  type: 'service' | 'api' | 'component' | 'database' | 'external';
  status: 'active' | 'inactive' | 'deprecated' | 'development';
  x: number;
  y: number;
  width: number;
  height: number;
  dependencies: string[];
  metadata: {
    version?: string;
    description?: string;
    owner?: string;
    lastUpdated?: string;
  };
}

interface DiagramConnection {
  id: string;
  from: string;
  to: string;
  type: 'dependency' | 'data-flow' | 'api-call';
  label?: string;
}

interface DiagramCanvasProps {
  onSave?: (nodes: DiagramNode[], connections: DiagramConnection[]) => void;
  initialNodes?: DiagramNode[];
  initialConnections?: DiagramConnection[];
}

const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  onSave,
  initialNodes = [],
  initialConnections = []
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<DiagramNode[]>(initialNodes);
  const [connections, setConnections] = useState<DiagramConnection[]>(initialConnections);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; nodeId: string | null } | null>(null);
  const [addNodeDialog, setAddNodeDialog] = useState(false);
  const [editNodeDialog, setEditNodeDialog] = useState<{ node: DiagramNode | null }>({ node: null });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<{ nodes: DiagramNode[]; connections: DiagramConnection[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // [advice from AI] 노드 타입별 스타일
  const getNodeStyle = (node: DiagramNode) => {
    const baseStyle = {
      position: 'absolute' as const,
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      borderRadius: '8px',
      border: '2px solid',
      cursor: 'move',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center' as const,
      padding: '8px',
      userSelect: 'none' as const,
      zIndex: selectedNode === node.id ? 10 : 1
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
      ...statusStyles[node.status],
      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
      ...(selectedNode === node.id && {
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        borderWidth: '3px'
      })
    };
  };

  // [advice from AI] 히스토리 저장
  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], connections: [...connections] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // [advice from AI] 노드 추가
  const addNode = (type: DiagramNode['type']) => {
    const newNode: DiagramNode = {
      id: `node-${Date.now()}`,
      label: `새 ${type}`,
      type,
      status: 'development',
      x: 100 + (nodes.length * 50) % 400,
      y: 100 + (nodes.length * 50) % 300,
      width: 120,
      height: 80,
      dependencies: [],
      metadata: {
        version: '1.0.0',
        description: '',
        owner: '',
        lastUpdated: new Date().toISOString()
      }
    };

    saveToHistory();
    setNodes([...nodes, newNode]);
    setAddNodeDialog(false);
  };

  // [advice from AI] 노드 삭제
  const deleteNode = (nodeId: string) => {
    saveToHistory();
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
    setSelectedNode(null);
    setContextMenu(null);
  };

  // [advice from AI] 노드 편집
  const editNode = (node: DiagramNode) => {
    setEditNodeDialog({ node });
    setContextMenu(null);
  };

  // [advice from AI] 노드 업데이트
  const updateNode = (updatedNode: DiagramNode) => {
    saveToHistory();
    setNodes(nodes.map(node => node.id === updatedNode.id ? updatedNode : node));
    setEditNodeDialog({ node: null });
  };

  // [advice from AI] 연결 생성
  const createConnection = (fromNodeId: string, toNodeId: string) => {
    if (fromNodeId === toNodeId) return;

    const newConnection: DiagramConnection = {
      id: `conn-${Date.now()}`,
      from: fromNodeId,
      to: toNodeId,
      type: 'dependency',
      label: ''
    };

    saveToHistory();
    setConnections([...connections, newConnection]);
  };

  // [advice from AI] 연결 삭제
  const deleteConnection = (connectionId: string) => {
    saveToHistory();
    setConnections(connections.filter(conn => conn.id !== connectionId));
  };

  // [advice from AI] 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setDraggedNode(nodeId);
    setSelectedNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNode) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom - pan.x;
    const y = (e.clientY - rect.top) / zoom - pan.y;

    setNodes(nodes.map(node => 
      node.id === draggedNode 
        ? { ...node, x: Math.max(0, x - node.width / 2), y: Math.max(0, y - node.height / 2) }
        : node
    ));
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      saveToHistory();
    }
    setDraggedNode(null);
  };

  // [advice from AI] 우클릭 메뉴
  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX + 2,
      mouseY: e.clientY - 6,
      nodeId
    });
  };

  // [advice from AI] 연결 모드 토글
  const toggleConnectionMode = () => {
    setIsConnecting(!isConnecting);
    setConnectionStart(null);
  };

  // [advice from AI] 노드 클릭 (연결 모드)
  const handleNodeClick = (nodeId: string) => {
    if (!isConnecting) return;

    if (!connectionStart) {
      setConnectionStart(nodeId);
    } else {
      createConnection(connectionStart, nodeId);
      setConnectionStart(null);
      setIsConnecting(false);
    }
  };

  // [advice from AI] 실행 취소/다시 실행
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes([...prevState.nodes]);
      setConnections([...prevState.connections]);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes([...nextState.nodes]);
      setConnections([...nextState.connections]);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // [advice from AI] 줌 컨트롤
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleCenter = () => setPan({ x: 0, y: 0 });

  // [advice from AI] 저장
  const handleSave = () => {
    onSave?.(nodes, connections);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 툴바 */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <Typography variant="h6" sx={{ mr: 2 }}>
          다이어그램 캔버스
        </Typography>

        {/* 노드 추가 버튼들 */}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddNodeDialog(true)}
          size="small"
        >
          노드 추가
        </Button>

        {/* 연결 모드 */}
        <Button
          variant={isConnecting ? "contained" : "outlined"}
          startIcon={<LinkIcon />}
          onClick={toggleConnectionMode}
          size="small"
        >
          {isConnecting ? '연결 중...' : '연결하기'}
        </Button>

        <Divider orientation="vertical" flexItem />

        {/* 편집 도구 */}
        <Tooltip title="실행 취소">
          <IconButton onClick={undo} disabled={historyIndex <= 0} size="small">
            <UndoIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="다시 실행">
          <IconButton onClick={redo} disabled={historyIndex >= history.length - 1} size="small">
            <RedoIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* 줌 컨트롤 */}
        <Tooltip title="확대">
          <IconButton onClick={handleZoomIn} size="small">
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="축소">
          <IconButton onClick={handleZoomOut} size="small">
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="중앙 정렬">
          <IconButton onClick={handleCenter} size="small">
            <CenterIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="body2" sx={{ ml: 1 }}>
          {Math.round(zoom * 100)}%
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="small"
        >
          저장
        </Button>
      </Box>

      {/* 캔버스 영역 */}
      <Box
        ref={canvasRef}
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#fafafa',
          backgroundImage: `
            radial-gradient(circle, #e0e0e0 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          cursor: isConnecting ? 'crosshair' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* 연결선 그리기 */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          {connections.map((conn) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const fromX = fromNode.x + fromNode.width / 2;
            const fromY = fromNode.y + fromNode.height / 2;
            const toX = toNode.x + toNode.width / 2;
            const toY = toNode.y + toNode.height / 2;

            return (
              <g key={conn.id}>
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke="#666"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {conn.label && (
                  <text
                    x={(fromX + toX) / 2}
                    y={(fromY + toY) / 2}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#666"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#666"
              />
            </marker>
          </defs>
        </svg>

        {/* 노드들 */}
        {nodes.map((node) => (
          <Box
            key={node.id}
            sx={getNodeStyle(node)}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={() => handleNodeClick(node.id)}
            onContextMenu={(e) => handleContextMenu(e, node.id)}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {node.label}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {node.type.toUpperCase()}
            </Typography>
            {node.metadata.version && (
              <Chip 
                label={`v${node.metadata.version}`} 
                size="small" 
                sx={{ mt: 0.5, fontSize: '0.6rem', height: '16px' }}
              />
            )}
          </Box>
        ))}

        {/* 연결 시작점 표시 */}
        {connectionStart && (
          <Box
            sx={{
              position: 'absolute',
              left: nodes.find(n => n.id === connectionStart)?.x || 0,
              top: nodes.find(n => n.id === connectionStart)?.y || 0,
              width: 120,
              height: 80,
              border: '2px dashed #2196f3',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 5
            }}
          />
        )}
      </Box>

      {/* 우클릭 메뉴 */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => contextMenu?.nodeId && editNode(nodes.find(n => n.id === contextMenu.nodeId)!)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          편집
        </MenuItem>
        <MenuItem onClick={() => contextMenu?.nodeId && deleteNode(contextMenu.nodeId)}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          삭제
        </MenuItem>
      </Menu>

      {/* 노드 추가 다이얼로그 */}
      <Dialog open={addNodeDialog} onClose={() => setAddNodeDialog(false)}>
        <DialogTitle>노드 추가</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            추가할 노드 타입을 선택하세요:
          </Typography>
          <Grid container spacing={1}>
            {['service', 'api', 'component', 'database', 'external'].map((type) => (
              <Grid item xs={6} key={type}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => addNode(type as DiagramNode['type'])}
                  sx={{ textTransform: 'capitalize' }}
                >
                  {type}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddNodeDialog(false)}>취소</Button>
        </DialogActions>
      </Dialog>

      {/* 노드 편집 다이얼로그 */}
      <Dialog open={editNodeDialog.node !== null} onClose={() => setEditNodeDialog({ node: null })}>
        <DialogTitle>노드 편집</DialogTitle>
        <DialogContent>
          {editNodeDialog.node && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="노드 이름"
                value={editNodeDialog.node.label}
                onChange={(e) => editNodeDialog.node && setEditNodeDialog({
                  node: { ...editNodeDialog.node, label: e.target.value }
                })}
                fullWidth
              />
              <TextField
                label="설명"
                value={editNodeDialog.node.metadata.description || ''}
                onChange={(e) => editNodeDialog.node && setEditNodeDialog({
                  node: {
                    ...editNodeDialog.node,
                    metadata: { ...editNodeDialog.node.metadata, description: e.target.value }
                  }
                })}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="버전"
                value={editNodeDialog.node.metadata.version || ''}
                onChange={(e) => editNodeDialog.node && setEditNodeDialog({
                  node: {
                    ...editNodeDialog.node,
                    metadata: { ...editNodeDialog.node.metadata, version: e.target.value }
                  }
                })}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNodeDialog({ node: null })}>취소</Button>
          <Button 
            onClick={() => editNodeDialog.node && updateNode(editNodeDialog.node)}
            variant="contained"
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiagramCanvas;
