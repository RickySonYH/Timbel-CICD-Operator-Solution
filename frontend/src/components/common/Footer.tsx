// [advice from AI] 팀벨 회사 정보가 포함된 푸터 컴포넌트

import React from 'react';
import { Box, Typography, Container, Divider } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* 회사 정보 */}
          <Box>
            <Typography variant="h6" color="primary" gutterBottom>
              (주)팀벨 Timeless Label
            </Typography>
            <Typography variant="body2" color="text.secondary">
              대표: 윤종후
            </Typography>
            <Typography variant="body2" color="text.secondary">
              서울 강남구 강남대로 94길 66, 신동빌딩 3-5층
            </Typography>
            <Typography variant="body2" color="text.secondary">
              사업자 등록번호: 206-81-58545
            </Typography>
          </Box>

          {/* 연락처 정보 */}
          <Box>
            <Typography variant="h6" color="primary" gutterBottom>
              연락처
            </Typography>
            <Typography variant="body2" color="text.secondary">
              대표번호: 02-584-8181
            </Typography>
            <Typography variant="body2" color="text.secondary">
              이메일: sales@timbel.net
            </Typography>
            <Typography variant="body2" color="text.secondary">
              웹사이트: www.timbel.net
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          © 2024 (주)팀벨 Timeless Label. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
