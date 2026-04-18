'use client';

import Container, { type ContainerProps } from '@mui/material/Container';
import { UI_LAYOUT } from '@/lib/uiStyleConfig';

type Props = {
  children: React.ReactNode;
  maxWidth?: ContainerProps['maxWidth'];
  disableGutters?: boolean;
} & Omit<ContainerProps, 'maxWidth' | 'children' | 'disableGutters'>;

/**
 * Area konten utama: lebar mengikuti breakpoint, padding horizontal dari UI_LAYOUT.
 */
export default function PageContainer({ children, maxWidth, disableGutters, sx, ...rest }: Props) {
  return (
    <Container
      maxWidth={maxWidth ?? UI_LAYOUT.contentMaxWidth}
      disableGutters={disableGutters}
      sx={{
        ...UI_LAYOUT.containerGutters,
        ...sx,
        mt: 2,
      }}
      {...rest}
    >
      {children}
    </Container>
  );
}
