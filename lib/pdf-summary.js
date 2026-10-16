import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/* ============================================================
 *  Monthly Summary Report — PDF only
 *  Read-only document listing existing invoices for a shipper
 *  during a specific month. Does NOT create/modify any invoice.
 *
 *  Columns (8):
 *    Shipper Ref · Shipment Date · Tracking # · Mode
 *    Route · Recipient · Actual Weight · Amount
 * ============================================================ */

const ORANGE = rgb(1, 0.42, 0);
const ORANGE_LIGHT = rgb(1, 0.94, 0.85);
const ORANGE_SOFT = rgb(1, 0.97, 0.92);
const NAVY = rgb(0, 0.2, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const GRAY_LIGHT = rgb(0.6, 0.6, 0.6);
const LIGHT = rgb(0.97, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.1, 0.1, 0.1);

const LEGAL_STRIP_H = 22;
const FOOTER_H = 90;

const OFFICE_ADDRESS_LINE = 'Unit 704B, 7th Floor  \u00B7  Well Fung Industrial Centre  \u00B7  68 Ta Chuen Ping Street, Kwai Chung  \u00B7  Hong Kong';

const COMPANY_CONTACT_DEFAULTS = {
  company_phone: '+852 60480171',
  company_email: 'admin@sxl-logistics.com',
  company_website: 'www.sxl-logistics.com',
  company_wechat: 'sXL-Logistics',
  company_whatsapp: '+852 60480171',
};

function sanitize(text) {
  if (text === null || text === undefined) return '';
  let out = String(text);
  out = out.replace(/\u2194/g, '<->');
  out = out.replace(/\u2192/g, '->');
  out = out.replace(/\u2190/g, '<-');
  out = out.replace(/[\u2013\u2014]/g, '-');
  out = out.replace(/['']/g, "'");
  out = out.replace(/[""]/g, '"');
  out = out.replace(/\u2026/g, '...');
  out = out.replace(/\u2022/g, '*');
  out = out.replace(/\u00D7/g, 'x');
  out = out.replace(/[^\x00-\xFF]/g, '?');
  return out;
}

function fmtDateShort(d) {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d).slice(0, 10);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(date.getDate()).padStart(2, '0') + ' ' + months[date.getMonth()] + ' ' + String(date.getFullYear()).slice(2);
  } catch (e) { return '-'; }
}

function fmtDateTimeGMT(d) {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const y = date.getUTCFullYear();
    const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dy = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return y + '-' + mo + '-' + dy + ' ' + hh + ':' + mm;
  } catch (e) { return '-'; }
}

function normalizeContact(contact) {
  const c = contact && typeof contact === 'object' ? contact : {};
  const out = {};
  Object.keys(COMPANY_CONTACT_DEFAULTS).forEach((k) => {
    const v = c[k];
    out[k] = (v === null || v === undefined || v === '') ? COMPANY_CONTACT_DEFAULTS[k] : String(v).trim();
  });
  return out;
}

function drawFittedCell(page, opts) {
  const { text, x, y, maxWidth, font, startSize = 8, minSize = 6, color = BLACK, align = 'left' } = opts;
  const raw = String(text || '');
  if (!raw) return 0;

  let size = startSize;
  let shown = raw;

  while (size >= minSize) {
    let w = 0;
    try { w = font.widthOfTextAtSize(raw, size); } catch (e) { w = 0; }
    if (w <= maxWidth) { shown = raw; break; }
    size -= 0.5;
  }

  if (size < minSize) {
    size = minSize;
    let cut = raw;
    while (cut.length > 1) {
      cut = cut.slice(0, -1);
      const test = cut + '\u2026';
      let w = 0;
      try { w = font.widthOfTextAtSize(test, size); } catch (e) { w = 0; }
      if (w <= maxWidth) { shown = test; break; }
    }
    if (shown === raw) shown = '\u2026';
  }

  let drawnW = 0;
  try { drawnW = font.widthOfTextAtSize(shown, size); } catch (e) { drawnW = 0; }
  const drawX = align === 'right' ? (x + maxWidth - drawnW) : x;
  try { page.drawText(shown, { x: drawX, y, size, font, color }); } catch (e) { /* skip */ }
  return drawnW;
}

