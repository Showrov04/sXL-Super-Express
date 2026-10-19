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

const SEA_ACCENT = rgb(0.02, 0.4, 0.6);
const SEA_SOFT = rgb(0.9, 0.95, 0.99);

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

const OFFICE_ADDRESS_LINE = 'Unit 704B, 7th Floor  \u00B7  Well Fung Industrial Centre  \u00B7  68 Ta Chuen Ping Street, Kwai Chung  \u00B7  Hong Kong';

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

const COMPANY_CONTACT_DEFAULTS = {
  company_phone: '+852 60480171',
  company_email: 'admin@sxl-logistics.com',
  company_website: 'www.sxl-logistics.com',
  company_wechat: 'sXL-Logistics',
  company_whatsapp: '+852 60480171',
  company_wechat_qr_url: '',
};

function sanitizeForPDF(text) {
  if (text === null || text === undefined) return '';
  let out = String(text);
  out = out.replace(/\u2194/g, '<->');
  out = out.replace(/\u2192/g, '->');
  out = out.replace(/\u2190/g, '<-');
  out = out.replace(/\u2191/g, '^');
  out = out.replace(/\u2193/g, 'v');
  out = out.replace(/[\u2013\u2014]/g, '-');
  out = out.replace(/['']/g, "'");
  out = out.replace(/[""]/g, '"');
  out = out.replace(/\u2026/g, '...');
  out = out.replace(/\u2022/g, '*');
  out = out.replace(/\u2713/g, 'v');
  out = out.replace(/\u2714/g, 'v');
  out = out.replace(/\u2715/g, 'x');
  out = out.replace(/\u00D7/g, 'x');
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

function fitTextToWidth(text, font, startSize, minSize, maxWidth) {
  const raw = String(text || '');
  if (!raw) return { text: '', size: startSize };

  let size = startSize;
  while (size >= minSize) {
    try {
      const w = font.widthOfTextAtSize(raw, size);
      if (w <= maxWidth) return { text: raw, size };
    } catch (e) {
      return { text: raw, size };
    }
    size -= 0.5;
  }

  let clipped = raw;
  while (clipped.length > 1) {
    clipped = clipped.slice(0, -1);
    const test = clipped + '\u2026';
    try {
      const w = font.widthOfTextAtSize(test, minSize);
      if (w <= maxWidth) return { text: test, size: minSize };
    } catch (e) {
      return { text: test, size: minSize };
    }
  }
  return { text: '\u2026', size: minSize };
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

  try {
    page.drawText(shown, { x: drawX, y, size, font, color });
  } catch (e) { /* skip */ }

  return drawnW;
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

function normalizeContact(contact) {
  const c = contact && typeof contact === 'object' ? contact : {};
  const out = {};
  Object.keys(COMPANY_CONTACT_DEFAULTS).forEach((key) => {
    const v = c[key];
    out[key] = (v === null || v === undefined || v === '')
      ? COMPANY_CONTACT_DEFAULTS[key]
      : String(v).trim();
  });
  return out;
}

async function fetchQRImageBytes(qrUrl) {
  if (!qrUrl || !/^https?:\/\//i.test(qrUrl)) return null;
  try {
    const res = await fetch(qrUrl, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[PDF QR] Fetch failed:', res.status);
      return null;
    }
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return { bytes, contentType: ct };
  } catch (e) {
    console.error('[PDF QR] Exception:', e.message);
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
  } catch (e) {
    console.error('[PDF QR] Embed failed:', e.message);
    return null;
  }
}

async function loadBrandIcons(pdfDoc) {
  const out = {};
  const keys = Object.keys(BRAND_ICON_URLS);

  await Promise.all(keys.map(async (key) => {
    try {
      const res = await fetch(BRAND_ICON_URLS[key], { cache: 'no-store' });
      if (!res.ok) {
        console.warn('[BrandIcon] Fetch failed:', key, res.status);
        return;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      const img = await pdfDoc.embedPng(bytes);
      out[key] = img;
    } catch (e) {
      console.warn('[BrandIcon] Exception:', key, e.message);
    }
  }));

  return out;
}

// Draw rounded logo box with soft shadow simulating blur
function drawLogoBox(page, x, y, color) {
  const path = 'M 12 0 L 33 0 Q 45 0 45 12 L 45 33 Q 45 45 33 45 L 12 45 Q 0 45 0 33 L 0 12 Q 0 0 12 0 Z';
  
  // Soft Shadow Simulation (multi-layered offset with lower opacity)
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

  const bigCX = cx - G * 0.16;
  const bigCY = cy + G * 0.06;
  const bigRX = G * 0.32;
  const bigRY = G * 0.26;

  page.drawEllipse({
    x: bigCX, y: bigCY,
    xScale: bigRX, yScale: bigRY,
    color: WHITE,
  });

  page.drawSvgPath(
    `M 0 0 L ${-bigRX * 0.85} ${-bigRY * 0.15} L ${-bigRX * 0.30} ${-bigRY * 0.85} Z`,
    {
      x: bigCX + bigRX * 0.20,
      y: bigCY - bigRY * 0.70,
      color: WHITE,
      borderWidth: 0,
    }
  );

  page.drawCircle({ x: bigCX - bigRX * 0.40, y: bigCY + bigRY * 0.15, size: bigRX * 0.14, color: badgeColor });
  page.drawCircle({ x: bigCX + bigRX * 0.40, y: bigCY + bigRY * 0.15, size: bigRX * 0.14, color: badgeColor });

  const smCX = cx + G * 0.24;
  const smCY = cy - G * 0.10;
  const smRX = G * 0.24;
  const smRY = G * 0.19;

  page.drawEllipse({
    x: smCX, y: smCY,
    xScale: smRX, yScale: smRY,
    color: WHITE,
  });

  page.drawSvgPath(
    `M 0 0 L ${smRX * 0.85} ${-smRY * 0.15} L ${smRX * 0.30} ${-smRY * 0.85} Z`,
    {
      x: smCX - smRX * 0.20,
      y: smCY - smRY * 0.70,
      color: WHITE,
      borderWidth: 0,
    }
  );

  page.drawCircle({ x: smCX - smRX * 0.40, y: smCY + smRY * 0.15, size: smRX * 0.14, color: badgeColor });
  page.drawCircle({ x: smCX + smRX * 0.40, y: smCY + smRY * 0.15, size: smRX * 0.14, color: badgeColor });
}

const LEGAL_STRIP_H = 22;

function drawLegalStrip(page, opts) {
  const { font, pageWidth, footerHeight, lines } = opts;
  const LEFT = 40;

  const stripY = footerHeight;

  page.drawRectangle({
    x: 0, y: stripY,
    width: pageWidth, height: LEGAL_STRIP_H,
    color: rgb(0.96, 0.97, 0.98),
  });

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
      page.drawText(s(line.text), {
        x: LEFT, y: baseline,
        size: line.size || 7, font, color: GRAY,
      });
    } catch (e) { /* skip */ }
  });
}

function drawContactFooter(page, opts) {
  const {
    contact, font, fontBold, pageWidth, footerHeight,
    includeQR, qrImage, brandIcons,
  } = opts;

  const LEFT = 40;
  const RIGHT_PAD = 40;
  const CONTENT_W = pageWidth - LEFT - RIGHT_PAD;

  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: footerHeight, color: NAVY });
  page.drawRectangle({ x: 0, y: footerHeight - 2, width: pageWidth, height: 2, color: ORANGE });

  const labelColor = rgb(0.7, 0.8, 0.9);

  const QR_SIZE = 64;
  const QR_PAD = 10;
  const QR_BOX_SIZE = QR_SIZE + QR_PAD * 2;
  const qrBoxX = pageWidth - RIGHT_PAD - QR_BOX_SIZE;
  const qrBoxY = (footerHeight - QR_BOX_SIZE) / 2;

  let textColW = CONTENT_W;
  if (includeQR && qrImage) {
    textColW = CONTENT_W - QR_BOX_SIZE - 20;

    page.drawRectangle({ x: qrBoxX, y: qrBoxY, width: QR_BOX_SIZE, height: QR_BOX_SIZE, color: WHITE });

    page.drawImage(qrImage, {
      x: qrBoxX + QR_PAD, y: qrBoxY + QR_PAD,
      width: QR_SIZE, height: QR_SIZE,
    });

    const labelTxt = 'Scan to add WeChat';
    try {
      const lw = font.widthOfTextAtSize(labelTxt, 6.5);
      page.drawText(labelTxt, {
        x: qrBoxX + (QR_BOX_SIZE - lw) / 2,
        y: qrBoxY - 10,
        size: 6.5, font, color: labelColor,
      });
    } catch (e) { /* skip */ }
  }

  const labelSize = 8;
  const valueSize = 8.5;

  const rows = [];
  if (contact.company_phone) {
    rows.push({ key: 'phone', label: 'Phone', value: contact.company_phone, badge: 'P', bg: BADGE_PHONE });
  }
  if (contact.company_whatsapp) {
    rows.push({ key: 'whatsapp', label: 'WhatsApp', value: contact.company_whatsapp, badge: 'WA', bg: BADGE_WHATSAPP });
  }
  if (contact.company_email) {
    rows.push({ key: 'email', label: 'Email', value: contact.company_email, badge: 'E', bg: BADGE_EMAIL });
  }
  if (contact.company_website) {
    rows.push({ key: 'web', label: 'Web', value: contact.company_website, badge: 'W', bg: BADGE_WEB });
  }
  if (contact.company_wechat && !(includeQR && qrImage)) {
    rows.push({ key: 'wechat', label: 'WeChat', value: contact.company_wechat, badge: 'WC', bg: BADGE_WECHAT });
  }

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

