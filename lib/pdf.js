import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ORANGE = rgb(1, 0.42, 0);
const ORANGE_LIGHT = rgb(1, 0.96, 0.91);
const NAVY = rgb(0, 0.2, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const GRAY_LIGHT = rgb(0.6, 0.6, 0.6);
const LIGHT = rgb(0.97, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.1, 0.1, 0.1);

// Full country names lookup
const COUNTRY_NAMES = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AR: 'Argentina', AM: 'Armenia', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan',
  BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados', BY: 'Belarus',
  BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BT: 'Bhutan', BO: 'Bolivia',
  BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil', BN: 'Brunei',
  BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', KH: 'Cambodia',
  CM: 'Cameroon', CA: 'Canada', CV: 'Cape Verde', CF: 'Central African Republic',
  TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', KM: 'Comoros',
  CG: 'Congo', CD: 'Congo (DRC)', CR: 'Costa Rica', CI: 'Ivory Coast',
  HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland', FR: 'France',
  GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana',
  GR: 'Greece', GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea', GY: 'Guyana',
  HT: 'Haiti', HN: 'Honduras', HK: 'Hong Kong', HU: 'Hungary', IS: 'Iceland',
  IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IE: 'Ireland',
  IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan', JO: 'Jordan',
  KZ: 'Kazakhstan', KE: 'Kenya', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos',
  LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MO: 'Macao',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania', MU: 'Mauritius',
  MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia',
  ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand',
  NI: 'Nicaragua', NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman',
  PK: 'Pakistan', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay',
  PE: 'Peru', PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar',
  RO: 'Romania', RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia', SN: 'Senegal',
  RS: 'Serbia', SC: 'Seychelles', SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia',
  SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa', KR: 'South Korea',
  SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan',
  TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TO: 'Tonga',
  TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan',
  UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates', GB: 'United Kingdom',
  US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VU: 'Vanuatu',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe'
};

function countryName(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || code;
}

function s(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function fmtDate(d) {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return String(date.getDate()).padStart(2, '0') + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  } catch (e) { return String(d); }
}

function fmtTime(t) {
  if (!t) return '-';
  return String(t).slice(0, 5);
}

/**
 * Fetch QR code image bytes from QR Server API
 */
async function fetchQRCode(text) {
  const url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(text);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.error('[QR] Failed:', e.message);
    return null;
  }
}

/**
 * Booking confirmation PDF
 */
