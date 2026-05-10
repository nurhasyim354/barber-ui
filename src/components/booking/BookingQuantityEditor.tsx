'use client';

import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import type { UiBooking, UiBookingServiceLine } from '@/lib/bookingDisplay';
import {
  BOOKING_QTY_DECIMAL_HINT,
  effectiveBookingLineQty,
  formatBookingQtyDisplay,
  parseBookingQuantityInput,
} from '@/lib/bookingQty';

export type QtyLine = { serviceId: string; quantity: number };

export function buildQtyDraftFromBooking(b: Pick<UiBooking, 'services'>): QtyLine[] {
  return (b.services ?? [])
    .filter((s) => Boolean(s.serviceId))
    .map((s) => ({
      serviceId: s.serviceId as string,
      quantity: effectiveBookingLineQty(s.quantity),
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
 * Form qty per baris (butuh `tenant.showBookingQty` + `booking.services[]` + status waiting/in_progress; tidak untuk siap bayar/selesai).
 */
export function BookingQuantityEditor({
  booking,
  show,
  draftLines,
  saving,
  onChangeQuantity,
  onSave,
}: Props) {
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftTexts({});
  }, [booking._id, JSON.stringify(draftLines)]);

  if (!show || !booking.services?.length) return null;
  if (
    booking.status === 'done' ||
    booking.status === 'cancelled' ||
    booking.status === 'waiting_for_payment'
  ) {
    return null;
  }
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
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.25 }}>
        Jumlah per layanan
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, lineHeight: 1.35 }}>
        {BOOKING_QTY_DECIMAL_HINT}
      </Typography>
      {draftLines.map((line) => {
        const row = booking.services!.find((s) => (s.serviceId ?? '') === line.serviceId);
        const name = row?.serviceName ?? line.serviceId;
        const unit = row?.unit;
        const display =
          draftTexts[line.serviceId] !== undefined
            ? draftTexts[line.serviceId]
            : formatBookingQtyDisplay(line.quantity);
        return (
          <Box
            key={line.serviceId}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1, flexWrap: 'wrap' }}
          >
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={name}>
              {name}
              {unit ? (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({unit})
                </Typography>
              ) : null}
            </Typography>
            <TextField
              size="small"
              disabled={saving}
              value={display}
              onChange={(e) =>
                setDraftTexts((t) => ({ ...t, [line.serviceId]: e.target.value }))
              }
              onBlur={() => {
                const raw = draftTexts[line.serviceId];
                if (raw === undefined) return;
                const p = parseBookingQuantityInput(raw);
                setDraftTexts(({ [line.serviceId]: _, ...rest }) => rest);
                if (p != null) {
                  onChangeQuantity(line.serviceId, p);
                } else {
                  toast.error(`Qty tidak valid. ${BOOKING_QTY_DECIMAL_HINT}`);
                }
              }}
              inputProps={{ inputMode: 'decimal', style: { width: 88 } }}
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