function drawContactRow(page, x, y, maxW, row, font, fontBold, labelSize, valueSize, brandIcon) {
  const labelColor = rgb(0.7, 0.8, 0.9);
  const valueColor = rgb(0.98, 0.99, 1);

  const BADGE_D = 14;
  const BADGE_GAP = 8;
  const BADGE_CY = y + 5;

  let badgeEndX = x;

  const cx = x + BADGE_D / 2;

  try {
    page.drawCircle({ x: cx, y: BADGE_CY, size: BADGE_D / 2, color: row.bg });

    if (row.key === 'wechat') {
      drawWeChatGlyph(page, cx, BADGE_CY, row.bg);
    } else if (brandIcon) {
      const GLYPH = BADGE_D * 0.62;
      page.drawImage(brandIcon, {
        x: cx - GLYPH / 2, y: BADGE_CY - GLYPH / 2,
        width: GLYPH, height: GLYPH,
      });
    } else if (row.badge) {
      const isMulti = String(row.badge).length > 1;
      const badgeFontSize = isMulti ? 5.8 : 8;
      const bw = fontBold.widthOfTextAtSize(row.badge, badgeFontSize);
      page.drawText(row.badge, {
        x: cx - bw / 2, y: BADGE_CY - badgeFontSize * 0.35,
        size: badgeFontSize, font: fontBold, color: WHITE,
      });
    }
  } catch (e) { /* skip */ }

  badgeEndX = x + BADGE_D + BADGE_GAP;

  const labelTxt = s(row.label + ':');
  const valueTxt = s(row.value);

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

function drawHeaderAddress(page, x, y, font, color = WHITE) {
  try {
    page.drawText(OFFICE_ADDRESS_LINE, {
      x, y,
      size: 8,
      font,
      color,
    });
  } catch (e) { /* silent */ }
}

/* ============================================================
 *  BOOKING PDF
 * ============================================================ */
export async function generateBookingPDF(shipment, contact) {
  const c = normalizeContact(contact);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandIcons = await loadBrandIcons(pdfDoc);

  const LEFT = 40;
  const RIGHT_PAD = 40;
  const CONTENT_W = width - LEFT - RIGHT_PAD;

  const FOOTER_H = 100;
  const FOOTER_TOTAL_H = FOOTER_H + LEGAL_STRIP_H;

  const SIG_BLOCK_H = 40;
  const SIG_GAP_BELOW = 8;
  const SIG_GAP_ABOVE = 12;

  const CONTENT_FLOOR_Y = FOOTER_TOTAL_H + SIG_GAP_BELOW + SIG_BLOCK_H + SIG_GAP_ABOVE;

  let y = height;

  page.drawRectangle({ x: 0, y: y - 65, width, height: 65, color: ORANGE });
  
  // Perfectly centered logo box and text
  drawLogoBox(page, LEFT, y - 10, WHITE);
  const sxlWidth = fontBold.widthOfTextAtSize('sXL', 18);
  page.drawText('sXL', { x: LEFT + (45 - sxlWidth) / 2, y: y - 38, size: 18, font: fontBold, color: ORANGE });

  page.drawText('SUPER EXPRESS', { x: LEFT + 70, y: y - 26, size: 15, font: fontBold, color: WHITE });
  page.drawText('LOGISTICS CENTER', { x: LEFT + 70, y: y - 42, size: 8, font, color: WHITE });
  drawHeaderAddress(page, LEFT + 70, y - 56, font, WHITE);
  page.drawText('BOOKING CONFIRMATION', { x: 380, y: y - 35, size: 12, font: fontBold, color: WHITE });
  y -= 65;

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

  y -= 12;
  page.drawRectangle({ x: LEFT, y: y - 30, width: CONTENT_W, height: 30, color: ORANGE_SOFT });

  const SERVICE_X = 245;
  const DATE_X = 430;
  const STATUS_FIELD_W = SERVICE_X - (LEFT + 12) - 6;

  const statusRaw = s(shipment.status || 'Booked').toUpperCase();
  const statusFit = fitTextToWidth(statusRaw, fontBold, 12, 7, STATUS_FIELD_W);

  page.drawText('STATUS', { x: LEFT + 12, y: y - 11, size: 9, font: fontBold, color: GRAY });
  page.drawText(statusFit.text, { x: LEFT + 12, y: y - 24, size: statusFit.size, font: fontBold, color: ORANGE });

  page.drawText('SERVICE', { x: SERVICE_X, y: y - 11, size: 9, font: fontBold, color: GRAY });
  page.drawText(s(shipment.service_type || '-'), { x: SERVICE_X, y: y - 24, size: 11, font, color: BLACK });

  page.drawText('DATE', { x: DATE_X, y: y - 11, size: 9, font: fontBold, color: GRAY });
  page.drawText(fmtDate(shipment.booked_at), { x: DATE_X, y: y - 24, size: 10, font, color: BLACK });

  y -= 30;

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

  const WRAP_CHARS = 30;
  const labelColW = 58;
  const lineH = 11;

  function renderSide(rows) {
    let curY = y;
    const rendered = [];
    for (const [label, value] of rows) {
      const lines = wrapText(value, WRAP_CHARS);
      rendered.push({ label, lines });
      curY -= lines.length * lineH + 2;
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
      curY -= row.lines.length * lineH + 2;
    }
  }
  drawSide(shipperRender.rendered, leftX);
  drawSide(consigneeRender.rendered, rightX);

  y -= blockH + 12;

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

  const detLineH = 11;
  let detHeight = 0;
  const detRendered = detailsRows.map(([label, value]) => {
    const lines = wrapText(value, Math.floor((detLeftW - 125) / 4.6));
    detHeight += Math.max(lines.length * detLineH, 14) + 3;
    return { label, lines };
  });

  const timelineBlockH = deliveryTimeline ? 30 : 0;
  const timelineSpacer = deliveryTimeline ? 5 : 0;

  const keyFigureRowH = 34;
  const servicesHeaderH = servicesTaken.length > 0 ? 20 : 0;
  const servicesRowH = 13;
  const servicesBlockH = servicesTaken.length > 0 ? (servicesHeaderH + servicesTaken.length * servicesRowH + 8) : 0;
  const keyFiguresH = keyFigures.length * keyFigureRowH + 8 + servicesBlockH;
  const detailsBlockH = Math.max(detHeight + 8 + timelineBlockH + timelineSpacer, keyFiguresH);

  page.drawRectangle({ x: LEFT, y: y - detailsBlockH, width: detLeftW, height: detailsBlockH, color: LIGHT });
  page.drawRectangle({ x: detRightX, y: y - detailsBlockH, width: detRightW, height: detailsBlockH, color: ORANGE_LIGHT });

  let curY = y - 5;
  for (const row of detRendered) {
    page.drawText(row.label + ':', { x: LEFT + 8, y: curY - 11, size: 9, font: fontBold, color: GRAY });
    row.lines.forEach((line, li) => {
      page.drawText(line, { x: LEFT + 125, y: curY - 11 - li * detLineH, size: 9, font, color: BLACK });
    });
    curY -= Math.max(row.lines.length * detLineH, 14) + 3;
  }

  if (deliveryTimeline) {
    curY -= timelineSpacer;
    const stripH = 24;
    const stripY = curY - stripH - 2;

    page.drawRectangle({
      x: LEFT + 4, y: stripY,
      width: detLeftW - 8, height: stripH,
      color: ORANGE_HIGHLIGHT,
    });

    page.drawRectangle({
      x: LEFT + 4, y: stripY,
      width: 4, height: stripH,
      color: ORANGE,
    });

    page.drawText('DELIVERY TIMELINE', {
      x: LEFT + 14, y: stripY + 14,
      size: 7.5, font: fontBold, color: NAVY,
    });

    const timelineLines = wrapText(deliveryTimeline, Math.floor((detLeftW - 20) / 5.2));
    timelineLines.slice(0, 1).forEach((line) => {
      page.drawText(line, {
        x: LEFT + 14, y: stripY + 4,
        size: 10, font: fontBold, color: BLACK,
      });
    });

    curY -= stripH + 4;
  }

  let kfY = y - 8;
  for (const [label, value] of keyFigures) {
    page.drawText(label.toUpperCase(), { x: detRightX + 12, y: kfY - 9, size: 8, font: fontBold, color: GRAY });
    page.drawText(value, { x: detRightX + 12, y: kfY - 24, size: 13, font: fontBold, color: NAVY });
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
    kfY -= 13;

    for (const svc of servicesTaken) {
      page.drawText('> ' + svc, {
        x: detRightX + 12, y: kfY - 8, size: 10, font: fontBold, color: NAVY,
      });
      kfY -= servicesRowH;
    }
  }

  y -= detailsBlockH + 12;

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

  const PICKUP_WRAP = 26;
  let smallLineH = 11;

  function measureSmallSide(rows, lineHTest) {
    let curY = 0;
    for (const [, value] of rows) {
      const lines = wrapText(value, PICKUP_WRAP);
      curY += lines.length * lineHTest + 3;
    }
    return curY;
  }

  function pickLineHeight() {
    const candidates = [11, 10.5, 10, 9.5, 9, 8.5, 8];
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
      curY -= lines.length * smallLineH + 3;
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

  const minSigY = FOOTER_TOTAL_H + SIG_GAP_BELOW + SIG_BLOCK_H;
  let finalSigY = blockBottomY - SIG_GAP_ABOVE;
  if (finalSigY > minSigY) finalSigY = minSigY;
  if (finalSigY < FOOTER_TOTAL_H + 20) finalSigY = FOOTER_TOTAL_H + 20;

  page.drawText('SHIPPER SIGNATURE', { x: leftX + 8, y: finalSigY, size: 9, font: fontBold, color: GRAY });
  page.drawLine({ start: { x: leftX + 8, y: finalSigY - 26 }, end: { x: leftX + colW - 8, y: finalSigY - 26 }, thickness: 0.5, color: GRAY_LIGHT });

  page.drawText('CONSIGNEE SIGNATURE', { x: rightX + 8, y: finalSigY, size: 9, font: fontBold, color: GRAY });
  page.drawLine({ start: { x: rightX + 8, y: finalSigY - 26 }, end: { x: rightX + colW - 8, y: finalSigY - 26 }, thickness: 0.5, color: GRAY_LIGHT });

  let qrImage = null;
  if (c.company_wechat_qr_url) {
    const qrData = await fetchQRImageBytes(c.company_wechat_qr_url);
    if (qrData) {
      qrImage = await embedQRImage(pdfDoc, qrData);
    }
  }

  drawContactFooter(page, {
    contact: c, font, fontBold,
    pageWidth: width,
    footerHeight: FOOTER_H,
    includeQR: true,
    qrImage,
    brandIcons,
  });

  drawLegalStrip(page, {
    font,
    pageWidth: width,
    footerHeight: FOOTER_H,
    lines: [
      { text: 'This is a computer-generated document. No signature required.', size: 7 },
      { text: 'Booked on ' + fmtDateTimeGMT(shipment.booked_at) + ' GMT | (c) sXL - Super Express Logistics Center | ' + s(shipment.tracking_number), size: 6.5 },
    ],
  });

  return await pdfDoc.save();
}

/* ============================================================
 *  INVOICE PDF
 * ============================================================ */
export async function generateInvoicePDF(invoice, shipments, contact) {
  const c = normalizeContact(contact);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandIcons = await loadBrandIcons(pdfDoc);

  if (invoice.type === 'individual' && shipments && shipments.length > 0) {
    /* --- NEW INDIVIDUAL LAYOUT (PORTRAIT) --- */
    const shipment = shipments[0];
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const LEFT = 40;
    const RIGHT_PAD = 40;
    const CONTENT_W = width - LEFT - RIGHT_PAD;
    let y = height;

    // HEADER
    page.drawRectangle({ x: 0, y: y - 65, width, height: 65, color: ORANGE });
    
    // Centered Logo box
    drawLogoBox(page, LEFT, y - 10, WHITE);
    const sxlWidth = fontBold.widthOfTextAtSize('sXL', 18);
    page.drawText('sXL', { x: LEFT + (45 - sxlWidth) / 2, y: y - 38, size: 18, font: fontBold, color: ORANGE });

    page.drawText('SUPER EXPRESS', { x: LEFT + 70, y: y - 26, size: 15, font: fontBold, color: WHITE });
    page.drawText('LOGISTICS CENTER', { x: LEFT + 70, y: y - 42, size: 8, font, color: WHITE });
    drawHeaderAddress(page, LEFT + 70, y - 56, font, WHITE);
            page.drawText('INVOICE', { x: 480, y: y - 35, size: 16, font: fontBold, color: WHITE });
    if (invoice.isRevised) {
      page.drawRectangle({ x: 0, y: y - 85, width: 595, height: 20, color: rgb(0.86, 0.2, 0.2) });
      page.drawText('REVISED INVOICE - PLEASE REVIEW UPDATED COSTS', { x: 40, y: y - 79, size: 10, font: fontBold, color: WHITE });
    }
    y -= 65;

    // INFO BLOCKS
    y -= 25;
    
    let ly = y;
    page.drawText('BILL TO', { x: LEFT, y: ly, size: 8, font: fontBold, color: GRAY });
    ly -= 16;
    page.drawText(s(shipment.sender_name), { x: LEFT, y: ly, size: 11, font: fontBold, color: BLACK });
    ly -= 14;
    page.drawText('Account: ' + (shipment.booked_by || '-'), { x: LEFT, y: ly, size: 9, font, color: BLACK });
    ly -= 14;
    const addrLines = [
      s(shipment.pickup_address),
      [s(shipment.pickup_city), s(shipment.pickup_state)].filter(Boolean).join(', '),
      countryName(shipment.origin),
    ].filter(Boolean);
    addrLines.forEach(line => {
      page.drawText(line, { x: LEFT, y: ly, size: 9, font, color: BLACK });
      ly -= 12;
    });

    let ry = y;
    const RX = 380;
    const rLabels = [
      ['Invoice No:', s(invoice.invoice_number)],
      ['Issue Date:', fmtDate(invoice.issue_date)],
      ['Due Date:', fmtDate(invoice.due_date)],
      ['Tracking #:', s(shipment.tracking_number)],
    ];
    rLabels.forEach(([lbl, val]) => {
      page.drawText(lbl, { x: RX, y: ry, size: 9, font: fontBold, color: GRAY });
      page.drawText(val, { x: RX + 80, y: ry, size: 9, font, color: BLACK });
      ry -= 14;
    });

    y = Math.min(ly, ry) - 25;

    // SHIPMENT DETAILS BOX
    const boxH = 60;
    page.drawRectangle({ x: LEFT, y: y - boxH, width: CONTENT_W, height: boxH, color: LIGHT });
    
    const modeStr = buildShipmentType(shipment);
    const routeStr = (countryName(shipment.origin) || '-') + ' -> ' + (countryName(shipment.destination) || '-');
    
    page.drawText('SHIPMENT DETAILS', { x: LEFT + 10, y: y - 15, size: 8, font: fontBold, color: GRAY });
    page.drawText(modeStr + '  |  ' + routeStr, { x: LEFT + 10, y: y - 28, size: 10, font: fontBold, color: BLACK });
    page.drawText('Recipient: ' + s(shipment.recipient_name), { x: LEFT + 10, y: y - 42, size: 9, font, color: BLACK });
    
    const aw = parseFloat(shipment.actual_weight) || 0;
    const cbm = parseFloat(shipment.total_cbm) || 0;
    let wtStr = aw.toFixed(2) + ' kg';
    if (cbm > 0) wtStr += ' / ' + cbm.toFixed(2) + ' CBM';
    page.drawText('Weight/Vol: ' + wtStr, { x: LEFT + 250, y: y - 42, size: 9, font, color: BLACK });

    y -= boxH + 25;

    // FINANCIAL BREAKDOWN
    page.drawText('COST BREAKDOWN', { x: LEFT, y, size: 9, font: fontBold, color: NAVY });
    y -= 15;

    const bd = shipment.cost_breakdown ? (typeof shipment.cost_breakdown === 'string' ? JSON.parse(shipment.cost_breakdown) : shipment.cost_breakdown) : {};
    const isSea = String(shipment.ship_mode).toUpperCase() === 'SEA';
    const rate = parseFloat(shipment.rate_per_kg) || parseFloat(bd.ratePerKg) || 0;
    const freightBase = isSea ? cbm : aw;
    const freightTotal = parseFloat(bd.freightTotal) || (freightBase * rate);

    const pickupCharge = parseFloat(shipment.pickup_charge) || parseFloat(bd.pickupCharge) || 0;
    const customsCharge = parseFloat(shipment.customs_charge) || parseFloat(bd.customsCharge) || 0;
    const deliveryCharge = parseFloat(shipment.delivery_charge) || parseFloat(bd.deliveryCharge) || 0;
    const addlLines = Array.isArray(bd.additionalLines) ? bd.additionalLines : [];

    const tableRows = [];
    tableRows.push({
      desc: 'Freight Charge (' + (isSea ? 'Sea' : 'Air') + ')',
      base: freightBase.toFixed(2) + ' ' + (isSea ? 'CBM' : 'kg'),
      rate: 'USD ' + rate.toFixed(2),
      amt: freightTotal
    });
    if (pickupCharge > 0) tableRows.push({ desc: 'Pickup Charge', base: '-', rate: '-', amt: pickupCharge });
    if (customsCharge > 0) tableRows.push({ desc: 'Customs Clearance', base: '-', rate: '-', amt: customsCharge });
    if (deliveryCharge > 0) tableRows.push({ desc: 'Delivery Charge', base: '-', rate: '-', amt: deliveryCharge });
    addlLines.forEach(l => {
      if (parseFloat(l.amount) > 0) {
        tableRows.push({ desc: l.label || 'Additional Cost', base: '-', rate: '-', amt: parseFloat(l.amount) });
      }
    });

    // Table Header
    page.drawRectangle({ x: LEFT, y: y - 24, width: CONTENT_W, height: 24, color: NAVY });
    page.drawText('DESCRIPTION', { x: LEFT + 10, y: y - 16, size: 8, font: fontBold, color: WHITE });
    page.drawText('BASE/QTY', { x: LEFT + 250, y: y - 16, size: 8, font: fontBold, color: WHITE });
    page.drawText('RATE', { x: LEFT + 350, y: y - 16, size: 8, font: fontBold, color: WHITE });
    const amtW = fontBold.widthOfTextAtSize('AMOUNT', 8);
    page.drawText('AMOUNT', { x: LEFT + CONTENT_W - 10 - amtW, y: y - 16, size: 8, font: fontBold, color: WHITE });
    y -= 24;

    // Table Rows
    let grandTotal = 0;
    tableRows.forEach((row, i) => {
      const bg = i % 2 === 0 ? WHITE : LIGHT;
      page.drawRectangle({ x: LEFT, y: y - 20, width: CONTENT_W, height: 20, color: bg });
      page.drawText(s(row.desc), { x: LEFT + 10, y: y - 14, size: 9, font, color: BLACK });
      page.drawText(row.base, { x: LEFT + 250, y: y - 14, size: 9, font, color: BLACK });
      page.drawText(row.rate, { x: LEFT + 350, y: y - 14, size: 9, font, color: BLACK });
      
      const amtStr = 'USD ' + row.amt.toFixed(2);
      const aw = font.widthOfTextAtSize(amtStr, 9);
      page.drawText(amtStr, { x: LEFT + CONTENT_W - 10 - aw, y: y - 14, size: 9, font, color: BLACK });
      
      grandTotal += row.amt;
      y -= 20;
    });

    // TOTALS
    y -= 15;
    const totalBandH = 50;
    page.drawRectangle({ x: LEFT, y: y - totalBandH, width: CONTENT_W, height: totalBandH, color: ORANGE_SOFT });
    page.drawText('TOTAL DUE', { x: LEFT + 15, y: y - 25, size: 11, font: fontBold, color: NAVY });
    
    const totalStr = 'USD ' + grandTotal.toFixed(2);
    const totalW = fontBold.widthOfTextAtSize(totalStr, 16);
    page.drawText(totalStr, { x: LEFT + CONTENT_W - 15 - totalW, y: y - 30, size: 16, font: fontBold, color: ORANGE });

    const locCur = bd.localCurrency || '';
    const locAmt = parseFloat(bd.localAmount) || 0;
    if (locCur && locAmt > 0) {
      const locStr = 'Local Equivalent: ' + locCur + ' ' + locAmt.toFixed(2);
      const lW = font.widthOfTextAtSize(locStr, 9);
      page.drawText(locStr, { x: LEFT + CONTENT_W - 15 - lW, y: y - 42, size: 9, font: fontBold, color: GRAY });
    }

    // FOOTER
    const FOOTER_H = 90;
    drawContactFooter(page, { contact: c, font, fontBold, pageWidth: width, footerHeight: FOOTER_H, includeQR: false, qrImage: null, brandIcons });
    drawLegalStrip(page, {
      font, pageWidth: width, footerHeight: FOOTER_H,
      lines: [
        { text: 'This is a computer-generated invoice.', size: 7 },
        { text: 'Issued on ' + fmtDateTimeGMT(invoice.issue_date) + ' GMT | (c) sXL - Super Express Logistics Center', size: 6.5 },
      ],
    });

    return await pdfDoc.save();
  }

  /* --- MONTHLY SUMMARY / MULTI-SHIPMENT LAYOUT --- */
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const HEADER_H = 65;
  const CONT_BANNER_H = 40;
  const CONT_BANNER_GAP = 8;
  const INFO_GAP_TOP = 30;
  const INFO_ROW_H = 18;
  const INFO_GAP_BELOW = 20;
  const TABLE_HEADER_H = 24;
  const ROW_H = 20;
  const TOTAL_BAND_H = 45;

  const FOOTER_H = 90;
  const FOOTER_TOTAL_H = FOOTER_H + LEGAL_STRIP_H;

  const BOTTOM_RESERVE = FOOTER_TOTAL_H + 88; 
  const TOTAL_BAND_TOP = FOOTER_TOTAL_H + 75; 

  const COL = {
    shipperRef: { x: 45,  w: 55,  align: 'left'  },
    tracking:   { x: 100, w: 85,  align: 'left'  },
    mode:       { x: 185, w: 60,  align: 'left'  },
    route:      { x: 245, w: 110, align: 'left'  },
    recipient:  { x: 355, w: 105, align: 'left'  },
    weight:     { x: 460, w: 45,  align: 'right' },
    amount:     { x: 505, w: 42,  align: 'right' },
  };
  const BODY_SIZE = 8;
  const BODY_MIN = 6;
  const HEAD_SIZE = 8;

  const rows = (shipments || []).map((sh) => {
    const route = countryName(sh.origin) + ' -> ' + countryName(sh.destination);
    const mode = buildShipmentType(sh);
    const amt = parseFloat(sh.shipping_cost) || 0;
    return {
      shipperRef: s(sh.shipper_ref) || '-',
      tracking: s(sh.tracking_number),
      mode,
      route,
      recipient: s(sh.recipient_name) || '-',
      weight: (s(sh.total_weight) || '0') + ' kg',
      amount: amt.toFixed(2),
      rawAmount: amt,
    };
  });

  let grandTotal = 0;
  rows.forEach((r) => { grandTotal += r.rawAmount; });
  const total = grandTotal > 0 ? grandTotal : (parseFloat(invoice.amount) || 0);

  const shipperAccount =
    (shipments && shipments.length > 0 && shipments[0].booked_by)
      ? shipments[0].booked_by
      : (invoice.shipper_id || '');

  const info = [
    ['Invoice Number', s(invoice.invoice_number)],
    ['Issue Date', fmtDate(invoice.issue_date)],
    ['Due Date', fmtDate(invoice.due_date)],
    ['Status', s(invoice.status)],
    ['Shipper', s(invoice.shipper_name)],
    ['Shipper Account', s(shipperAccount) || '-'],
  ];
  if (invoice.month) info.push(['Month', s(invoice.month)]);

  const page1 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  page1.drawRectangle({ x: 0, y: y - HEADER_H, width: PAGE_W, height: HEADER_H, color: ORANGE });
  
  // Centered Logo box
  drawLogoBox(page1, MARGIN, y - 10, WHITE);
  const sxlWidth = fontBold.widthOfTextAtSize('sXL', 18);
  page1.drawText('sXL', { x: MARGIN + (45 - sxlWidth) / 2, y: y - 38, size: 18, font: fontBold, color: ORANGE });

  page1.drawText('SUPER EXPRESS', { x: MARGIN + 70, y: y - 26, size: 15, font: fontBold, color: WHITE });
  page1.drawText('LOGISTICS CENTER', { x: MARGIN + 70, y: y - 42, size: 8, font, color: WHITE });
  drawHeaderAddress(page1, MARGIN + 70, y - 56, font, WHITE);
      page1.drawText(invoice.type === 'monthly-summary' ? 'MONTHLY SUMMARY INVOICE' : 'INVOICE', {
    x: 380, y: y - 35, size: 12, font: fontBold, color: WHITE,
  });
  if (invoice.isRevised) {
    page1.drawRectangle({ x: 0, y: y - 85, width: 595, height: 20, color: rgb(0.86, 0.2, 0.2) });
    page1.drawText('REVISED INVOICE - PLEASE REVIEW UPDATED COSTS', { x: 40, y: y - 79, size: 10, font: fontBold, color: WHITE });
  }
  y -= HEADER_H;

  y -= INFO_GAP_TOP;
  info.forEach(([label, value]) => {
    page1.drawText(label + ':', { x: MARGIN, y, size: 10, font: fontBold, color: NAVY });
    page1.drawText(String(value || '-'), { x: 160, y, size: 10, font, color: BLACK });
    y -= INFO_ROW_H;
  });
  y -= INFO_GAP_BELOW;

  function drawTableHeader(targetPage, headerY) {
    targetPage.drawRectangle({
      x: MARGIN,
      y: headerY - 20,
      width: PAGE_W - MARGIN * 2,
      height: TABLE_HEADER_H,
      color: NAVY,
    });
    const textY = headerY - 13;
    drawFittedCell(targetPage, { text: 'Shipper Ref', x: COL.shipperRef.x, y: textY, maxWidth: COL.shipperRef.w, font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'left' });
    drawFittedCell(targetPage, { text: 'Tracking #',  x: COL.tracking.x,   y: textY, maxWidth: COL.tracking.w,   font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'left' });
    drawFittedCell(targetPage, { text: 'Mode',        x: COL.mode.x,       y: textY, maxWidth: COL.mode.w,       font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'left' });
    drawFittedCell(targetPage, { text: 'Route',       x: COL.route.x,      y: textY, maxWidth: COL.route.w,      font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'left' });
    drawFittedCell(targetPage, { text: 'Recipient',   x: COL.recipient.x,  y: textY, maxWidth: COL.recipient.w,  font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'left' });
    drawFittedCell(targetPage, { text: 'Weight',      x: COL.weight.x,     y: textY, maxWidth: COL.weight.w,     font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'right' });
    drawFittedCell(targetPage, { text: 'Amount',      x: COL.amount.x,     y: textY, maxWidth: COL.amount.w,     font: fontBold, startSize: HEAD_SIZE, minSize: 6, color: WHITE, align: 'right' });
  }

  function drawContinuationBanner(targetPage, bannerY) {
    targetPage.drawRectangle({ x: 0, y: bannerY - CONT_BANNER_H, width: PAGE_W, height: CONT_BANNER_H, color: ORANGE });
    targetPage.drawText('SUPER EXPRESS', { x: MARGIN, y: bannerY - 16, size: 11, font: fontBold, color: WHITE });
    targetPage.drawText(
      invoice.type === 'monthly-summary' ? 'MONTHLY SUMMARY INVOICE (continued)' : 'INVOICE (continued)',
      { x: MARGIN, y: bannerY - 30, size: 8, font, color: WHITE }
    );
    const invNum = s(invoice.invoice_number || '');
    if (invNum) {
      const invW = fontBold.widthOfTextAtSize(invNum, 9);
      targetPage.drawText(invNum, { x: PAGE_W - MARGIN - invW, y: bannerY - 18, size: 9, font: fontBold, color: WHITE });
    }
  }

  function drawRowOnPage(targetPage, rowY, row, idx) {
    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    targetPage.drawRectangle({
      x: MARGIN,
      y: rowY - 18,
      width: PAGE_W - MARGIN * 2,
      height: ROW_H,
      color: bg,
    });
    const textY = rowY - 12;
    drawFittedCell(targetPage, { text: row.shipperRef, x: COL.shipperRef.x, y: textY, maxWidth: COL.shipperRef.w, font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'left' });
    drawFittedCell(targetPage, { text: row.tracking,   x: COL.tracking.x,   y: textY, maxWidth: COL.tracking.w,   font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'left' });
    drawFittedCell(targetPage, { text: row.mode,       x: COL.mode.x,       y: textY, maxWidth: COL.mode.w,       font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'left' });
    drawFittedCell(targetPage, { text: row.route,      x: COL.route.x,      y: textY, maxWidth: COL.route.w,      font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'left' });
    drawFittedCell(targetPage, { text: row.recipient,  x: COL.recipient.x,  y: textY, maxWidth: COL.recipient.w,  font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'left' });
    drawFittedCell(targetPage, { text: row.weight,     x: COL.weight.x,     y: textY, maxWidth: COL.weight.w,     font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'right' });
    drawFittedCell(targetPage, { text: row.amount,     x: COL.amount.x,     y: textY, maxWidth: COL.amount.w,     font, startSize: BODY_SIZE, minSize: BODY_MIN, color: BLACK, align: 'right' });
  }

  drawTableHeader(page1, y);
  y -= TABLE_HEADER_H;

  let currentPage = page1;
  let rowIdx = 0;

  for (const row of rows) {
    if (y - ROW_H < BOTTOM_RESERVE) {
      currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      let ny = PAGE_H;
      drawContinuationBanner(currentPage, ny);
      ny -= CONT_BANNER_H;
      ny -= CONT_BANNER_GAP;
      drawTableHeader(currentPage, ny);
      ny -= TABLE_HEADER_H;
      y = ny;
    }

    drawRowOnPage(currentPage, y, row, rowIdx);
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
  currentPage.drawText('TOTAL AMOUNT DUE', {
    x: MARGIN + 15,
    y: TOTAL_BAND_TOP - 20,
    size: 12, font: fontBold, color: NAVY,
  });
  currentPage.drawText(
    s(invoice.currency || 'USD') + ' ' + Number(total).toFixed(2),
    { x: 350, y: TOTAL_BAND_TOP - 30, size: 18, font: fontBold, color: ORANGE }
  );

  if (invoice.local_currency && invoice.local_amount) {
    currentPage.drawText(
      'Local currency: ' + s(invoice.local_currency) + ' ' + Number(invoice.local_amount).toFixed(2),
      { x: MARGIN, y: TOTAL_BAND_TOP - 60, size: 10, font, color: GRAY }
    );
  }

  const allPages = pdfDoc.getPages();
  allPages.forEach((p) => {
    drawContactFooter(p, {
      contact: c, font, fontBold,
      pageWidth: PAGE_W,
      footerHeight: FOOTER_H,
      includeQR: false,
      qrImage: null,
      brandIcons,
    });

    drawLegalStrip(p, {
      font,
      pageWidth: PAGE_W,
      footerHeight: FOOTER_H,
      lines: [
        { text: 'This is a computer-generated document.', size: 7 },
        { text: 'Issued on ' + fmtDateTimeGMT(invoice.issue_date) + ' GMT | (c) sXL - Super Express Logistics Center', size: 6.5 },
      ],
    });
  });

  return await pdfDoc.save();
}

/* ============================================================
 *  QUOTE PDF
 * ============================================================ */
export async function generateQuotePDF(quote, contact) {
  const c = normalizeContact(contact);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandIcons = await loadBrandIcons(pdfDoc);

  const LEFT = 40;
  const RIGHT_PAD = 40;
  const CONTENT_W = width - LEFT - RIGHT_PAD;

  const isSea = String(quote.quote_type || '').toUpperCase() === 'SEA';
  const ACCENT = isSea ? SEA_ACCENT : ORANGE;
  const ACCENT_SOFT = isSea ? SEA_SOFT : ORANGE_SOFT;
  const ACCENT_LIGHT = isSea ? SEA_SOFT : ORANGE_LIGHT;
  const TITLE = isSea ? 'SEA FREIGHT QUOTE' : 'AIR FREIGHT QUOTE';

  const FOOTER_H = 90;
  const FOOTER_TOTAL_H = FOOTER_H + LEGAL_STRIP_H;
  const CONTENT_FLOOR_Y = FOOTER_TOTAL_H + 20;

  let y = height;

  /* ---------- HEADER ---------- */
  page.drawRectangle({ x: 0, y: y - 65, width, height: 65, color: ACCENT });
  
  // Centered Logo box
  drawLogoBox(page, LEFT, y - 10, WHITE);
  const sxlWidth = fontBold.widthOfTextAtSize('sXL', 18);
  page.drawText('sXL', { x: LEFT + (45 - sxlWidth) / 2, y: y - 38, size: 18, font: fontBold, color: ACCENT });

  page.drawText('SUPER EXPRESS', { x: LEFT + 70, y: y - 26, size: 15, font: fontBold, color: WHITE });
  page.drawText('LOGISTICS CENTER', { x: LEFT + 70, y: y - 42, size: 8, font, color: WHITE });
  drawHeaderAddress(page, LEFT + 70, y - 56, font, WHITE);
  page.drawText(TITLE, { x: 380, y: y - 35, size: 12, font: fontBold, color: WHITE });
  y -= 65;

  /* ---------- QUOTE NUMBER + VALIDITY ---------- */
  page.drawRectangle({ x: 0, y: y - 60, width, height: 60, color: NAVY });
  page.drawText('QUOTE NUMBER', { x: LEFT, y: y - 20, size: 8, font, color: rgb(0.7, 0.8, 0.9) });
  page.drawText(s(quote.quote_number || '-'), { x: LEFT, y: y - 44, size: 20, font: fontBold, color: WHITE });

  const VALID_X = 380;
  page.drawText('VALID UNTIL', { x: VALID_X, y: y - 20, size: 8, font, color: rgb(0.7, 0.8, 0.9) });
  page.drawText(
    quote.valid_until ? fmtDate(quote.valid_until) : 'Not specified',
    { x: VALID_X, y: y - 44, size: 12, font: fontBold, color: WHITE }
  );
  y -= 60;

  y -= 22;

  /* ---------- PREPARED FOR + ROUTE ---------- */
  const colGap = 16;
  const colW = (CONTENT_W - colGap) / 2;
  const leftX = LEFT;
  const rightX = LEFT + colW + colGap;

  drawSectionHeader(page, leftX, y, colW, 'PREPARED FOR', fontBold, ACCENT);
  drawSectionHeader(page, rightX, y, colW, 'ROUTE', fontBold, ACCENT);
  y -= 22;

  const customerRows = [
    ['Name', s(quote.customer_name) || '-'],
    ['Company', s(quote.customer_company) || '-'],
    ['Email', s(quote.customer_email) || '-'],
    ['Phone', s(quote.customer_phone) || '-'],
  ];
  const routeRows = [
    ['From', s(quote.origin) || '-'],
    ['To', s(quote.destination) || '-'],
    ['Mode', isSea ? 'Sea Freight' : 'Air Freight'],
  ];

  const rowH = 14;
  const rowCount = Math.max(customerRows.length, routeRows.length);
  const blockH = rowCount * rowH + 12;

  page.drawRectangle({ x: leftX, y: y - blockH, width: colW, height: blockH, color: LIGHT });
  page.drawRectangle({ x: rightX, y: y - blockH, width: colW, height: blockH, color: LIGHT });

  let curY = y;
  customerRows.forEach(([label, val]) => {
    page.drawText(label + ':', { x: leftX + 10, y: curY - 12, size: 9, font: fontBold, color: GRAY });
    page.drawText(truncate(val, 32), { x: leftX + 70, y: curY - 12, size: 9, font, color: BLACK });
    curY -= rowH;
  });

  curY = y;
  routeRows.forEach(([label, val]) => {
    page.drawText(label + ':', { x: rightX + 10, y: curY - 12, size: 9, font: fontBold, color: GRAY });
    page.drawText(truncate(val, 32), { x: rightX + 60, y: curY - 12, size: 9, font, color: BLACK });
    curY -= rowH;
  });

  y -= blockH + 18;

  /* ---------- SHIPMENT DETAILS ---------- */
  drawSectionHeader(page, LEFT, y, CONTENT_W, 'SHIPMENT DETAILS', fontBold, ACCENT);
  y -= 22;

  const detailRows = [];
  detailRows.push(['Commodity / Description', s(quote.description || quote.commodity) || '-']);
  detailRows.push(['Packages', quote.packages ? String(quote.packages) : '-']);

  if (isSea) {
    detailRows.push(['Total Volume', quote.total_cbm ? parseFloat(quote.total_cbm).toFixed(2) + ' CBM' : '-']);
    detailRows.push(['Total Weight', quote.total_weight ? parseFloat(quote.total_weight).toFixed(2) + ' kg' : '-']);
  } else {
    detailRows.push(['Total Weight', quote.total_weight ? parseFloat(quote.total_weight).toFixed(2) + ' kg' : '-']);
  }
  detailRows.push(['Packaging Type', s(quote.packaging_type) || '-']);
  detailRows.push(['Dimensions', s(quote.dimensions) || '-']);
  if (quote.hs_code) detailRows.push(['HS Code', s(quote.hs_code)]);

  const detailBlockH = detailRows.length * rowH + 12;
  page.drawRectangle({ x: LEFT, y: y - detailBlockH, width: CONTENT_W, height: detailBlockH, color: LIGHT });

  curY = y;
  detailRows.forEach(([label, val]) => {
    page.drawText(label + ':', { x: LEFT + 10, y: curY - 12, size: 9, font: fontBold, color: GRAY });
    page.drawText(truncate(val, 60), { x: LEFT + 170, y: curY - 12, size: 9, font, color: BLACK });
    curY -= rowH;
  });

  y -= detailBlockH + 18;

  /* ---------- PRICING BREAKDOWN ---------- */
  drawSectionHeader(page, LEFT, y, CONTENT_W, 'PRICING BREAKDOWN', fontBold, ACCENT);
  y -= 22;

  const currency = String(quote.currency || 'USD').toUpperCase();
  const rate = parseFloat(quote.rate) || 0;
  const rateUnit = isSea ? 'CBM' : 'kg';
  const qty = isSea ? (parseFloat(quote.total_cbm) || 0) : (parseFloat(quote.total_weight) || 0);

  const pricingLines = [];
  pricingLines.push({
    label: isSea ? 'Sea Freight' : 'Air Freight',
    detail: qty.toFixed(2) + ' ' + rateUnit + '  \u00D7  ' + currency + ' ' + rate.toFixed(2) + ' / ' + rateUnit,
    amount: parseFloat(quote.freight_total) || (qty * rate),
  });
  if (parseFloat(quote.pickup_charge) > 0) {
    pricingLines.push({ label: 'Pickup Charge', detail: '', amount: parseFloat(quote.pickup_charge) });
  }
  if (parseFloat(quote.customs_charge) > 0) {
    pricingLines.push({ label: 'Customs Clearance', detail: '', amount: parseFloat(quote.customs_charge) });
  }
  if (parseFloat(quote.delivery_charge) > 0) {
    pricingLines.push({ label: 'Delivery Charge', detail: '', amount: parseFloat(quote.delivery_charge) });
  }
  const addlLines = Array.isArray(quote.additional_lines) ? quote.additional_lines : [];
  addlLines.forEach((l) => {
    if (l && (l.label || parseFloat(l.amount) > 0)) {
      pricingLines.push({
        label: String(l.label || 'Additional').trim(),
        detail: '',
        amount: parseFloat(l.amount) || 0,
      });
    }
  });

  page.drawRectangle({ x: LEFT, y: y - 18, width: CONTENT_W, height: 18, color: ACCENT });
  page.drawText('ITEM', { x: LEFT + 10, y: y - 13, size: 8, font: fontBold, color: WHITE });
  page.drawText('DETAIL', { x: LEFT + 180, y: y - 13, size: 8, font: fontBold, color: WHITE });
  page.drawText('AMOUNT', { x: LEFT + CONTENT_W - 100, y: y - 13, size: 8, font: fontBold, color: WHITE });
  y -= 18;

  pricingLines.forEach((line, i) => {
    const bg = i % 2 === 0 ? WHITE : LIGHT;
    page.drawRectangle({ x: LEFT, y: y - 20, width: CONTENT_W, height: 20, color: bg });
    page.drawText(truncate(line.label, 40), { x: LEFT + 10, y: y - 13, size: 9, font: fontBold, color: BLACK });
    if (line.detail) {
      page.drawText(line.detail, { x: LEFT + 180, y: y - 13, size: 9, font, color: GRAY });
    }
    const amtText = currency + ' ' + line.amount.toFixed(2);
    const amtW = font.widthOfTextAtSize(amtText, 9);
    page.drawText(amtText, { x: LEFT + CONTENT_W - 10 - amtW, y: y - 13, size: 9, font, color: BLACK });
    y -= 20;
  });

  const subtotal = parseFloat(quote.subtotal) || pricingLines.reduce((sum, l) => sum + l.amount, 0);
  page.drawLine({ start: { x: LEFT, y: y - 2 }, end: { x: LEFT + CONTENT_W, y: y - 2 }, thickness: 0.5, color: GRAY_LIGHT });
  y -= 6;
  page.drawText('Subtotal', { x: LEFT + 10, y: y - 12, size: 10, font: fontBold, color: GRAY });
  const subText = currency + ' ' + subtotal.toFixed(2);
  const subW = fontBold.widthOfTextAtSize(subText, 10);
  page.drawText(subText, { x: LEFT + CONTENT_W - 10 - subW, y: y - 12, size: 10, font: fontBold, color: BLACK });
  y -= 24;

  const total = parseFloat(quote.total) || subtotal;
  page.drawRectangle({ x: LEFT, y: y - 50, width: CONTENT_W, height: 50, color: ACCENT });
  page.drawText('TOTAL QUOTE', { x: LEFT + 15, y: y - 20, size: 11, font: fontBold, color: WHITE });
  page.drawText('All-in estimated price', { x: LEFT + 15, y: y - 36, size: 8, font, color: rgb(1, 0.95, 0.9) });
  const totalText = currency + ' ' + total.toFixed(2);
  const totalW = fontBold.widthOfTextAtSize(totalText, 20);
  page.drawText(totalText, { x: LEFT + CONTENT_W - 15 - totalW, y: y - 32, size: 20, font: fontBold, color: WHITE });
  y -= 50;

  y -= 20;

  /* ---------- LEAD / TRANSIT TIME ---------- */
  const timeValue = isSea ? quote.transit_time : quote.lead_time;
  const timeLabel = isSea ? 'TRANSIT TIME' : 'LEAD TIME';
  if (timeValue) {
    page.drawText(timeLabel, { x: LEFT, y: y - 10, size: 8, font: fontBold, color: ACCENT });
    page.drawText(s(timeValue), { x: LEFT + 110, y: y - 10, size: 10, font: fontBold, color: BLACK });
    y -= 22;
  }

  /* ---------- NOTES ---------- */
  if (quote.notes) {
    page.drawText('NOTES', { x: LEFT, y: y - 10, size: 8, font: fontBold, color: ACCENT });
    const notesLines = wrapText(quote.notes, 78);
    notesLines.forEach((line, i) => {
      page.drawText(line, { x: LEFT + 110, y: y - 10 - i * 11, size: 9, font, color: BLACK });
    });
    y -= (notesLines.length * 11) + 14;
  }

  /* ---------- TERMS ---------- */
  if (quote.terms && y > CONTENT_FLOOR_Y + 60) {
    const termsLines = wrapText(quote.terms, 100);
    const termsBlockH = termsLines.length * 11 + 26;
    if (y - termsBlockH > CONTENT_FLOOR_Y) {
      page.drawRectangle({ x: LEFT, y: y - termsBlockH, width: CONTENT_W, height: termsBlockH, color: ACCENT_SOFT });
      page.drawRectangle({ x: LEFT, y: y - termsBlockH, width: 4, height: termsBlockH, color: ACCENT });
      page.drawText('TERMS & CONDITIONS', { x: LEFT + 14, y: y - 14, size: 8, font: fontBold, color: ACCENT });
      termsLines.forEach((line, i) => {
        page.drawText(line, { x: LEFT + 14, y: y - 28 - i * 11, size: 8.5, font, color: rgb(0.25, 0.25, 0.25) });
      });
      y -= termsBlockH + 12;
    }
  }

  /* ---------- CONTACT FOOTER ---------- */
  let qrImage = null;
  if (c.company_wechat_qr_url) {
    const qrData = await fetchQRImageBytes(c.company_wechat_qr_url);
    if (qrData) {
      qrImage = await embedQRImage(pdfDoc, qrData);
    }
  }

  drawContactFooter(page, {
    contact: c, font, fontBold,
    pageWidth: width,
    footerHeight: FOOTER_H,
    includeQR: true,
    qrImage,
    brandIcons,
  });

  /* ---------- LEGAL STRIP ---------- */
  drawLegalStrip(page, {
    font,
    pageWidth: width,
    footerHeight: FOOTER_H,
    lines: [
      { text: 'This quote is an estimate only and does not constitute a confirmed booking.', size: 7 },
      { text: 'Issued on ' + fmtDateTimeGMT(quote.created_at || new Date().toISOString()) + ' GMT | (c) sXL - Super Express Logistics Center | ' + s(quote.quote_number || ''), size: 6.5 },
    ],
  });

  return await pdfDoc.save();
}
