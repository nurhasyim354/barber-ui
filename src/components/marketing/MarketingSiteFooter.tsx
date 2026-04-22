'use client';

import Link from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';
import { SITE_BRANDING } from '@/lib/siteBranding';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

export default function MarketingSiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        py: 2.5,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="lg" sx={{ px: UI_LAYOUT.containerGutters.px }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ order: { xs: 2, sm: 1 } }}>
            Hak cipta {SITE_BRANDING.copyrightLine}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ order: { xs: 1, sm: 2 } }}>
            <Typography
              variant="caption"
              component={Link}
              href="/contact"
              color="primary"
              sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Kontak
            </Typography>
            <Typography
              variant="caption"
              component={Link}
              href="/tutorial"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Panduan
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
