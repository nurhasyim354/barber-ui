'use client';

import { Box, Button, TextField, Typography } from '@mui/material';
import type { UiBooking, UiBookingServiceLine } from '@/lib/bookingDisplay';

export type QtyLine = { serviceId: string; quantity: number };

export function buildQtyDraftFromBooking(b: Pick<UiBooking, 'services'>): QtyLine[] {
  return (b.services ?? [])
    .filter((s) => Boolean(s.serviceId))
    .map((s) => ({
      serviceId: s.serviceId as string,
      quantity: Math.max(1, Math.min(99, Math.floor(s.quantity) || 1)),
    }));
}

type BookingWithServices = UiBooking & { _id: string; services?: UiBookingServiceLine[] };

type Props = {
  booking: BookingWithServices;
  show: boolean;
  draftLines: QtyLine[];
  saving: boolean;
  onChangeQuantity: (serviceId: string, quantity: number) => void;
  onSave: () => void;
};

/**
 * Form qty per baris (butuh `tenant.showBookingQty` + `booking.services[]` + status waiting/in_progress).
 */
export function BookingQuantityEditor({
  booking,
  show,
  draftLines,
  saving,
  onChangeQuantity,
  onSave,
}: Props) {
  if (!show || !booking.services?.length) return null;
  if (booking.status === 'done' || booking.status === 'cancelled') return null;
  if (!draftLines.length) return null;

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
        Jumlah per layanan
      </Typography>
      {draftLines.map((line) => {
        const name =
          booking.services!.find((s) => (s.serviceId ?? '') === line.serviceId)?.serviceName ?? line.serviceId;
        return (
          <Box key={line.serviceId} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={name}>
              {name}
            </Typography>
            <TextField
              size="small"
              type="number"
              disabled={saving}
              value={line.quantity}
              onChange={(e) => onChangeQuantity(line.serviceId, parseInt(e.target.value, 10))}
              inputProps={{ min: 1, max: 99, style: { width: 64 } }}
            />
          </Box>
        );
      })}
      <Button size="small" fullWidth variant="outlined" disabled={saving} onClick={onSave}>
        {saving ? 'Menyimpan…' : 'Simpan jumlah'}
      </Button>
    </Box>
  );
}
