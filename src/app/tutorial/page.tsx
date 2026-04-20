'use client';

import Link from 'next/link';
import {
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  TUTORIAL_PAGES,
  audienceLabel,
  type TutorialAudience,
  type TutorialPageDef,
} from '@/lib/tutorialContent';
import TutorialMarketingShell from '@/components/tutorial/TutorialMarketingShell';

const AUDIENCE_ORDER: TutorialAudience[] = ['pelanggan', 'admin_outlet', 'staff', 'platform'];

function groupByAudience(pages: TutorialPageDef[]): Record<TutorialAudience, TutorialPageDef[]> {
  const init: Record<TutorialAudience, TutorialPageDef[]> = {
    pelanggan: [],
    admin_outlet: [],
    staff: [],
    platform: [],
  };
  for (const p of pages) {
    init[p.audience].push(p);
  }
  return init;
}

export default function TutorialHubPage() {
  const grouped = groupByAudience(TUTORIAL_PAGES);

  return (
    <TutorialMarketingShell subtitle="Panduan">
      <Button component={Link} href="/" startIcon={<ArrowBackIcon />} color="inherit" size="small" sx={{ mb: 2 }}>
        Kembali ke beranda
      </Button>

      <Typography variant="h4" component="h1" fontWeight={800} sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Panduan fitur
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 640 }}>
        Panduan singkat per peran: pelanggan, admin outlet, staff, dan admin platform. Tiap topik menjelaskan alur utama
        di aplikasi tanpa perlu login.
      </Typography>

      <Stack spacing={4}>
        {AUDIENCE_ORDER.filter((a) => grouped[a].length > 0).map((audience, idx, arr) => {
          const list = grouped[audience];
          const isLast = idx === arr.length - 1;
          return (
            <Box key={audience} sx={{ pb: isLast ? 0 : 2, borderBottom: isLast ? 'none' : 1, borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  {audienceLabel(audience)}
                </Typography>
                <Chip label={`${list.length} topik`} size="small" variant="outlined" />
              </Stack>
              <Stack spacing={1.5}>
                {list.map((p) => (
                  <Card key={p.slug} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardActionArea component={Link} href={`/tutorial/${p.slug}`}>
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Typography fontWeight={700} gutterBottom>
                          {p.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {p.lead}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                          ± {p.readMinutes} menit baca
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </TutorialMarketingShell>
  );
}