function drawLegalStrip(page, opts) {
  const { font, pageWidth, footerHeight, lines } = opts;
  const LEFT = 40;
  const stripY = footerHeight;

  page.drawRectangle({ x: 0, y: stripY, width: pageWidth, height: LEGAL_STRIP_H, color: rgb(0.96, 0.97, 0.98) });
  page.drawLine({
    start: { x: 0, y: stripY + LEGAL_STRIP_H },
    end: { x: pageWidth, y: stripY + LEGAL_STRIP_H },
    thickness: 0.4,
    color: rgb(0.85, 0.87, 0.9),
  });

  const usable = lines.filter((l) => l && l.text);
  const lineGap = 9;
  const totalH = usable.length > 0 ? (usable.length - 1) * lineGap : 0;
  const firstBaseline = stripY + (LEGAL_STRIP_H + totalH) / 2 - 3;

  usable.forEach((line, idx) => {
    const baseline = firstBaseline - idx * lineGap;
    try {
      page.drawText(sanitize(line.text), { x: LEFT, y: baseline, size: line.size || 7, font, color: GRAY });
    } catch (e) { /* skip */ }
  });
}

function drawContactFooter(page, opts) {
  const { contact, font, fontBold, pageWidth, footerHeight } = opts;
  const LEFT = 40;
  const RIGHT_PAD = 40;
  const CONTENT_W = pageWidth - LEFT - RIGHT_PAD;

  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: footerHeight, color: NAVY });
  page.drawRectangle({ x: 0, y: footerHeight - 2, width: pageWidth, height: 2, color: ORANGE });

  const labelColor = rgb(0.7, 0.8, 0.9);
  const valueColor = rgb(0.98, 0.99, 1);

  const rows = [];
  if (contact.company_phone) rows.push({ label: 'Phone', value: contact.company_phone });
  if (contact.company_whatsapp) rows.push({ label: 'WhatsApp', value: contact.company_whatsapp });
  if (contact.company_email) rows.push({ label: 'Email', value: contact.company_email });
  if (contact.company_website) rows.push({ label: 'Web', value: contact.company_website });

  const colW = CONTENT_W / 2;
  const leftRows = rows.filter((_, i) => i % 2 === 0);
  const rightRows = rows.filter((_, i) => i % 2 === 1);
  const maxRows = Math.max(leftRows.length, rightRows.length);

  const rowH = 18;
  const totalSpan = (maxRows - 1) * rowH;
  const firstY = (footerHeight + totalSpan) / 2 - 5;

  const drawRow = (x, y, row) => {
    try {
      page.drawText(sanitize(row.label + ':'), { x, y, size: 8, font: fontBold, color: labelColor });
      const lw = fontBold.widthOfTextAtSize(row.label + ':', 8);
      page.drawText(sanitize(row.value), { x: x + lw + 6, y, size: 8.5, font, color: valueColor });
    } catch (e) { /* skip */ }
  };

  for (let i = 0; i < maxRows; i++) {
    const y = firstY - i * rowH;
    if (leftRows[i]) drawRow(LEFT, y, leftRows[i]);
    if (rightRows[i]) drawRow(LEFT + colW, y, rightRows[i]);
  }
}

/* ============================================================
 *  Main export
 *  summary = {
 *    shipperName, month, monthLabel,
 *    generatedAt,
 *    currency,
 *    total,
 *    invoiceCount,
 *    rows: [{
 *      shipperRef, shipmentDate, trackingNumber, mode, route,
 *      recipient, actualWeight, actualCbm, amount, currency,
 *      invoiceNumber, invoiceType
 *    }]
 *  }
 * ============================================================ */
