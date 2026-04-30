'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListSubheader,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { TUTORIAL_PAGES, audienceLabel } from '@/lib/tutorialContent';

export type MarketingSiteAppBarProps = {
  /** Tombol kembali di kiri header */
  showBack?: boolean;
  /** Jika diisi, kembali memakai navigasi ke URL ini (prioritas atas riwayat browser) */
  backHref?: string;
  /** Keterangan halaman setelah brand, mis. "Kontak" */
  pageHint?: string;
};

export default function MarketingSiteAppBar({ showBack, backHref, pageHint }: MarketingSiteAppBarProps) {
  const router = useRouter();
  const [navMenuAnchor, setNavMenuAnchor] = useState<null | HTMLElement>(null);
  const closeNavMenu = () => setNavMenuAnchor(null);

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backdropFilter: 'blur(26px) saturate(170%)',
        WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(223,239,251,0.52) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
      }}
    >
      <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%', gap: 0.5, flexWrap: 'nowrap' }}>
        {showBack ? (
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="Kembali"
            size="small"
            sx={{ mr: 0.25, flexShrink: 0 }}
          >
            <ArrowBackIcon />
          </IconButton>
        ) : null}
        <Button
          component={Link}
          href="/"
          color="inherit"
          sx={{
            textTransform: 'none',
            minWidth: 0,
            px: showBack ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          <Typography variant="h6" component="span" fontWeight={800} color="primary">
            Booking App
          </Typography>
        </Button>
        {pageHint ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}
            noWrap
          >
            / {pageHint}
          </Typography>
        ) : null}
        <Box sx={{ flexGrow: 1, minWidth: 8 }} />

        <IconButton
          id="marketing-nav-menu-button"
          color="inherit"
          aria-label="Menu: Login, Panduan, Kontak"
          aria-controls={navMenuAnchor ? 'marketing-nav-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={Boolean(navMenuAnchor) ? 'true' : undefined}
          onClick={(e) => setNavMenuAnchor(e.currentTarget)}
          size="medium"
          sx={{ flexShrink: 0 }}
        >
          <MenuIcon />
        </IconButton>

        <Menu
          id="marketing-nav-menu"
          anchorEl={navMenuAnchor}
          open={Boolean(navMenuAnchor)}
          onClose={closeNavMenu}
          MenuListProps={{ 'aria-labelledby': 'marketing-nav-menu-button', dense: true }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { maxHeight: { xs: '70vh', sm: 480 }, minWidth: 280 } }}
        >
          <MenuItem component={Link} href="/login" onClick={closeNavMenu}>
            <LoginIcon fontSize="small" sx={{ mr: 1.5, opacity: 0.85 }} />
            Login
          </MenuItem>
          <MenuItem component={Link} href="/contact" onClick={closeNavMenu}>
            <MailOutlineIcon fontSize="small" sx={{ mr: 1.5, opacity: 0.85 }} />
            Kontak
          </MenuItem>
          <Divider />
          <ListSubheader disableSticky sx={{ typography: 'overline', lineHeight: 2, color: 'text.secondary' }}>
            Panduan
          </ListSubheader>
          <MenuItem component={Link} href="/tutorial" onClick={closeNavMenu}>
            <MenuBookIcon fontSize="small" sx={{ mr: 1.5, opacity: 0.85 }} />
            <Typography variant="body2" fontWeight={700}>
              Semua panduan
            </Typography>
          </MenuItem>
          <Divider />
          {TUTORIAL_PAGES.map((p) => (
            <MenuItem
              key={p.slug}
              component={Link}
              href={`/tutorial/${p.slug}`}
              onClick={closeNavMenu}
              sx={{ alignItems: 'flex-start', py: 1.25, pl: 2 }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {p.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {audienceLabel(p.audience)} · ±{p.readMinutes} menit
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
