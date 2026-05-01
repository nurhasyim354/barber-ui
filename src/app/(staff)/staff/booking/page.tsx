'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AppPageShell from '@/components/layout/AppPageShell';
import { StaffBottomNav } from '@/components/layout/BottomNav';
import { BookingFlow } from '@/components/booking/BookingFlow';

export default function StaffBookingPage() {
  return (
    <AppPageShell variant="withBottomNav">
      <Suspense
        fallback={
          <Box sx={{ minHeight: '50vh', display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress />
          </Box>
        }
      >
        <BookingFlow variant="staff" bottomNav={<StaffBottomNav />} />
      </Suspense>
    </AppPageShell>
  );
}
