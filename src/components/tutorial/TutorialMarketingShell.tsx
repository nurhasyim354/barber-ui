'use client';

import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

type TutorialMarketingShellProps = {
  children: React.ReactNode;
  /** Judul kecil di bawah brand (mis. halaman artikel) */
  subtitle?: string;
};

export default function TutorialMarketingShell({ children, subtitle }: TutorialMarketingShellProps) {
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
          <Button
            component={Link}
            href="/"
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 800, color: 'primary.main', minWidth: 0, px: 0.5 }}
          >
            Booking App
          </Button>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
              / {subtitle}
            </Typography>
          ) : null}
          <Box sx={{ flexGrow: 1 }} />
          <Button component={Link} href="/tutorial" color="inherit" startIcon={<MenuBookIcon />} sx={{ mr: 0.5 }}>
            Panduan
          </Button>
          <Button component={Link} href="/login" color="inherit">
            Masuk
          </Button>
          <Button component={Link} href="/daftar" variant="contained" sx={{ ml: 1 }}>
            Daftar
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ px: UI_LAYOUT.containerGutters.px, py: { xs: 3, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}
