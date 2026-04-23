'use client';

import Link from 'next/link';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Button,
  Link as MuiLink,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import TutorialMarketingShell from '@/components/tutorial/TutorialMarketingShell';
import { SITE_BRANDING } from '@/lib/siteBranding';

const mailSubject = encodeURIComponent('Pertanyaan Booking App');
const mailHref = `mailto:${SITE_BRANDING.contactEmail}?subject=${mailSubject}`;

export default function ContactPage() {
  return (
    <TutorialMarketingShell subtitle="Kontak">
      <Typography variant="h4" component="h1" fontWeight={800} sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Kontak
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
        Ada pertanyaan tentang produk, trial tenant, atau kemitraan? Tim {SITE_BRANDING.developerLabel} akan membalas lewat
        email.
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 2, maxWidth: 480 }}>
        <CardContent sx={{ py: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <EmailOutlinedIcon color="primary" sx={{ mt: 0.25 }} />
              <Box>
                <Typography fontWeight={700} gutterBottom>
                  Email
                </Typography>
                <MuiLink href={mailHref} variant="body2" fontWeight={600}>
                  {SITE_BRANDING.contactEmail}
                </MuiLink>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Klik alamat di atas untuk membuka aplikasi email Anda.
                </Typography>
              </Box>
            </Stack>
            <Button component={Link} href="/daftar" variant="contained" fullWidth sx={{ mt: 1 }}>
              Daftar tenant / ajukan outlet
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </TutorialMarketingShell>
  );
}
