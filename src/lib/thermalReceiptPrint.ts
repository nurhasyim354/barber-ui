import toast from 'react-hot-toast';
import { formatBookingQueueDate, formatRpId } from './bookingDisplay';

/** Selaras dengan `ThermalReceipt` di API (`GET /payments/:id/receipt`) */
export interface ThermalReceipt {
  receiptNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  cashierName: string;
  paidAt: string;
  queueNumber: number;
  customerName: string;
  staffName: string | null;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  notes: string;
  footer: string;
}

/** Lebar kertas thermal untuk pratinjau & cetak browser (kriteria umum: 58mm) */
export const BROWSER_THERMAL_PAPER_WIDTH_MM = 58;

/**
 * CSS satu sumber untuk nota browser — selaras lebar 58mm (bukan 80mm).
 * Font & baris item sedikit diperkecil agar rupiah + qty muat tanpa putus tengah kertas.
 */
export function getBrowserThermalPrintPageCss(): string {
  const w = BROWSER_THERMAL_PAPER_WIDTH_MM;
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.35;
      width: ${w}mm;
      max-width: ${w}mm;
      margin: 0 auto;
      padding: 3mm;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 14px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
      font-size: 10px;
    }
    .row span { min-width: 0; }
    .spacer { margin: 4px 0; }
    @media print {
      @page { margin: 0; size: ${w}mm auto; }
    }
  `;
}

// —— ESC/POS (printer thermal Bluetooth, sama urutan dengan alur bayar di POS) ——
const ESC = '\x1B';
const GS = '\x1D';
const RESET = ESC + '@';
const CENTER = ESC + 'a\x01';
const LEFT = ESC + 'a\x00';
const BOLD_ON = ESC + 'E\x01';
const BOLD_OFF = ESC + 'E\x00';
const DOUBLE_HEIGHT = GS + '!\x01';
const NORMAL_SIZE = GS + '!\x00';
const CUT = GS + 'V\x41\x00';
const LINE_FEED = '\n';

/**
 * String ESC/POS untuk `ThermalReceipt` (bisa dikirim ke printer Bluetooth lewat `sendEscPosToBluetooth`).
 */
export function buildThermalReceiptEscPos(
  receipt: ThermalReceipt,
  opts: { assigneeLabel: string; bookingDateIso?: string | null },
): string {
  const divider = '--------------------------------\n';
  const dashes = '- - - - - - - - - - - - - - - -\n';
  const itemParts: string[] = [];
  if (receipt.items.length > 0) {
    itemParts.push(LEFT, BOLD_ON, 'Layanan\n', BOLD_OFF, divider);
    for (const it of receipt.items) {
      itemParts.push(LEFT, `${it.name}\n`);
      itemParts.push(
        LEFT,
        `  Rp ${formatRpId(it.price)} x ${it.qty} = Rp ${formatRpId(it.subtotal)}\n`,
      );
    }
    itemParts.push(divider);
  } else {
    itemParts.push(
      CENTER,
      BOLD_ON,
      'Layanan' + LINE_FEED,
      BOLD_OFF,
      LEFT,
      divider,
    );
  }

  const bookingLine =
    opts.bookingDateIso && formatBookingQueueDate(opts.bookingDateIso)
      ? `Tgl booking : ${formatBookingQueueDate(opts.bookingDateIso)}\n`
      : '';

  const addrBlock: string[] = [];
  if (receipt.storeAddress) addrBlock.push(LEFT, `${receipt.storeAddress}\n`);
  if (receipt.storePhone) addrBlock.push(LEFT, `${receipt.storePhone}\n`);

  const changeLine = receipt.change > 0
    ? `Kembalian : Rp ${receipt.change.toLocaleString('id-ID')}\n`
    : '';

  return [
    RESET,
    CENTER,
    BOLD_ON,
    DOUBLE_HEIGHT,
    receipt.storeName + LINE_FEED,
    NORMAL_SIZE,
    BOLD_OFF,
    ...addrBlock,
    CENTER,
    receipt.receiptNumber + '\n',
    ' RECEIPT \n',
    dashes,
    LEFT,
    `Tgl : ${receipt.paidAt}\n`,
    `No  : #${receipt.queueNumber.toString().padStart(4, '0')}\n`,
    bookingLine,
    divider,
    ...itemParts,
    `Pelanggan : ${receipt.customerName}\n`,
    receipt.staffName ? `${opts.assigneeLabel}    : ${receipt.staffName}\n` : '',
    receipt.cashierName ? `Kasir     : ${receipt.cashierName}\n` : '',
    receipt.notes ? `Catatan   : ${receipt.notes}\n` : '',
    divider,
    CENTER,
    BOLD_ON,
    `TOTAL: Rp ${receipt.total.toLocaleString('id-ID')}\n`,
    BOLD_OFF,
    LEFT,
    `Metode    : ${receipt.paymentMethod}\n`,
    `Bayar     : Rp ${receipt.amountPaid.toLocaleString('id-ID')}\n`,
    changeLine,
    divider,
    CENTER,
    receipt.footer + '\n',
    LINE_FEED,
    LINE_FEED,
    LINE_FEED,
    CUT,
  ].join('');
}