export async function generateBookingPDF(shipment) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height;

  // ===== HEADER BAR =====
  page.drawRectangle({ x: 0, y: y - 80, width, height: 80, color: ORANGE });
  page.drawRectangle({ x: 40, y: y - 68, width: 56, height: 56, color: WHITE });
  page.drawText('sXL', { x: 50, y: y - 46, size: 20, font: fontBold, color: ORANGE });

  page.drawText('SUPER EXPRESS', { x: 110, y: y - 32, size: 18, font: fontBold, color: WHITE });
  page.drawText('LOGISTICS CENTER', { x: 110, y: y - 50, size: 10, font, color: WHITE });

  page.drawText('BOOKING CONFIRMATION', { x: 400, y: y - 45, size: 9, font: fontBold, color: WHITE });

  y -= 80;

  // ===== TRACKING NUMBER BLOCK =====
  page.drawRectangle({ x: 0, y: y - 90, width, height: 90, color: NAVY });

  page.drawText('TRACKING NUMBER', { x: 40, y: y - 28, size: 9, font, color: rgb(0.7, 0.8, 0.9) });
  page.drawText(s(shipment.tracking_number), { x: 40, y: y - 62, size: 26, font: fontBold, color: WHITE });

  // QR code (right side)
  let qrImage = null;
  try {
    const trackUrl = 'https://sxlsuperexpress.vercel.app/track?tn=' + s(shipment.tracking_number);
    const qrBytes = await fetchQRCode(trackUrl);
    if (qrBytes) {
      qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawRectangle({ x: width - 110, y: y - 80, width: 80, height: 80, color: WHITE });
      page.drawImage(qrImage, { x: width - 108, y: y - 78, width: 76, height: 76 });
    }
  } catch (e) {
    console.error('[PDF QR] Failed:', e.message);
  }

  y -= 90;

  // ===== STATUS + SERVICE ROW =====
  y -= 20;
  page.drawRectangle({ x: 40, y: y - 30, width: width - 80, height: 30, color: ORANGE_LIGHT });

  const statusText = s(shipment.status || 'Booked').toUpperCase();
  page.drawText('STATUS', { x: 55, y: y - 12, size: 8, font: fontBold, color: GRAY });
  page.drawText(statusText, { x: 55, y: y - 24, size: 11, font: fontBold, color: ORANGE });

  page.drawText('SERVICE', { x: 220, y: y - 12, size: 8, font: fontBold, color: GRAY });
  page.drawText(s(shipment.service_type || '-'), { x: 220, y: y - 24, size: 10, font, color: BLACK });

  page.drawText('MODE', { x: 360, y: y - 12, size: 8, font: fontBold, color: GRAY });
  page.drawText(s(shipment.ship_mode || '-'), { x: 360, y: y - 24, size: 10, font, color: BLACK });

  page.drawText('DATE', { x: 460, y: y - 12, size: 8, font: fontBold, color: GRAY });
  page.drawText(fmtDate(shipment.booked_at), { x: 460, y: y - 24, size: 9, font, color: BLACK });

  y -= 30;

  // ===== SHIPPER / CONSIGNEE =====
  y -= 25;
  const colW = (width - 80 - 15) / 2;
  const leftX = 40;
  const rightX = 40 + colW + 15;

  // Headers
  page.drawRectangle({ x: leftX, y: y - 22, width: colW, height: 22, color: NAVY });
  page.drawText('SHIPPER (FROM)', { x: leftX + 10, y: y - 15, size: 10, font: fontBold, color: WHITE });

  page.drawRectangle({ x: rightX, y: y - 22, width: colW, height: 22, color: NAVY });
  page.drawText('CONSIGNEE (TO)', { x: rightX + 10, y: y - 15, size: 10, font: fontBold, color: WHITE });

  y -= 22;

  // Party data rows
  const shipperLines = [
    ['Name', s(shipment.sender_name)],
    ['Address', s(shipment.pickup_address)],
    ['City', s(shipment.pickup_city) + (shipment.pickup_state ? ', ' + s(shipment.pickup_state) : '')],
    ['Country', countryName(shipment.origin)],
    ['Phone', s(shipment.sender_phone)],
    ['Email', s(shipment.sender_email)],
  ];

  const consigneeLines = [
    ['Name', s(shipment.recipient_name)],
    ['Address', s(shipment.destination)],
    ['Country', countryName(shipment.destination)],
    ['Phone', s(shipment.recipient_phone)],
    ['Email', s(shipment.recipient_email)],
    ['BIN', s(shipment.recipient_bin) || '-'],
  ];

  const maxRows = Math.max(shipperLines.length, consigneeLines.length);
  const rowHeight = 24;

  page.drawRectangle({ x: leftX, y: y - maxRows * rowHeight, width: colW, height: maxRows * rowHeight, color: LIGHT });
  page.drawRectangle({ x: rightX, y: y - maxRows * rowHeight, width: colW, height: maxRows * rowHeight, color: LIGHT });

  for (let i = 0; i < maxRows; i++) {
    const rowY = y - (i + 1) * rowHeight + 8;

    if (shipperLines[i]) {
      page.drawText(shipperLines[i][0] + ':', { x: leftX + 10, y: rowY, size: 8, font: fontBold, color: GRAY });
      const val = truncate(shipperLines[i][1], 30);
      page.drawText(val, { x: leftX + 65, y: rowY, size: 8, font, color: BLACK });
    }

    if (consigneeLines[i]) {
      page.drawText(consigneeLines[i][0] + ':', { x: rightX + 10, y: rowY, size: 8, font: fontBold, color: GRAY });
      const val = truncate(consigneeLines[i][1], 30);
      page.drawText(val, { x: rightX + 65, y: rowY, size: 8, font, color: BLACK });
    }
  }

  y -= maxRows * rowHeight + 25;

  // ===== SHIPMENT DETAILS =====
  page.drawRectangle({ x: 40, y: y - 22, width: width - 80, height: 22, color: NAVY });
  page.drawText('SHIPMENT DETAILS', { x: 50, y: y - 15, size: 10, font: fontBold, color: WHITE });
  y -= 22;

  const shipDetails = [
    ['Parcel Type', s(shipment.parcel_type) === 'Others' && shipment.parcel_type_custom ? 'Others: ' + s(shipment.parcel_type_custom) : s(shipment.parcel_type)],
    ['Description', s(shipment.description)],
    ['Packages', s(shipment.packages)],
    ['Total Weight', s(shipment.total_weight) + ' kg'],
    ['Shipper Ref', s(shipment.shipper_ref) || '-'],
    ['Special Instructions', s(shipment.special_instruction) || '-'],
  ];

  const detRowH = 20;
  page.drawRectangle({ x: 40, y: y - shipDetails.length * detRowH, width: width - 80, height: shipDetails.length * detRowH, color: LIGHT });

  for (let i = 0; i < shipDetails.length; i++) {
    const rowY = y - (i + 1) * detRowH + 7;
    page.drawText(shipDetails[i][0] + ':', { x: 55, y: rowY, size: 8, font: fontBold, color: GRAY });
    page.drawText(truncate(shipDetails[i][1], 55), { x: 170, y: rowY, size: 8, font, color: BLACK });
  }

  y -= shipDetails.length * detRowH + 25;

  // ===== PICKUP + PAYMENT (2 cols) =====
  const pickupRows = [
    ['Pickup', shipment.pickup_same_as_shipper === true ? 'Same as Shipper' : s(shipment.pickup_address)],
    ['Ready Date', fmtDate(shipment.parcel_ready_date)],
    ['Ready Time', fmtTime(shipment.parcel_ready_time)],
  ];

  const paymentRows = [
    ['Payment Type', s(shipment.payment_terms) || '-'],
    ['Payment Method', s(shipment.payment_method) || '-'],
    ['Currency', s(shipment.currency) || 'USD'],
  ];

  // Headers
  page.drawRectangle({ x: leftX, y: y - 22, width: colW, height: 22, color: NAVY });
  page.drawText('PICKUP', { x: leftX + 10, y: y - 15, size: 10, font: fontBold, color: WHITE });

  page.drawRectangle({ x: rightX, y: y - 22, width: colW, height: 22, color: NAVY });
  page.drawText('PAYMENT TERMS', { x: rightX + 10, y: y - 15, size: 10, font: fontBold, color: WHITE });

  y -= 22;

  const maxRows2 = Math.max(pickupRows.length, paymentRows.length);
  page.drawRectangle({ x: leftX, y: y - maxRows2 * rowHeight, width: colW, height: maxRows2 * rowHeight, color: LIGHT });
  page.drawRectangle({ x: rightX, y: y - maxRows2 * rowHeight, width: colW, height: maxRows2 * rowHeight, color: LIGHT });

  for (let i = 0; i < maxRows2; i++) {
    const rowY = y - (i + 1) * rowHeight + 8;
    if (pickupRows[i]) {
      page.drawText(pickupRows[i][0] + ':', { x: leftX + 10, y: rowY, size: 8, font: fontBold, color: GRAY });
      page.drawText(truncate(pickupRows[i][1], 30), { x: leftX + 70, y: rowY, size: 8, font, color: BLACK });
    }
    if (paymentRows[i]) {
      page.drawText(paymentRows[i][0] + ':', { x: rightX + 10, y: rowY, size: 8, font: fontBold, color: GRAY });
      page.drawText(truncate(paymentRows[i][1], 30), { x: rightX + 90, y: rowY, size: 8, font, color: BLACK });
    }
  }

  y -= maxRows2 * rowHeight + 30;

  // ===== SIGNATURES =====
  const sigY = y;
  page.drawText('SHIPPER SIGNATURE', { x: leftX + 10, y: sigY, size: 8, font: fontBold, color: GRAY });
  page.drawLine({ start: { x: leftX + 10, y: sigY - 40 }, end: { x: leftX + colW - 10, y: sigY - 40 }, thickness: 0.5, color: GRAY_LIGHT });

  page.drawText('CONSIGNEE SIGNATURE', { x: rightX + 10, y: sigY, size: 8, font: fontBold, color: GRAY });
  page.drawLine({ start: { x: rightX + 10, y: sigY - 40 }, end: { x: rightX + colW - 10, y: sigY - 40 }, thickness: 0.5, color: GRAY_LIGHT });

  // ===== FOOTER =====
  page.drawRectangle({ x: 0, y: 0, width, height: 60, color: NAVY });
  page.drawText('This is a computer-generated document. No signature required.', {
    x: 40, y: 40, size: 8, font, color: rgb(0.7, 0.8, 0.9),
  });
  page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT', {
    x: 40, y: 26, size: 8, font, color: rgb(0.6, 0.7, 0.8),
  });
  page.drawText('(c) sXL - Super Express Logistics Center | ' + s(shipment.tracking_number), {
    x: 40, y: 12, size: 8, font, color: rgb(0.5, 0.6, 0.7),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Invoice PDF (individual or monthly)
 */
export async function generateInvoicePDF(invoice, shipments) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height;

  // Header
  page.drawRectangle({ x: 0, y: y - 80, width, height: 80, color: ORANGE });
  page.drawRectangle({ x: 40, y: y - 68, width: 56, height: 56, color: WHITE });
  page.drawText('sXL', { x: 50, y: y - 46, size: 20, font: fontBold, color: ORANGE });
  page.drawText('SUPER EXPRESS', { x: 110, y: y - 32, size: 18, font: fontBold, color: WHITE });
  page.drawText('LOGISTICS CENTER', { x: 110, y: y - 50, size: 10, font, color: WHITE });
  page.drawText(invoice.type === 'monthly-summary' ? 'MONTHLY SUMMARY INVOICE' : 'INVOICE', {
    x: 380, y: y - 45, size: 10, font: fontBold, color: WHITE,
  });

  y -= 80;
  y -= 30;

  // Invoice info
  const info = [
    ['Invoice Number', s(invoice.invoice_number)],
    ['Issue Date', fmtDate(invoice.issue_date)],
    ['Due Date', fmtDate(invoice.due_date)],
    ['Status', s(invoice.status)],
    ['Shipper', s(invoice.shipper_name)],
  ];
  if (invoice.month) info.push(['Month', s(invoice.month)]);

  info.forEach(([label, value]) => {
    page.drawText(label + ':', { x: 40, y, size: 10, font: fontBold, color: NAVY });
    page.drawText(String(value || '-'), { x: 160, y, size: 10, font, color: BLACK });
    y -= 18;
  });

  y -= 20;

  // Shipments table header
  page.drawRectangle({ x: 40, y: y - 20, width: width - 80, height: 24, color: NAVY });
  page.drawText('Tracking #', { x: 45, y: y - 13, size: 9, font: fontBold, color: WHITE });
  page.drawText('Route', { x: 180, y: y - 13, size: 9, font: fontBold, color: WHITE });
  page.drawText('Weight', { x: 360, y: y - 13, size: 9, font: fontBold, color: WHITE });
  page.drawText('Amount', { x: 470, y: y - 13, size: 9, font: fontBold, color: WHITE });
  y -= 24;

  let grandTotal = 0;
  (shipments || []).forEach((sh, idx) => {
    if (y < 100) return;
    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    page.drawRectangle({ x: 40, y: y - 18, width: width - 80, height: 20, color: bg });

    const route = countryName(sh.origin) + ' -> ' + countryName(sh.destination);
    page.drawText(s(sh.tracking_number), { x: 45, y: y - 12, size: 8, font, color: BLACK });
    page.drawText(truncate(route, 30), { x: 180, y: y - 12, size: 8, font, color: BLACK });
    page.drawText(s(sh.total_weight) + ' kg', { x: 360, y: y - 12, size: 8, font, color: BLACK });

    const amt = parseFloat(sh.shipping_cost) || 0;
    grandTotal += amt;
    page.drawText(amt.toFixed(2), { x: 470, y: y - 12, size: 8, font, color: BLACK });

    y -= 20;
  });

  y -= 15;

  // Total
  const total = invoice.amount || grandTotal;
  page.drawRectangle({ x: 40, y: y - 45, width: width - 80, height: 45, color: ORANGE_LIGHT });
  page.drawText('TOTAL AMOUNT DUE', { x: 55, y: y - 20, size: 12, font: fontBold, color: NAVY });
  page.drawText(
    s(invoice.currency || 'USD') + ' ' + Number(total).toFixed(2),
    { x: 350, y: y - 30, size: 18, font: fontBold, color: ORANGE }
  );

  y -= 60;

  if (invoice.local_currency && invoice.local_amount) {
    page.drawText('Local currency: ' + s(invoice.local_currency) + ' ' + Number(invoice.local_amount).toFixed(2), {
      x: 40, y, size: 10, font, color: GRAY,
    });
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 60, color: NAVY });
  page.drawText('This is a computer-generated document.', { x: 40, y: 40, size: 8, font, color: rgb(0.7, 0.8, 0.9) });
  page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT', { x: 40, y: 26, size: 8, font, color: rgb(0.6, 0.7, 0.8) });
  page.drawText('(c) sXL - Super Express Logistics Center', { x: 40, y: 12, size: 8, font, color: rgb(0.5, 0.6, 0.7) });

  return await pdfDoc.save();
}

function truncate(str, maxLen) {
  const s = String(str || '');
  if (s.length <= maxLen) return s;
  return s.substring(0, maxLen - 3) + '...';
}
