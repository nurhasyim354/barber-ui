'use client';

import Box, { type BoxProps } from '@mui/material/Box';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';
import SuperAdminDelegationBanner from './SuperAdminDelegationBanner';

type ShellVariant = 'withBottomNav' | 'adminFooter' | 'reportFooter';

type Props = BoxProps & {
  variant?: ShellVariant;
};

/**
 * Wrapper halaman penuh: min-height viewport, background theme, padding bawah untuk nav/footer.
 */
export default function AppPageShell({ variant = 'withBottomNav', sx, children, ...rest }: Props) {
  const base = UI_LAYOUT.pageShell[variant];
  return (
    <Box sx={{ ...base, ...sx }} {...rest}>
      <SuperAdminDelegationBanner />
      {children}
    </Box>
  );
}
