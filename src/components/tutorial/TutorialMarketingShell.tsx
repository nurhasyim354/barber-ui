'use client';

import { Box, Container } from '@mui/material';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';
import MarketingSiteFooter from '@/components/marketing/MarketingSiteFooter';
import MarketingSiteAppBar from '@/components/marketing/MarketingSiteAppBar';

type TutorialMarketingShellProps = {
  children: React.ReactNode;
  /** Judul kecil di header (mis. "Kontak", "Panduan") */
  subtitle?: string;
  /** Tujuan tombol kembali jika tidak memakai riwayat browser */
  backHref?: string;
};

export default function TutorialMarketingShell({ children, subtitle, backHref }: TutorialMarketingShellProps) {
  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <MarketingSiteAppBar showBack pageHint={subtitle} backHref={backHref} />
      <Container maxWidth="md" sx={{ px: UI_LAYOUT.containerGutters.px, py: { xs: 3, md: 4 }, flex: 1 }}>
        {children}
      </Container>
      <MarketingSiteFooter />
    </Box>
  );
}
