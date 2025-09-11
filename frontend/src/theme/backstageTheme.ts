// [advice from AI] 백스테이지IO 디자인 시스템을 Material-UI v5와 호환되도록 구현
// 백스테이지IO의 색상 팔레트와 타이포그래피를 기반으로 커스텀 테마 생성

import { createTheme, ThemeOptions } from '@mui/material/styles';

// [advice from AI] 백스테이지IO의 주요 색상 팔레트
const backstageColors = {
  // Primary colors (Blue 계열)
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // 메인 primary
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  // Secondary colors (Purple 계열)
  secondary: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0', // 메인 secondary
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },
  // Gray scale (백스테이지IO의 중성 색상)
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  // Status colors
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
};

// [advice from AI] 백스테이지IO 스타일의 테마 옵션
const backstageThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: backstageColors.primary[500],
      light: backstageColors.primary[300],
      dark: backstageColors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: backstageColors.secondary[500],
      light: backstageColors.secondary[300],
      dark: backstageColors.secondary[700],
      contrastText: '#ffffff',
    },
    background: {
      default: backstageColors.gray[50],
      paper: '#ffffff',
    },
    text: {
      primary: backstageColors.gray[900],
      secondary: backstageColors.gray[600],
    },
    divider: backstageColors.gray[200],
    success: {
      main: backstageColors.success,
    },
    warning: {
      main: backstageColors.warning,
    },
    error: {
      main: backstageColors.error,
    },
    info: {
      main: backstageColors.info,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      color: backstageColors.gray[900],
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: backstageColors.gray[900],
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: backstageColors.gray[900],
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: backstageColors.gray[900],
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: backstageColors.gray[900],
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: backstageColors.gray[900],
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: backstageColors.gray[700],
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: backstageColors.gray[600],
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // [advice from AI] 백스테이지IO 스타일의 AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: backstageColors.gray[900],
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          borderBottom: `1px solid ${backstageColors.gray[200]}`,
        },
      },
    },
    // [advice from AI] 백스테이지IO 스타일의 Card
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          borderRadius: 8,
          border: `1px solid ${backstageColors.gray[200]}`,
        },
      },
    },
    // [advice from AI] 백스테이지IO 스타일의 Button
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    // [advice from AI] 백스테이지IO 스타일의 Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 8,
        },
      },
    },
  },
};

// [advice from AI] 백스테이지IO 테마 생성
export const backstageTheme = createTheme(backstageThemeOptions);

// [advice from AI] 백스테이지IO 색상 팔레트를 다른 컴포넌트에서 사용할 수 있도록 export
export { backstageColors };
