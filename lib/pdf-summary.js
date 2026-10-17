import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ORANGE = rgb(1, 0.42, 0);
const ORANGE_LIGHT = rgb(1, 0.94, 0.85);
const ORANGE_SOFT = rgb(1, 0.97, 0.92);
const NAVY = rgb(0, 0.2, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT = rgb(0.97, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.1, 0.1, 0.1);

const BADGE_PHONE    = rgb(1, 0.42, 0);
const BADGE_WHATSAPP = rgb(0.145, 0.827, 0.4);
const BADGE_EMAIL    = rgb(0, 0.4, 0.8);
const BADGE_WEB      = rgb(0, 0.66, 0.42);
const BADGE_WECHAT   = rgb(0.027, 0.757, 0.376);

const BRAND_ICON_URLS = {
  phone:    'https://img.icons8.com/ios-filled/50/ffffff/phone.png',
  whatsapp: 'https://img.icons8.com/ios-filled/50/ffffff/whatsapp--v1.png',
  email:    'https://img.icons8.com/ios-filled/50/ffffff/new-post.png',
  web:      'https://img.icons8.com/ios-filled/50/ffffff/domain.png',
};

const LEGAL_STRIP_H = 22;
const FOOTER_H = 90;

const OFFICE_ADDRESS_LINE = 'Unit 704B, 7th Floor  \u00B7  Well Fung Industrial Centre  \u00B7  68 Ta Chuen Ping Street, Kwai Chung  \u00B7  Hong Kong';

const COMPANY_CONTACT_DEFAULTS = {
  company_phone: '+852 60480171',
  company_email: 'admin@sxl-logistics.com',
  company_website: 'www.sxl-logistics.com',
  company_wechat: 'sXL-Logistics',
  company_whatsapp: '+852 60480171',
  company_wechat_qr_url: '',
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

async function fetchQRImageBytes(qrUrl) {
  if (!qrUrl || !/^https?:\/\//i.test(qrUrl)) return null;
  try {
    const res = await fetch(qrUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    return { bytes: new Uint8Array(arrayBuffer), contentType: ct };
  } catch (e) {
    return null;
  }
}

async function embedQRImage(pdfDoc, qrData) {
  if (!qrData || !qrData.bytes) return null;
  const ct = qrData.contentType || '';
  try {
    if (ct.includes('png')) return await pdfDoc.embedPng(qrData.bytes);
    if (ct.includes('jpeg') || ct.includes('jpg')) return await pdfDoc.embedJpg(qrData.bytes);
    try { return await pdfDoc.embedPng(qrData.bytes); }
    catch (e) { return await pdfDoc.embedJpg(qrData.bytes); }
  } catch (e) { return null; }
}

async function loadBrandIcons(pdfDoc) {
  const out = {};
  const keys = Object.keys(BRAND_ICON_URLS);

  await Promise.all(keys.map(async (key) => {
    try {
      const res = await fetch(BRAND_ICON_URLS[key], { cache: 'no-store' });
      if (!res.ok) return;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const img = await pdfDoc.embedPng(bytes);
      out[key] = img;
    } catch (e) { /* skip */ }
  }));

  return out;
}

// Draw rounded logo box with soft shadow simulating blur
function drawLogoBox(page, x, y, color) {
  const path = 'M 12 0 L 33 0 Q 45 0 45 12 L 45 33 Q 45 45 33 45 L 12 45 Q 0 45 0 33 L 0 12 Q 0 0 12 0 Z';
  
  // Soft Shadow Simulation
  page.drawSvgPath(path, { x: x + 2, y: y - 5, color: ORANGE, opacity: 0.05 });
  page.drawSvgPath(path, { x: x + 1.5, y: y - 4, color: ORANGE, opacity: 0.1 });
  page.drawSvgPath(path, { x: x + 1, y: y - 3, color: ORANGE, opacity: 0.15 });
  page.drawSvgPath(path, { x: x + 0.5, y: y - 1.5, color: ORANGE, opacity: 0.2 });

  // Main Box
  page.drawSvgPath(path, {
    x: x,
    y: y,
    color: color,
  });
}

function drawWeChatGlyph(page, cx, cy, badgeColor) {
  const G = 12;
  const bigCX = cx - G * 0.16, bigCY = cy + G * 0.06, bigRX = G * 0.32, bigRY = G * 0.26;
  page.drawEllipse({ x: bigCX, y: bigCY, xScale: bigRX, yScale: bigRY, color: WHITE });
  page.drawSvgPath(`M 0 0 L ${-bigRX * 0.85} ${-bigRY * 0.15} L ${-bigRX * 0.30} ${-bigRY * 0.85} Z`, { x: bigCX + bigRX * 0.20, y: bigCY - bigRY * 0.70, color: WHITE, borderWidth: 0 });
  page.drawCircle({ x: bigCX - bigRX * 0.40, y: bigCY + bigRY * 0.15, size: bigRX * 0.14, color: badgeColor });
  page.drawCircle({ x: bigCX + bigRX * 0.40, y: bigCY + bigRY * 0.15, size: bigRX * 0.14, color: badgeColor });

  const smCX = cx + G * 0.24, smCY = cy - G * 0.10, smRX = G * 0.24, smRY = G * 0.19;
  page.drawEllipse({ x: smCX, y: smCY, xScale: smRX, yScale: smRY, color: WHITE });
  page.drawSvgPath(`M 0 0 L ${smRX * 0.85} ${-smRY * 0.15} L ${smRX * 0.30} ${-smRY * 0.85} Z`, { x: smCX - smRX * 0.20, y: smCY - smRY * 0.70, color: WHITE, borderWidth: 0 });
  page.drawCircle({ x: smCX - smRX * 0.40, y: smCY + smRY * 0.15, size: smRX * 0.14, color: badgeColor });
  page.drawCircle({ x: smCX + smRX * 0.40, y: smCY + smRY * 0.15, size: smRX * 0.14, color: badgeColor });
}

function drawContactRow(page, x, y, maxW, row, font, fontBold, labelSize, valueSize, brandIcon) {
  const labelColor = rgb(0.7, 0.8, 0.9);
  const valueColor = rgb(0.98, 0.99, 1);

  const BADGE_D = 14;
  const BADGE_GAP = 8;
  const BADGE_CY = y + 5;
  const cx = x + BADGE_D / 2;

  try {
    page.drawCircle({ x: cx, y: BADGE_CY, size: BADGE_D / 2, color: row.bg });

    if (row.key === 'wechat') {
      drawWeChatGlyph(page, cx, BADGE_CY, row.bg);
    } else if (brandIcon) {
      const GLYPH = BADGE_D * 0.62;
      page.drawImage(brandIcon, { x: cx - GLYPH / 2, y: BADGE_CY - GLYPH / 2, width: GLYPH, height: GLYPH });
    } else if (row.badge) {
      const isMulti = String(row.badge).length > 1;
      const badgeFontSize = isMulti ? 5.8 : 8;
      const bw = fontBold.widthOfTextAtSize(row.badge, badgeFontSize);
      page.drawText(row.badge, { x: cx - bw / 2, y: BADGE_CY - badgeFontSize * 0.35, size: badgeFontSize, font: fontBold, color: WHITE });
    }
  } catch (e) { /* skip */ }

  const badgeEndX = x + BADGE_D + BADGE_GAP;
  const labelTxt = sanitize(row.label + ':');
  const valueTxt = sanitize(row.value);

  try {
    page.drawText(labelTxt, { x: badgeEndX, y, size: labelSize, font: fontBold, color: labelColor });
    const labelW = fontBold.widthOfTextAtSize(labelTxt, labelSize);

    let shown = valueTxt;
    let vw = font.widthOfTextAtSize(shown, valueSize);
    const avail = maxW - (badgeEndX - x) - labelW - 6;
    if (vw > avail) {
      while (shown.length > 1) {
        shown = shown.slice(0, -1);
        const test = shown + '...';
        vw = font.widthOfTextAtSize(test, valueSize);
        if (vw <= avail) { shown = test; break; }
      }
    }
    page.drawText(shown, { x: badgeEndX + labelW + 6, y, size: valueSize, font, color: valueColor });
  } catch (e) { /* skip */ }
}

function drawContactFooter(page, opts) {
  const { contact, font, fontBold, pageWidth, footerHeight, includeQR, qrImage, brandIcons } = opts;
  const LEFT = 40;
  const RIGHT_PAD = 40;
  const CONTENT_W = pageWidth - LEFT - RIGHT_PAD;

  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: footerHeight, color: NAVY });
  page.drawRectangle({ x: 0, y: footerHeight - 2, width: pageWidth, height: 2, color: ORANGE });

  const labelColor = rgb(0.7, 0.8, 0.9);
  const QR_SIZE = 64, QR_PAD = 10, QR_BOX_SIZE = QR_SIZE + QR_PAD * 2;
  const qrBoxX = pageWidth - RIGHT_PAD - QR_BOX_SIZE;
  const qrBoxY = (footerHeight - QR_BOX_SIZE) / 2;

  let textColW = CONTENT_W;
  if (includeQR && qrImage) {
    textColW = CONTENT_W - QR_BOX_SIZE - 20;
    page.drawRectangle({ x: qrBoxX, y: qrBoxY, width: QR_BOX_SIZE, height: QR_BOX_SIZE, color: WHITE });
    page.drawImage(qrImage, { x: qrBoxX + QR_PAD, y: qrBoxY + QR_PAD, width: QR_SIZE, height: QR_SIZE });
    const labelTxt = 'Scan to add WeChat';
    try {
      const lw = font.widthOfTextAtSize(labelTxt, 6.5);
      page.drawText(labelTxt, { x: qrBoxX + (QR_BOX_SIZE - lw) / 2, y: qrBoxY - 10, size: 6.5, font, color: labelColor });
    } catch (e) { /* skip */ }
  }

  const labelSize = 8, valueSize = 8.5;
  const rows = [];
  if (contact.company_phone) rows.push({ key: 'phone', label: 'Phone', value: contact.company_phone, badge: 'P', bg: BADGE_PHONE });
  if (contact.company_whatsapp) rows.push({ key: 'whatsapp', label: 'WhatsApp', value: contact.company_whatsapp, badge: 'WA', bg: BADGE_WHATSAPP });
  if (contact.company_email) rows.push({ key: 'email', label: 'Email', value: contact.company_email, badge: 'E', bg: BADGE_EMAIL });
  if (contact.company_website) rows.push({ key: 'web', label: 'Web', value: contact.company_website, badge: 'W', bg: BADGE_WEB });
  if (contact.company_wechat && !(includeQR && qrImage)) rows.push({ key: 'wechat', label: 'WeChat', value: contact.company_wechat, badge: 'WC', bg: BADGE_WECHAT });

  const twoCol = rows.length >= 3;
  const colW = twoCol ? (textColW / 2) : textColW;
  const colX = [LEFT, LEFT + colW];

  const leftRows = twoCol ? rows.filter((_, i) => i % 2 === 0) : rows;
  const rightRows = twoCol ? rows.filter((_, i) => i % 2 === 1) : [];
  const maxRows = Math.max(leftRows.length, rightRows.length);

  const rowH = 18;
  const totalSpan = (maxRows - 1) * rowH;
  const firstBaseline = (footerHeight + totalSpan) / 2 - 3;

  const icons = brandIcons || {};

  if (twoCol) {
    for (let i = 0; i < maxRows; i++) {
      const y = firstBaseline - i * rowH;
      if (leftRows[i]) drawContactRow(page, colX[0], y, colW - 8, leftRows[i], font, fontBold, labelSize, valueSize, icons[leftRows[i].key]);
      if (rightRows[i]) drawContactRow(page, colX[1], y, colW - 8, rightRows[i], font, fontBold, labelSize, valueSize, icons[rightRows[i].key]);
    }
  } else {
    leftRows.forEach((row, i) => {
      const y = firstBaseline - i * rowH;
      drawContactRow(page, LEFT, y, textColW, row, font, fontBold, labelSize, valueSize, icons[row.key]);
    });
  }
}

function drawLegalStrip(page, opts) {
  const { font, pageWidth, footerHeight, lines } = opts;
  const LEFT = 40;
  const stripY = footerHeight;

  page.drawRectangle({ x: 0, y: stripY, width: pageWidth, height: LEGAL_STRIP_H, color: rgb(0.96, 0.97, 0.98) });
  page.drawLine({ start: { x: 0, y: stripY + LEGAL_STRIP_H }, end: { x: pageWidth, y: stripY + LEGAL_STRIP_H }, thickness: 0.4, color: rgb(0.85, 0.87, 0.9) });

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

function drawFittedCell(page, opts) {
  const { text, x, y, maxWidth, font, startSize = 8, minSize = 6, color = BLACK, align = 'left', maxLines = 1 } = opts;
  let raw = String(text || '');
  if (!raw || raw === 'null' || raw === 'undefined') raw = '-';

  let size = startSize;
  let lines = [];
  let w = 0;
  try { w = font.widthOfTextAtSize(raw, size); } catch (e) { w = 0; }

  if (w <= maxWidth) {
    lines.push(raw);
  } else if (maxLines === 1) {
    while (size >= minSize) {
      try { w = font.widthOfTextAtSize(raw, size); } catch (e) { w = 0; }
      if (w <= maxWidth) { lines.push(raw); break; }
      size -= 0.5;
    }
    if (lines.length === 0) {
      size = minSize;
      let cut = raw;
      while (cut.length > 1) {
        cut = cut.slice(0, -1);
        const test = cut + '...';
        try { w = font.widthOfTextAtSize(test, size); } catch (e) { w = 0; }
        if (w <= maxWidth) { lines.push(test); break; }
      }
      if (lines.length === 0) lines.push('...');
    }
  } else {
    size = minSize;
    const words = raw.split(' ');
    let line1 = '', line2 = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line1 ? line1 + ' ' + words[i] : words[i];
      try { w = font.widthOfTextAtSize(testLine, size); } catch (e) { w = 0; }
      if (w <= maxWidth) {
        line1 = testLine;
      } else {
        line2 = words.slice(i).join(' ');
        break;
      }
    }
    if (!line1) {
      let cut = words[0];
      while (cut.length > 1) {
        cut = cut.slice(0, -1);
        const test = cut + '...';
        try { w = font.widthOfTextAtSize(test, size); } catch (e) { w = 0; }
        if (w <= maxWidth) { line1 = test; break; }
      }
      line2 = words.slice(1).join(' ');
    }
    if (line2) {
      try { w = font.widthOfTextAtSize(line2, size); } catch (e) { w = 0; }
      if (w > maxWidth) {
        let cut = line2;
        while (cut.length > 1) {
          cut = cut.slice(0, -1);
          const test = cut + '...';
          try { w = font.widthOfTextAtSize(test, size); } catch (e) { w = 0; }
          if (w <= maxWidth) { line2 = test; break; }
        }
      }
    }
    lines.push(line1);
    if (line2) lines.push(line2);
  }

  lines.forEach((lineText, idx) => {
    let drawnW = 0;
    try { drawnW = font.widthOfTextAtSize(lineText, size); } catch (e) { drawnW = 0; }
    const drawX = align === 'right' ? (x + maxWidth - drawnW) : x;
    const drawY = y - idx * (size + 2);
    try { page.drawText(lineText, { x: drawX, y: drawY, size, font, color }); } catch (e) { /* skip */ }
  });
}

export async function generateMonthlySummaryPDF(summary, contact) {
  const c = normalizeContact(contact);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandIcons = await loadBrandIcons(pdfDoc);
  let qrImage = null;
  if (c.company_wechat_qr_url) {
    const qrData = await fetchQRImageBytes(c.company_wechat_qr_url);
    if (qrData) {
      qrImage = await embedQRImage(pdfDoc, qrData);
    }
  }

  const PAGE_W = 842;
  const PAGE_H = 595;
  const MARGIN = 30;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const HEADER_H = 65;
  const INFO_GAP_TOP = 22;
  const INFO_ROW_H = 16;
  const INFO_GAP_BELOW = 20;
  const TABLE_HEADER_H = 22;
  const ROW_H = 28;

  const FOOTER_TOTAL_H = FOOTER_H + LEGAL_STRIP_H;
  const BOTTOM_RESERVE = FOOTER_TOTAL_H + 75;
  const TOTAL_BAND_TOP = FOOTER_TOTAL_H + 65;
  const TOTAL_BAND_H = 55;

  const COLS = [
    { key: 'shipperRef',   label: 'Shipper Ref', x: MARGIN +  4,  w:  65, maxLines: 2, align: 'left' },
    { key: 'shipmentDate', label: 'Ship Date',   x: MARGIN + 69,  w:  60, maxLines: 1, align: 'left' },
    { key: 'tracking',     label: 'Tracking #',  x: MARGIN + 129, w: 100, maxLines: 1, align: 'left' },
    { key: 'mode',         label: 'Mode',        x: MARGIN + 229, w:  75, maxLines: 2, align: 'left' },
    { key: 'route',        label: 'Route',       x: MARGIN + 304, w: 110, maxLines: 2, align: 'left' },
    { key: 'recipient',    label: 'Recipient',   x: MARGIN + 414, w: 110, maxLines: 2, align: 'left' },
    { key: 'invoice',      label: 'Invoice #',   x: MARGIN + 524, w: 100, maxLines: 2, align: 'left' },
    { key: 'actualWeight', label: 'Actual Wt',   x: MARGIN + 624, w:  95, maxLines: 2, align: 'left' },
    { key: 'amount',       label: 'Amount',      x: MARGIN + 719, w:  59, maxLines: 1, align: 'right' },
  ];

  const rows = Array.isArray(summary.rows) ? summary.rows : [];

  const page1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  page1.drawRectangle({ x: 0, y: y - HEADER_H, width: PAGE_W, height: HEADER_H, color: ORANGE });
  
  // Centered Logo Box
  drawLogoBox(page1, MARGIN, y - 10, WHITE);
  const sxlWidth = fontBold.widthOfTextAtSize('sXL', 18);
  page1.drawText('sXL', { x: MARGIN + (45 - sxlWidth) / 2, y: y - 38, size: 18, font: fontBold, color: ORANGE });

  page1.drawText('SUPER EXPRESS', { x: MARGIN + 70, y: y - 26, size: 15, font: fontBold, color: WHITE });
  page1.drawText('LOGISTICS CENTER', { x: MARGIN + 70, y: y - 42, size: 8, font, color: WHITE });
  page1.drawText(OFFICE_ADDRESS_LINE, { x: MARGIN + 70, y: y - 56, size: 8, font, color: WHITE });

  page1.drawText('STATEMENT OF ACCOUNT', { x: PAGE_W - MARGIN - 200, y: y - 35, size: 12, font: fontBold, color: WHITE });

  y -= HEADER_H;

  y -= INFO_GAP_TOP;
  const infoLeft = [
    ['Shipper', summary.shipperName || '-'],
    ['Account No', summary.shipperAccount || '-'],
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

  const noteH = 22;
  page1.drawRectangle({ x: MARGIN, y: y - noteH, width: CONTENT_W, height: noteH, color: ORANGE_SOFT });
  page1.drawRectangle({ x: MARGIN, y: y - noteH, width: 4, height: noteH, color: ORANGE });
  page1.drawText(
    'This is a statement of account summarizing invoices already issued for this period. Refer to the referenced invoices for payment.',
    { x: MARGIN + 12, y: y - 14, size: 8, font: fontBold, color: NAVY }
  );
  y -= noteH + 12;

  function drawTableHeader(targetPage, headerY) {
    targetPage.drawRectangle({
      x: MARGIN,
      y: headerY - TABLE_HEADER_H + 6,
      width: CONTENT_W,
      height: TABLE_HEADER_H,
      color: NAVY,
    });

    const textY = headerY - 8;
    COLS.forEach((col) => {
      drawFittedCell(targetPage, {
        text: col.label,
        x: col.x,
        y: textY,
        maxWidth: col.w - 4,
        font: fontBold,
        startSize: 8,
        minSize: 6,
        color: WHITE,
        align: col.align,
        maxLines: 1,
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

    const textY = rowY - 10;

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
      invoice:        row.invoiceNumber || '-',
      actualWeight:   wtStr,
      amount:         'USD ' + (Number(row.amount) || 0).toFixed(2),
    };

    COLS.forEach((col) => {
      drawFittedCell(targetPage, {
        text: vals[col.key],
        x: col.x,
        y: textY,
        maxWidth: col.w - 4,
        font,
        startSize: 8,
        minSize: 6,
        color: BLACK,
        align: col.align,
        maxLines: col.maxLines,
      });
    });
  }

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
      currentPage.drawText('STATEMENT OF ACCOUNT (continued)', { x: MARGIN, y: ny - 30, size: 8, font, color: WHITE });
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

  currentPage.drawRectangle({
    x: MARGIN,
    y: TOTAL_BAND_TOP - TOTAL_BAND_H,
    width: CONTENT_W,
    height: TOTAL_BAND_H,
    color: ORANGE_LIGHT,
  });
  currentPage.drawText('TOTAL AMOUNT DUE', { x: MARGIN + 14, y: TOTAL_BAND_TOP - 24, size: 12, font: fontBold, color: NAVY });
  
  const currency = (summary.currency || 'USD').toUpperCase();
  const totalTxt = currency + ' ' + (Number(summary.total) || 0).toFixed(2);
  const totalW = fontBold.widthOfTextAtSize(totalTxt, 16);
  currentPage.drawText(totalTxt, { x: PAGE_W - MARGIN - 14 - totalW, y: TOTAL_BAND_TOP - 26, size: 16, font: fontBold, color: ORANGE });

  if (summary.localCurrency && summary.localTotal > 0) {
    const locCur = String(summary.localCurrency).toUpperCase();
    const locTxt = locCur + ' ' + Number(summary.localTotal).toFixed(2);
    const locW = fontBold.widthOfTextAtSize(locTxt, 11);
    currentPage.drawText(locTxt, { x: PAGE_W - MARGIN - 14 - locW, y: TOTAL_BAND_TOP - 42, size: 11, font: fontBold, color: NAVY });
  }

  currentPage.drawText(
    'Based on ' + (summary.invoiceCount || rows.length) + ' invoice' + ((summary.invoiceCount || rows.length) !== 1 ? 's' : '') + ' already issued.',
    { x: MARGIN + 14, y: TOTAL_BAND_TOP - 42, size: 7.5, font, color: GRAY }
  );

  const allPages = pdfDoc.getPages();
  allPages.forEach((p) => {
    drawContactFooter(p, {
      contact: c,
      font,
      fontBold,
      pageWidth: PAGE_W,
      footerHeight: FOOTER_H,
      includeQR: true,
      qrImage,
      brandIcons,
    });
    
    drawLegalStrip(p, {
      font,
      pageWidth: PAGE_W,
      footerHeight: FOOTER_H,
      lines: [
        { text: 'This is a statement of account summarizing existing invoices. No new charge added.', size: 7 },
        { text: 'Generated on ' + fmtDateTimeGMT(summary.generatedAt) + ' GMT | (c) sXL - Super Express Logistics Center', size: 6.5 },
      ],
    });
  });

  return await pdfDoc.save();
}
