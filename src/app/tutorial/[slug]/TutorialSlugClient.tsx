'use client';

import Link from 'next/link';
import {
  Typography,
  Box,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Chip,
} from '@mui/material';
import type { TutorialPageDef } from '@/lib/tutorialContent';
import { audienceLabel } from '@/lib/tutorialContent';
import TutorialMarketingShell from '@/components/tutorial/TutorialMarketingShell';

export default function TutorialSlugClient({ page }: { page: TutorialPageDef }) {
  return (
    <TutorialMarketingShell subtitle={page.title} backHref="/tutorial">
      <Breadcrumbs sx={{ mb: 2 }} separator="›">
        <MuiLink component={Link} href="/" underline="hover" color="inherit" variant="body2">
          Beranda
        </MuiLink>
        <MuiLink component={Link} href="/tutorial" underline="hover" color="inherit" variant="body2">
          Panduan
        </MuiLink>
        <Typography color="text.primary" variant="body2" noWrap sx={{ maxWidth: { xs: 160, sm: 'none' } }}>
          {page.title}
        </Typography>
      </Breadcrumbs>

      <Chip label={audienceLabel(page.audience)} size="small" sx={{ mb: 2 }} color="primary" variant="outlined" />

      <Typography variant="h4" component="h1" fontWeight={800} sx={{ mb: 1, fontSize: { xs: '1.4rem', sm: '2rem' } }}>
        {page.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {page.lead}
      </Typography>

      <Box component="article">
        {page.sections.map((sec) => (
          <Box key={sec.heading} sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
              {sec.heading}
            </Typography>
            {sec.paragraphs.map((para, pi) => (
              <Typography
                key={`${sec.heading}-p-${pi}`}
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, lineHeight: 1.7 }}
              >
                {para}
              </Typography>
            ))}
            {sec.bullets?.length ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5, my: 1 }}>
                {sec.bullets.map((b) => (
                  <Typography key={b} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5, lineHeight: 1.65 }}>
                    {b}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
          Butuh akun outlet?
        </Typography>
        <Button component={Link} href="/daftar" variant="contained" size="medium">
          Daftar
        </Button>
      </Box>
    </TutorialMarketingShell>
  );
}