export async function generateMonthlySummaryPDF(summary, contact) {
  const c = normalizeContact(contact);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4: 842 x 595
  const PAGE_W = 842;
  const PAGE_H = 595;
  const MARGIN = 30;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const HEADER_H = 70;
  const INFO_GAP_TOP = 22;
  const INFO_ROW_H = 16;
  const INFO_GAP_BELOW = 14;
  const TABLE_HEADER_H = 22;
  const ROW_H = 18;

  const FOOTER_TOTAL_H = FOOTER_H + LEGAL_STRIP_H;
  const BOTTOM_RESERVE = FOOTER_TOTAL_H + 60;
  const TOTAL_BAND_TOP = FOOTER_TOTAL_H + 55;
  const TOTAL_BAND_H = 40;

  // Column layout (landscape, 8 cols, total = 782)
  const COL = {
    shipperRef:     { x: MARGIN +  4,  w:  70 },
    shipmentDate:   { x: MARGIN + 74,  w:  65 },
    tracking:       { x: MARGIN + 139, w: 105 },
    mode:           { x: MARGIN + 244, w:  75 },
    route:          { x: MARGIN + 319, w: 140 },
    recipient:      { x: MARGIN + 459, w: 110 },
    actualWeight:   { x: MARGIN + 569, w: 115 },
    amount:         { x: MARGIN + 684, w:  94 },
  };
  const BODY_SIZE = 8;
  const BODY_MIN = 6;
  const HEAD_SIZE = 8;

  const rows = Array.isArray(summary.rows) ? summary.rows : [];

  // ---------- Page 1 ----------
  const page1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  // Header
  page1.drawRectangle({ x: 0, y: y - HEADER_H, width: PAGE_W, height: HEADER_H, color: ORANGE });
  page1.drawRectangle({ x: MARGIN, y: y - HEADER_H + 10, width: 50, height: 50, color: WHITE });
  page1.drawText('sXL', { x: MARGIN + 10, y: y - HEADER_H + 30, size: 18, font: fontBold, color: ORANGE });
  page1.drawText('SUPER EXPRESS', { x: MARGIN + 70, y: y - 26, size: 15, font: fontBold, color: WHITE });
  page1.drawText('LOGISTICS CENTER', { x: MARGIN + 70, y: y - 42, size: 8, font, color: WHITE });
  try {
    page1.drawText(OFFICE_ADDRESS_LINE, { x: MARGIN + 70, y: y - 56, size: 6.5, font, color: WHITE });
  } catch (e) { /* skip */ }

  page1.drawText('MONTHLY SUMMARY REPORT', { x: PAGE_W - MARGIN - 200, y: y - 40, size: 12, font: fontBold, color: WHITE });

  y -= HEADER_H;

  // Info block
  y -= INFO_GAP_TOP;
  const infoLeft = [
    ['Shipper', summary.shipperName || '-'],
    ['Month', summary.monthLabel || summary.month || '-'],
  ];
  const infoRight = [
    ['Generated', fmtDateTimeGMT(summary.generatedAt) + ' GMT'],
    ['Invoices', String(summary.invoiceCount || rows.length) + ' invoice' + ((summary.invoiceCount || rows.length) !== 1 ? 's' : '')],
  ];

  const infoColW = CONTENT_W / 2;
  infoLeft.forEach(([label, value], i) => {
    const yy = y - i * INFO_ROW_H;
    page1.drawText(label + ':', { x: MARGIN, y: yy, size: 9, font: fontBold, color: NAVY });
    page1.drawText(sanitize(value), { x: MARGIN + 70, y: yy, size: 9, font, color: BLACK });
  });
  infoRight.forEach(([label, value], i) => {
    const yy = y - i * INFO_ROW_H;
    const rx = MARGIN + infoColW;
    page1.drawText(label + ':', { x: rx, y: yy, size: 9, font: fontBold, color: NAVY });
    page1.drawText(sanitize(value), { x: rx + 70, y: yy, size: 9, font, color: BLACK });
  });

  y -= Math.max(infoLeft.length, infoRight.length) * INFO_ROW_H;
  y -= INFO_GAP_BELOW;

  // Note strip
  const noteH = 22;
  page1.drawRectangle({ x: MARGIN, y: y - noteH, width: CONTENT_W, height: noteH, color: ORANGE_SOFT });
  page1.drawRectangle({ x: MARGIN, y: y - noteH, width: 4, height: noteH, color: ORANGE });
  page1.drawText(
    'This is a summary of invoices already issued. NO NEW CHARGE. Refer to the referenced invoices for payment.',
    { x: MARGIN + 12, y: y - 14, size: 8, font: fontBold, color: NAVY }
  );
  y -= noteH + 12;

  // Table drawing helpers
  function drawTableHeader(targetPage, headerY) {
    targetPage.drawRectangle({
      x: MARGIN,
      y: headerY - TABLE_HEADER_H + 6,
      width: CONTENT_W,
      height: TABLE_HEADER_H,
      color: NAVY,
    });

    const textY = headerY - 8;
    const headers = [
      ['shipperRef',   'Shipper Ref'],
      ['shipmentDate', 'Ship Date'],
      ['tracking',     'Tracking #'],
      ['mode',         'Mode'],
      ['route',        'Route'],
      ['recipient',    'Recipient'],
      ['actualWeight', 'Actual Wt'],
      ['amount',       'Amount'],
    ];

    headers.forEach(([key, label], idx) => {
      const col = COL[key];
      const align = key === 'amount' ? 'right' : 'left';
      drawFittedCell(targetPage, {
        text: label,
        x: col.x,
        y: textY,
        maxWidth: col.w - 4,
        font: fontBold,
        startSize: HEAD_SIZE,
        minSize: 6,
        color: WHITE,
        align,
      });
    });
  }

  function drawRow(targetPage, rowY, row, idx) {
    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    targetPage.drawRectangle({
      x: MARGIN,
      y: rowY - ROW_H + 4,
      width: CONTENT_W,
      height: ROW_H,
      color: bg,
    });

    const textY = rowY - 8;

    // Actual weight: kg or kg + CBM for SEA
    let wtStr = '';
    const w = parseFloat(row.actualWeight) || 0;
    const cbm = parseFloat(row.actualCbm) || 0;
    if (w > 0 && cbm > 0) wtStr = w.toFixed(2) + ' kg / ' + cbm.toFixed(2) + ' CBM';
    else if (w > 0) wtStr = w.toFixed(2) + ' kg';
    else if (cbm > 0) wtStr = cbm.toFixed(2) + ' CBM';
    else wtStr = 'TBA';

    const vals = {
      shipperRef:     row.shipperRef || '-',
      shipmentDate:   fmtDateShort(row.shipmentDate),
      tracking:       row.trackingNumber || '-',
      mode:           row.mode || '-',
      route:          row.route || '-',
      recipient:      row.recipient || '-',
      actualWeight:   wtStr,
      amount:         (Number(row.amount) || 0).toFixed(2),
    };

    Object.keys(vals).forEach((key) => {
      const col = COL[key];
      const align = key === 'amount' ? 'right' : 'left';
      drawFittedCell(targetPage, {
        text: vals[key],
        x: col.x,
        y: textY,
        maxWidth: col.w - 4,
        font,
        startSize: BODY_SIZE,
        minSize: BODY_MIN,
        color: BLACK,
        align,
      });
    });
  }

  // Header + rows with pagination
  let currentPage = page1;
  let rowIdx = 0;

  drawTableHeader(page1, y);
  y -= TABLE_HEADER_H - 6;

  for (const row of rows) {
    if (y - ROW_H < BOTTOM_RESERVE) {
      currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      let ny = PAGE_H;

      currentPage.drawRectangle({ x: 0, y: ny - 40, width: PAGE_W, height: 40, color: ORANGE });
      currentPage.drawText('SUPER EXPRESS', { x: MARGIN, y: ny - 16, size: 11, font: fontBold, color: WHITE });
      currentPage.drawText('MONTHLY SUMMARY REPORT (continued)', { x: MARGIN, y: ny - 30, size: 8, font, color: WHITE });
      const summaryLabel = 'Shipper: ' + (summary.shipperName || '-') + ' · ' + (summary.monthLabel || summary.month || '-');
      try {
        const lw = fontBold.widthOfTextAtSize(summaryLabel, 9);
        currentPage.drawText(sanitize(summaryLabel), { x: PAGE_W - MARGIN - lw, y: ny - 18, size: 9, font: fontBold, color: WHITE });
      } catch (e) { /* skip */ }
      ny -= 40;
      ny -= 8;

      drawTableHeader(currentPage, ny);
      ny -= TABLE_HEADER_H - 6;
      y = ny;
    }
    drawRow(currentPage, y, row, rowIdx);
    y -= ROW_H;
    rowIdx++;
  }

  // Total band
  currentPage.drawRectangle({
    x: MARGIN,
    y: TOTAL_BAND_TOP - TOTAL_BAND_H,
    width: CONTENT_W,
    height: TOTAL_BAND_H,
    color: ORANGE_LIGHT,
  });
  currentPage.drawText('TOTAL AMOUNT DUE', { x: MARGIN + 14, y: TOTAL_BAND_TOP - 20, size: 12, font: fontBold, color: NAVY });
  const currency = (summary.currency || 'USD').toUpperCase();
  const totalTxt = currency + ' ' + (Number(summary.total) || 0).toFixed(2);
  const totalW = fontBold.widthOfTextAtSize(totalTxt, 16);
  currentPage.drawText(totalTxt, { x: PAGE_W - MARGIN - 14 - totalW, y: TOTAL_BAND_TOP - 22, size: 16, font: fontBold, color: ORANGE });

  currentPage.drawText(
    'Based on ' + (summary.invoiceCount || rows.length) + ' invoice' + ((summary.invoiceCount || rows.length) !== 1 ? 's' : '') + ' already issued. No new charge added.',
    { x: MARGIN + 14, y: TOTAL_BAND_TOP - 34, size: 7.5, font, color: GRAY }
  );

  // Contact footer + legal strip on every page
  const allPages = pdfDoc.getPages();
  allPages.forEach((p) => {
    drawContactFooter(p, {
      contact: c,
      font,
      fontBold,
      pageWidth: PAGE_W,
      footerHeight: FOOTER_H,
    });
    drawLegalStrip(p, {
      font,
      pageWidth: PAGE_W,
      footerHeight: FOOTER_H,
      lines: [
        { text: 'This is a read-only summary of invoices already issued. No new charge.', size: 7 },
        { text: 'Generated on ' + fmtDateTimeGMT(summary.generatedAt) + ' GMT | (c) sXL - Super Express Logistics Center', size: 6.5 },
      ],
    });
  });

  return await pdfDoc.save();
}
