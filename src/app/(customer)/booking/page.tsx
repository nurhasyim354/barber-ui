'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { BookingFlow } from '@/components/booking/BookingFlow';

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress color="primary" />
        </Box>
      }
    >
      <BookingFlow variant="customer" />
    </Suspense>
  );
}