/**
 * Kirim teks ESC/POS ke printer thermal BLE (Serial Port Profile).
 */
export async function sendEscPosToBluetooth(text: string): Promise<void> {
  if (!('bluetooth' in navigator) || !(navigator as Navigator & { bluetooth?: unknown }).bluetooth) {
    toast.error('Browser tidak mendukung Bluetooth. Gunakan Chrome di Android/Desktop.');
    return;
  }

  try {
    toast.loading('Mencari printer...');
    type BtDevice = {
      gatt?: {
        connect: () => Promise<{
          getPrimaryService: (uuid: string) => Promise<{
            getCharacteristic: (uuid: string) => Promise<{
              writeValue: (data: BufferSource) => Promise<void>;
            }>;
          }>;
        }>;
      };
    };
    const bt = (navigator as Navigator & {
      bluetooth: { requestDevice: (opts: object) => Promise<BtDevice> };
    }).bluetooth;

    const device = await bt.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    });

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const CHUNK = 100;
    for (let i = 0; i < data.length; i += CHUNK) {
      await characteristic?.writeValue(data.slice(i, i + CHUNK));
    }

    toast.dismiss();
    toast.success('Nota berhasil dicetak!');
  } catch (err) {
    toast.dismiss();
    const msg = (err as Error).message;
    if (msg?.includes('cancelled') || msg?.includes('No device')) {
      toast('Printer tidak dipilih', { icon: '⚠️' });
    } else {
      toast.error('Gagal cetak: ' + msg);
    }
  }
}

/**
 * Buka jendela cetak untuk kertas thermal **58mm** dari payload nota API.
 */
export function openThermalReceiptPrint(
  receipt: ThermalReceipt,
  opts: { assigneeLabel: string; bookingDateIso?: string | null },
): void {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (n: number) => n.toLocaleString('id-ID');
  const bq = opts.bookingDateIso && formatBookingQueueDate(opts.bookingDateIso);
  const bookingDateLine = bq ? `<div>Tgl booking : ${esc(bq)}</div>` : '';
  const itemsHtml =
    receipt.items.length > 0
      ? `<div class="bold" style="margin-bottom:4px">Layanan</div>${receipt.items
          .map(
            (it) =>
              `<div style="margin-bottom:6px"><div class="bold">${esc(it.name)}</div>` +
              `<div class="row"><span>Rp ${fmt(it.price)} x ${it.qty}</span>` +
              `<span>= Rp ${fmt(it.subtotal)}</span></div></div>`,
          )
          .join('')}`
      : '';
  const changeLine = receipt.change > 0
    ? `<div>Kembalian : Rp ${fmt(receipt.change)}</div>`
    : '';
  const addrBlock =
    (receipt.storeAddress || receipt.storePhone)
      ? `<div class="center spacer" style="font-size:10px; line-height:1.4">${
        receipt.storeAddress ? esc(receipt.storeAddress) : ''
      }${receipt.storeAddress && receipt.storePhone ? '<br/>' : ''}${
        receipt.storePhone ? esc(receipt.storePhone) : ''
      }</div>`
      : '';
  const notesBlock = receipt.notes
    ? `<div>Catatan   : ${esc(receipt.notes)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
${getBrowserThermalPrintPageCss()}
  </style>
</head>
<body>
  <div class="center bold large spacer">${esc(receipt.storeName)}</div>
  ${addrBlock}
  <div class="center spacer" style="font-size:10px">${esc(receipt.receiptNumber)}</div>
  <div class="center spacer"> RECEIPT </div>
  <div class="divider"></div>
  <div>Tgl : ${esc(receipt.paidAt)}</div>
  <div>No  : #${receipt.queueNumber.toString().padStart(4, '0')}</div>
  ${bookingDateLine}
  <div class="divider"></div>
  ${itemsHtml}
  <div class="divider"></div>
  <div>Pelanggan : ${esc(receipt.customerName)}</div>
  ${receipt.staffName ? `<div>${esc(opts.assigneeLabel)}    : ${esc(receipt.staffName)}</div>` : ''}
  ${receipt.cashierName ? `<div>Kasir     : ${esc(receipt.cashierName)}</div>` : ''}
  ${notesBlock}
  <div class="divider"></div>
  <div class="center bold large spacer">TOTAL: Rp ${fmt(receipt.total)}</div>
  <div>Metode    : ${esc(receipt.paymentMethod)}</div>
  <div>Bayar     : Rp ${fmt(receipt.amountPaid)}</div>
  ${changeLine}
  <div class="divider"></div>
  <div class="center spacer">${esc(receipt.footer)}</div>
  <div class="spacer"></div>
  <div class="spacer"></div>
</body>
</html>`;

  const w = window.open(
    '',
    '_blank',
    `width=${Math.round(BROWSER_THERMAL_PAPER_WIDTH_MM * 3.78) + 40},height=640`,
  );
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 300);
  }
}
