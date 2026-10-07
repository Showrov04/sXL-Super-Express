import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ORANGE = rgb(1, 0.42, 0);
const ORANGE_LIGHT = rgb(1, 0.94, 0.85);
const ORANGE_SOFT = rgb(1, 0.97, 0.92);
const ORANGE_HIGHLIGHT = rgb(1, 0.88, 0.7);
const NAVY = rgb(0, 0.2, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const GRAY_LIGHT = rgb(0.6, 0.6, 0.6);
const LIGHT = rgb(0.97, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.1, 0.1, 0.1);

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

function sanitizeForPDF(text) {
  if (text === null || text === undefined) return '';
  let out = String(text);
  out = out.replace(/↔/g, '<->');
  out = out.replace(/→/g, '->');
  out = out.replace(/←/g, '<-');
  out = out.replace(/↑/g, '^');
  out = out.replace(/↓/g, 'v');
  out = out.replace(/[–—]/g, '-');
  out = out.replace(/['']/g, "'");
  out = out.replace(/[""]/g, '"');
  out = out.replace(/…/g, '...');
  out = out.replace(/•/g, '*');
  out = out.replace(/✓/g, 'v');
  out = out.replace(/✔/g, 'v');
  out = out.replace(/✕/g, 'x');
  out = out.replace(/×/g, 'x');
  out = out.replace(/[^\x00-\xFF]/g, '?');
  return out;
}

function countryName(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || code;
}

function expandCountryCodes(text) {
  if (!text) return '';
  let out = String(text);
  out = out.replace(/\b([A-Z]{2})\b/g, (match) => {
    if (COUNTRY_NAMES[match]) return COUNTRY_NAMES[match];
    return match;
  });
  return out;
}

function s(v) {
  if (v === null || v === undefined) return '';
  return sanitizeForPDF(String(v));
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

function truncate(str, maxLen) {
  const v = String(str || '');
  if (v.length <= maxLen) return v;
  return v.substring(0, maxLen - 3) + '...';
}

function wrapText(str, maxChars) {
  const text = sanitizeForPDF(String(str || '')).trim();
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      if (w.length > maxChars) {
        let rest = w;
        while (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        cur = rest;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [''];
}

function buildShipmentType(shipment) {
  const mode = String(shipment.ship_mode || '').toUpperCase();
  const load = String(shipment.sea_load_type || '').toUpperCase();
  const pType = String(shipment.parcel_type || '').trim();
  const pCustom = String(shipment.parcel_type_custom || '').trim();

  if (mode === 'SEA') {
    return load ? ('SEA - ' + load) : 'SEA';
  }
  if (mode === 'AIR') {
    let p = pType;
    if (p === 'Others' && pCustom) p = 'Others: ' + pCustom;
    return p ? ('AIR - ' + p) : 'AIR';
  }
  return mode || '-';
}

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

function drawSectionHeader(page, x, y, w, label, fontBold, color) {
  page.drawRectangle({ x, y: y - 22, width: w, height: 22, color });
  page.drawText(label, { x: x + 12, y: y - 15, size: 11, font: fontBold, color: WHITE });
}

function buildServicesTaken(shipment) {
  const services = [];
  if (shipment.pickup_service !== false) services.push('Pick-up service');
  if (String(shipment.custom_service || '').toLowerCase() === 'sxl') services.push('Customs clearance');
  if (String(shipment.delivery_service || '').toLowerCase() === 'sxl') services.push('Delivery service');
  return services;
}

export async function generateBookingPDF(shipment) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const LEFT = 40;
  const RIGHT_PAD = 40;
  const CONTENT_W = width - LEFT - RIGHT_PAD;

  const FOOTER_H = 45;
  const SIG_BLOCK_H = 55;
  const SIG_GAP_BELOW = 15;
  const SIG_GAP_ABOVE = 20;

  const CONTENT_FLOOR_Y = FOOTER_H + SIG_GAP_BELOW + SIG_BLOCK_H + SIG_GAP_ABOVE;

  let y = height;

  // HEADER — original naming
  page.drawRectangle({ x: 0, y: y - 75, width, height: 75, color: ORANGE });
  page.drawRectangle({ x: LEFT, y: y - 64, width: 52, height: 52, color: WHITE });
  page.drawText('sXL', { x: LEFT + 8, y: y - 44, size: 20, font: fontBold, color: ORANGE });
  page.drawText('SUPER EXPRESS', { x: LEFT + 65, y: y - 30, size: 18, font: fontBold, color: WHITE });
  page.drawText('LOGISTICS CENTER', { x: LEFT + 65, y: y - 48, size: 10, font, color: WHITE });
  page.drawText('BOOKING CONFIRMATION', { x: 375, y: y - 43, size: 9, font: fontBold, color: WHITE });
  y -= 75;

  // TRACKING NUMBER
  page.drawRectangle({ x: 0, y: y - 85, width, height: 85, color: NAVY });
  page.drawText('TRACKING NUMBER', { x: LEFT, y: y - 26, size: 9, font, color: rgb(0.7, 0.8, 0.9) });
  page.drawText(s(shipment.tracking_number), { x: LEFT, y: y - 58, size: 26, font: fontBold, color: WHITE });

  try {
    const trackUrl = 'https://sxl-logistics.com/track?tn=' + s(shipment.tracking_number);
    const qrBytes = await fetchQRCode(trackUrl);
    if (qrBytes) {
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawRectangle({ x: width - 105, y: y - 75, width: 75, height: 75, color: WHITE });
      page.drawImage(qrImage, { x: width - 103, y: y - 73, width: 71, height: 71 });
    }
  } catch (e) {
    console.error('[PDF QR] Failed:', e.message);
  }
  y -= 85;

  // STATUS + SERVICE
  y -= 12;
  page.drawRectangle({ x: LEFT, y: y - 30, width: CONTENT_W, height: 30, color: ORANGE_SOFT });
  const statusText = s(shipment.status || 'Booked').toUpperCase();
  page.drawText('STATUS', { x: LEFT + 12, y: y - 11, size: 9, font: fontBold, color: GRAY });
  page.drawText(statusText, { x: LEFT + 12, y: y - 24, size: 12, font: fontBold, color: ORANGE });
  page.drawText('SERVICE', { x: 200, y: y - 11, size: 9, font: fontBold, color: GRAY });
  page.drawText(s(shipment.service_type || '-'), { x: 200, y: y - 24, size: 11, font, color: BLACK });
  page.drawText('DATE', { x: 400, y: y - 11, size: 9, font: fontBold, color: GRAY });
  page.drawText(fmtDate(shipment.booked_at), { x: 400, y: y - 24, size: 10, font, color: BLACK });
  y -= 30;

  // SHIPPER + CONSIGNEE
  y -= 12;
  const colGap = 12;
  const colW = (CONTENT_W - colGap) / 2;
  const leftX = LEFT;
  const rightX = LEFT + colW + colGap;

  drawSectionHeader(page, leftX, y, colW, 'SHIPPER (FROM)', fontBold, NAVY);
  drawSectionHeader(page, rightX, y, colW, 'CONSIGNEE (TO)', fontBold, NAVY);
  y -= 22;

  const shipperAddrLines = [
    s(shipment.pickup_address),
    [s(shipment.pickup_city), s(shipment.pickup_state)].filter(Boolean).join(', '),
    countryName(shipment.origin),
  ].filter(Boolean);

  const consigneeAddrLines = [
    s(shipment.recipient_address),
    [s(shipment.recipient_city), s(shipment.recipient_state)].filter(Boolean).join(', '),
    countryName(shipment.destination),
  ].filter(Boolean);

  const shipperAddrFull = sanitizeForPDF(expandCountryCodes(shipperAddrLines.join(', ')));
  const consigneeAddrFull = sanitizeForPDF(expandCountryCodes(consigneeAddrLines.join(', ')));

  const shipperRows = [
    ['Name', s(shipment.sender_name)],
    ['Address', shipperAddrFull],
    ['Phone', s(shipment.sender_phone)],
    ['Email', s(shipment.sender_email)],
  ];

  const consigneeRows = [
    ['Name', s(shipment.recipient_name)],
    ['Address', consigneeAddrFull],
    ['Phone', s(shipment.recipient_phone)],
    ['Email', s(shipment.recipient_email)],
    ['BIN', s(shipment.recipient_bin) || '-'],
  ];

  const WRAP_CHARS = 28;
  const labelColW = 58;
  const lineH = 12;

  function renderSide(rows) {
    let curY = y;
    const rendered = [];
    for (const [label, value] of rows) {
      const lines = wrapText(value, WRAP_CHARS);
      rendered.push({ label, lines });
      curY -= lines.length * lineH + 3;
    }
    return { rendered, totalH: y - curY };
  }

  const shipperRender = renderSide(shipperRows);
  const consigneeRender = renderSide(consigneeRows);
  const blockH = Math.max(shipperRender.totalH, consigneeRender.totalH);

  page.drawRectangle({ x: leftX, y: y - blockH, width: colW, height: blockH, color: LIGHT });
  page.drawRectangle({ x: rightX, y: y - blockH, width: colW, height: blockH, color: LIGHT });

  function drawSide(rows, xStart) {
    let curY = y;
    for (const row of rows) {
      page.drawText(row.label + ':', { x: xStart + 8, y: curY - 9, size: 9, font: fontBold, color: GRAY });
      row.lines.forEach((line, li) => {
        page.drawText(line, { x: xStart + labelColW, y: curY - 9 - li * lineH, size: 9, font, color: BLACK });
      });
      curY -= row.lines.length * lineH + 3;
    }
  }
  drawSide(shipperRender.rendered, leftX);
  drawSide(consigneeRender.rendered, rightX);

  y -= blockH + 12;

  // SHIPMENT DETAILS
  drawSectionHeader(page, LEFT, y, CONTENT_W, 'SHIPMENT DETAILS', fontBold, NAVY);
  y -= 22;

  const shipmentTypeText = buildShipmentType(shipment);
  const isSpecialParcel = String(shipment.parcel_type || '').trim() === 'Special Parcel';
  const deliveryTimeline = isSpecialParcel && shipment.delivery_timeline
    ? String(shipment.delivery_timeline).trim()
    : null;

  const detailsRows = [
    ['Shipment Type', shipmentTypeText],
    ['Description', s(shipment.description)],
    ['Packaging Type', s(shipment.packaging_type) === 'Others' && shipment.packaging_type_custom ? 'Others: ' + s(shipment.packaging_type_custom) : s(shipment.packaging_type)],
  ];
  if (shipment.hs_code) detailsRows.push(['HS Code', s(shipment.hs_code)]);
  if (shipment.origin_country) detailsRows.push(['Country of Origin', countryName(shipment.origin_country)]);
  if (s(shipment.ship_mode).toUpperCase() === 'SEA' && shipment.total_cbm) {
    detailsRows.push(['Total CBM', s(shipment.total_cbm) + ' m3']);
  }
  if (shipment.dimensions) detailsRows.push(['Dimensions', s(shipment.dimensions) + ' cm']);
  detailsRows.push(['Shipper Ref', s(shipment.shipper_ref) || '-']);
  detailsRows.push(['Special Instructions', s(shipment.special_instruction) || '-']);

  const keyFigures = [
    ['Packages', s(shipment.packages)],
    ['Weight (kg)', s(shipment.total_weight)],
    ['Total Customs Value', s(shipment.total_value) + ' ' + s(shipment.value_currency || 'USD')],
  ];

  const servicesTaken = buildServicesTaken(shipment);

  const detLeftW = CONTENT_W * 0.62;
  const detRightW = CONTENT_W - detLeftW - 10;
  const detRightX = LEFT + detLeftW + 10;

  const detLineH = 12;
  let detHeight = 0;
  const detRendered = detailsRows.map(([label, value]) => {
    const lines = wrapText(value, Math.floor((detLeftW - 125) / 4.6));
    detHeight += Math.max(lines.length * detLineH, 15) + 4;
    return { label, lines };
  });

  const timelineBlockH = deliveryTimeline ? 32 : 0;
  const timelineSpacer = deliveryTimeline ? 6 : 0;

  const keyFigureRowH = 40;
  const servicesHeaderH = servicesTaken.length > 0 ? 22 : 0;
  const servicesRowH = 14;
  const servicesBlockH = servicesTaken.length > 0 ? (servicesHeaderH + servicesTaken.length * servicesRowH + 10) : 0;
  const keyFiguresH = keyFigures.length * keyFigureRowH + 10 + servicesBlockH;
  const detailsBlockH = Math.max(detHeight + 8 + timelineBlockH + timelineSpacer, keyFiguresH);

  page.drawRectangle({ x: LEFT, y: y - detailsBlockH, width: detLeftW, height: detailsBlockH, color: LIGHT });
  page.drawRectangle({ x: detRightX, y: y - detailsBlockH, width: detRightW, height: detailsBlockH, color: ORANGE_LIGHT });

  let curY = y - 5;
  for (const row of detRendered) {
    page.drawText(row.label + ':', { x: LEFT + 8, y: curY - 11, size: 9, font: fontBold, color: GRAY });
    row.lines.forEach((line, li) => {
      page.drawText(line, { x: LEFT + 125, y: curY - 11 - li * detLineH, size: 9, font, color: BLACK });
    });
    curY -= Math.max(row.lines.length * detLineH, 15) + 4;
  }

  // Highlighted Delivery Timeline row for Special Parcel
  if (deliveryTimeline) {
    curY -= timelineSpacer;
    const stripH = 26;
    const stripY = curY - stripH - 2;

    page.drawRectangle({
      x: LEFT + 4,
      y: stripY,
      width: detLeftW - 8,
      height: stripH,
      color: ORANGE_HIGHLIGHT,
    });

    page.drawRectangle({
      x: LEFT + 4,
      y: stripY,
      width: 4,
      height: stripH,
      color: ORANGE,
    });

    page.drawText('DELIVERY TIMELINE', {
      x: LEFT + 14,
      y: stripY + 15,
      size: 7.5,
      font: fontBold,
      color: NAVY,
    });

    const timelineLines = wrapText(deliveryTimeline, Math.floor((detLeftW - 20) / 5.2));
    timelineLines.slice(0, 1).forEach((line) => {
      page.drawText(line, {
        x: LEFT + 14,
        y: stripY + 5,
        size: 10,
        font: fontBold,
        color: BLACK,
      });
    });

    curY -= stripH + 4;
  }

  let kfY = y - 8;
  for (const [label, value] of keyFigures) {
    page.drawText(label.toUpperCase(), { x: detRightX + 12, y: kfY - 10, size: 8, font: fontBold, color: GRAY });
    page.drawText(value, { x: detRightX + 12, y: kfY - 27, size: 14, font: fontBold, color: NAVY });
    kfY -= keyFigureRowH;
  }

  if (servicesTaken.length > 0) {
    page.drawLine({
      start: { x: detRightX + 12, y: kfY - 2 },
      end: { x: detRightX + detRightW - 12, y: kfY - 2 },
      thickness: 0.5,
      color: rgb(0.85, 0.7, 0.4),
    });
    kfY -= 10;

    page.drawText('SERVICES TAKEN BY SXL', {
      x: detRightX + 12, y: kfY - 10, size: 8, font: fontBold, color: GRAY,
    });
    kfY -= 14;

    for (const svc of servicesTaken) {
      page.drawText('> ' + svc, {
        x: detRightX + 12, y: kfY - 8, size: 10, font: fontBold, color: NAVY,
      });
      kfY -= servicesRowH;
    }
  }

  y -= detailsBlockH + 12;

  // PICKUP + PAYMENT
  let pickupRows = [];
  const pickupService = shipment.pickup_service !== false;

  if (!pickupService) {
    pickupRows = [
      ['Service', 'Self-Delivery to Warehouse'],
      ['Note', 'Warehouse details emailed separately'],
      ['Ready Date', fmtDate(shipment.parcel_ready_date)],
      ['Ready Time', fmtTime(shipment.parcel_ready_time)],
    ];
  } else {
    pickupRows = [
      ['Pickup By', 'sXL Courier'],
      ['Address', shipperAddrFull],
      ['Country', countryName(shipment.pickup_country)],
      ['Ready Date', fmtDate(shipment.parcel_ready_date)],
      ['Ready Time', fmtTime(shipment.parcel_ready_time)],
    ];
  }

  const paymentRows = [
    ['Payment', s(shipment.payment_terms) || '-'],
    ['Method', s(shipment.payment_method) || '-'],
    ['Currency', s(shipment.currency) || 'USD'],
    ['Freight Bill', s(shipment.freight_bill_to) || '-'],
    ['Duty/Tax Bill', s(shipment.duty_tax_bill_to) || '-'],
  ];

  drawSectionHeader(page, leftX, y, colW, 'PICKUP DETAILS', fontBold, NAVY);
  drawSectionHeader(page, rightX, y, colW, 'PAYMENT TERMS', fontBold, NAVY);
  y -= 22;

  const PICKUP_WRAP = 24;
  let smallLineH = 12;

  function measureSmallSide(rows, lineHTest) {
    let curY = 0;
    for (const [, value] of rows) {
      const lines = wrapText(value, PICKUP_WRAP);
      curY += lines.length * lineHTest + 4;
    }
    return curY;
  }

  function pickLineHeight() {
    const candidates = [12, 11.5, 11, 10.5, 10, 9.5, 9];
    const available = y - CONTENT_FLOOR_Y;
    for (const lh of candidates) {
      const h1 = measureSmallSide(pickupRows, lh);
      const h2 = measureSmallSide(paymentRows, lh);
      const needed = Math.max(h1, h2);
      if (needed <= available) return lh;
    }
    return candidates[candidates.length - 1];
  }

  smallLineH = pickLineHeight();

  const pickupH = measureSmallSide(pickupRows, smallLineH);
  const paymentH = measureSmallSide(paymentRows, smallLineH);
  const block2H = Math.max(pickupH, paymentH);

  page.drawRectangle({ x: leftX, y: y - block2H, width: colW, height: block2H, color: LIGHT });
  page.drawRectangle({ x: rightX, y: y - block2H, width: colW, height: block2H, color: LIGHT });

  function drawSmallSide(rows, xStart, valueOffset) {
    let curY = y;
    for (const row of rows) {
      const lines = wrapText(row.value, PICKUP_WRAP);
      page.drawText(row.label + ':', { x: xStart + 8, y: curY - 9, size: 9, font: fontBold, color: GRAY });
      lines.forEach((line, li) => {
        page.drawText(line, { x: xStart + valueOffset, y: curY - 9 - li * smallLineH, size: 9, font, color: BLACK });
      });
      curY -= lines.length * smallLineH + 4;
    }
  }

  drawSmallSide(
    pickupRows.map(([label, value]) => ({ label, value })),
    leftX, 78
  );
  drawSmallSide(
    paymentRows.map(([label, value]) => ({ label, value })),
    rightX, 105
  );

  const blockBottomY = y - block2H;

  // SIGNATURES
  const sigLabelY = FOOTER_H + SIG_GAP_BELOW + SIG_BLOCK_H;
  let finalSigY = Math.min(blockBottomY - SIG_GAP_ABOVE, sigLabelY);
  if (finalSigY < FOOTER_H + 22) finalSigY = FOOTER_H + 22;

  page.drawText('SHIPPER SIGNATURE', { x: leftX + 8, y: finalSigY, size: 9, font: fontBold, color: GRAY });
  page.drawLine({ start: { x: leftX + 8, y: finalSigY - 32 }, end: { x: leftX + colW - 8, y: finalSigY - 32 }, thickness: 0.5, color: GRAY_LIGHT });

  page.drawText('CONSIGNEE SIGNATURE', { x: rightX + 8, y: finalSigY, size: 9, font: fontBold, color: GRAY });
  page.drawLine({ start: { x: rightX + 8, y: finalSigY - 32 }, end: { x: rightX + colW - 8, y: finalSigY - 32 }, thickness: 0.5, color: GRAY_LIGHT });

  // FOOTER
  page.drawRectangle({ x: 0, y: 0, width, height: FOOTER_H, color: NAVY });
  page.drawText('This is a computer-generated document. No signature required.', {
    x: LEFT, y: 28, size: 8, font, color: rgb(0.7, 0.8, 0.9),
  });
  page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT | (c) sXL - Super Express Logistics Center | ' + s(shipment.tracking_number), {
    x: LEFT, y: 15, size: 7, font, color: rgb(0.6, 0.7, 0.8),
  });

  return await pdfDoc.save();
}

export async function generateInvoicePDF(invoice, shipments) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height;

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

  page.drawRectangle({ x: 0, y: 0, width, height: 60, color: NAVY });
  page.drawText('This is a computer-generated document.', { x: 40, y: 40, size: 8, font, color: rgb(0.7, 0.8, 0.9) });
  page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT', { x: 40, y: 26, size: 8, font, color: rgb(0.6, 0.7, 0.8) });
  page.drawText('(c) sXL - Super Express Logistics Center', { x: 40, y: 12, size: 8, font, color: rgb(0.5, 0.6, 0.7) });

  return await pdfDoc.save();
}
