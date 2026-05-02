'use client';

import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import type { UiBooking } from '@/lib/bookingDisplay';
import {
  bookingSubtotalOrLegacy,
  formatBookingQueueDate,
  getReceiptServiceLines,
} from '@/lib/bookingDisplay';
import { formatBookingQtyDisplay } from '@/lib/bookingQty';

export type PaymentBookingDetailCardProps = {
  booking: UiBooking;
  assigneeLabel: string;
  /** Opsional: dari GET /bookings/today bila ada akun pelanggan */
  customerPhone?: string | null;
};

export function PaymentBookingDetailCard({
  booking,
  assigneeLabel,
  customerPhone,
}: PaymentBookingDetailCardProps) {
  const lines = getReceiptServiceLines(booking);
  const total = bookingSubtotalOrLegacy(booking);
  const phoneTrim =
    customerPhone != null && String(customerPhone).trim() !== '' ? String(customerPhone).trim() : '';

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2, textAlign: 'left' }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">
          Detail transaksi
        </Typography>

        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <Box component="span" fontWeight={700}>Antrian</Box>{' '}
          #{booking.queueNumber}
          {formatBookingQueueDate(booking.date) ? ` · ${formatBookingQueueDate(booking.date)}` : ''}
        </Typography>
        <Typography variant="body2" sx={{ mb: phoneTrim ? 0.25 : 0.5 }}>
          <Box component="span" fontWeight={700}>Pelanggan</Box> {booking.customerName}
        </Typography>
        {phoneTrim !== '' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            HP: {phoneTrim}
          </Typography>
        )}
        {booking.staffName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {assigneeLabel}: {booking.staffName}
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        <Box
          sx={{
            maxHeight: 'min(400px, 52vh)',
            overflowY: 'auto',
            pr: 0.5,
            mr: -0.5,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {lines.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Rincian layanan tidak tersedia
            </Typography>
          ) : (
            lines.map((L, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1,
                  alignItems: 'flex-start',
                  mb: i < lines.length - 1 ? 1 : 0,
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {L.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatBookingQtyDisplay(L.qty)}
                    {L.unit ? ` ${L.unit}` : ''} × Rp {L.unitPrice.toLocaleString('id-ID')}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>
                  Rp {L.subtotal.toLocaleString('id-ID')}
                </Typography>
              </Box>
            ))
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography fontWeight={800}>Total</Typography>
          <Typography fontWeight={800} color="primary" variant="subtitle1">
            Rp {total.toLocaleString('id-ID')}
          </Typography>
        </Box>

        {booking.notes && String(booking.notes).trim() !== '' && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
            Catatan: {booking.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
