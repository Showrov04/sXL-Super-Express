import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

const ORANGE = rgb(1, 0.42, 0);
const NAVY = rgb(0, 0.2, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT = rgb(0.96, 0.97, 0.98);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.1, 0.1, 0.1);

function sanitizeForPDF(text) {
  if (text === null || text === undefined) return '';
  let out = String(text);
  out = out.replace(/↔/g, '<->');
  out = out.replace(/→/g, '->');
  out = out.replace(/[–—]/g, '-');
  out = out.replace(/['']/g, "'");
  out = out.replace(/[""]/g, '"');
  out = out.replace(/…/g, '...');
  out = out.replace(/[^\x00-\xFF]/g, '?');
  return out;
}

function countryName(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || code;
}

function buildShipmentType(shipment) {
  const mode = String(shipment.ship_mode || '').toUpperCase();
  const load = String(shipment.sea_load_type || '').toUpperCase();
  if (mode === 'SEA') return load ? ('SEA - ' + load) : 'SEA';
  if (mode === 'AIR') return 'AIR';
  return mode || '-';
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

function truncate(str, maxLen) {
  const v = sanitizeForPDF(String(str || ''));
  if (v.length <= maxLen) return v;
  return v.substring(0, maxLen - 1) + '…';
}

async function getSessionUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data: session } = await serviceSupabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!session) return null;
  const expiresAt = new Date(session.expires_at).getTime();
  if (isNaN(expiresAt) || expiresAt < Date.now()) return null;
  return { userId: session.user_id, role: session.role };
}

export async function GET(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return new NextResponse('Session expired.', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'customer';
    const tab = searchParams.get('tab') || 'active';
    const shipperFilter = (searchParams.get('shipper') || '').trim();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    if (scope === 'admin') {
      if (session.role !== 'admin' && session.role !== 'staff') {
        return new NextResponse('Permission denied.', { status: 403 });
      }
    }

    let query = serviceSupabase.from('shipments').select('*');
    if (scope === 'customer') {
      query = query.eq('booked_by', session.userId);
    }

    const { data: all, error } = await query.order('booked_at', { ascending: false });
    if (error) {
      return new NextResponse('DB error: ' + error.message, { status: 500 });
    }

    let filtered = (all || []).filter((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isCancelled = status === 'cancelled' || status.includes('cancellation');
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';

      if (tab === 'cancelled') return isCancelled;
      if (isCancelled) return false;

      if (tab === 'active') return !isDelivered;
      if (tab === 'awaiting') return isDelivered && !isPaid;
      if (tab === 'paid') return isDelivered && isPaid;
      return true;
    });

    if (shipperFilter) {
      const sf = shipperFilter.toLowerCase();
      filtered = filtered.filter((s) => String(s.sender_name || '').toLowerCase() === sf);
    }

    if (search) {
      filtered = filtered.filter((s) =>
        String(s.tracking_number || '').toLowerCase().includes(search) ||
        String(s.sender_name || '').toLowerCase().includes(search) ||
        String(s.recipient_name || '').toLowerCase().includes(search)
      );
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 842;
    const PAGE_H = 595;
    const MARGIN = 25;

    // Column definitions: [header, width, alignment]
    const cols = [
      { header: 'Tracking #', w: 90, align: 'left' },
      { header: 'Mode', w: 55, align: 'left' },
      { header: 'Route', w: 120, align: 'left' },
      { header: 'Shipper', w: 90, align: 'left' },
      { header: 'Recipient', w: 90, align: 'left' },
      { header: 'Status', w: 70, align: 'left' },
      { header: 'Bk.Wt', w: 45, align: 'left' },
      { header: 'Act.Wt', w: 45, align: 'left' },
      { header: 'Cost', w: 65, align: 'right' },
      { header: 'Payment', w: 55, align: 'left' },
      { header: 'Booked', w: 55, align: 'left' },
      { header: 'ETA', w: 55, align: 'left' },
    ];

    const tableW = cols.reduce((sum, c) => sum + c.w, 0);
    const totalW = PAGE_W - MARGIN * 2;

    // Adjust widths proportionally if needed
    const scale = totalW / tableW;
    cols.forEach((c) => { c.w = c.w * scale; });

    const ROW_H = 16;
    const HEADER_H = 20;
    const TOP_BANNER_H = 40;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    // ===== Header Banner =====
    page.drawRectangle({ x: MARGIN, y: y - TOP_BANNER_H, width: totalW, height: TOP_BANNER_H, color: ORANGE });
    page.drawText('SUPER EXPRESS', { x: MARGIN + 10, y: y - 16, size: 12, font: fontBold, color: WHITE });
    page.drawText('SHIPMENTS REPORT', { x: MARGIN + 10, y: y - 30, size: 9, font: fontBold, color: WHITE });

    // Tab label right-aligned
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1) + ' Shipments';
    const tabLabelW = fontBold.widthOfTextAtSize(tabLabel, 11);
    page.drawText(tabLabel, { x: PAGE_W - MARGIN - 10 - tabLabelW, y: y - 16, size: 11, font: fontBold, color: WHITE });

    const countLabel = filtered.length + ' shipment' + (filtered.length !== 1 ? 's' : '');
    const countLabelW = font.widthOfTextAtSize(countLabel, 9);
    page.drawText(countLabel, { x: PAGE_W - MARGIN - 10 - countLabelW, y: y - 30, size: 9, font, color: WHITE });

    y -= TOP_BANNER_H + 10;

    // ===== Draw table header =====
    function drawTableHeader() {
      page.drawRectangle({ x: MARGIN, y: y - HEADER_H, width: totalW, height: HEADER_H, color: NAVY });
      let x = MARGIN;
      cols.forEach((c) => {
        page.drawText(c.header, { x: x + 4, y: y - 14, size: 8, font: fontBold, color: WHITE });
        x += c.w;
      });
      y -= HEADER_H;
    }

    drawTableHeader();

    // ===== Draw rows =====
    filtered.forEach((s, idx) => {
      // New page if needed
      if (y - ROW_H < MARGIN + 30) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        // Re-draw banner on new page
        page.drawRectangle({ x: MARGIN, y: y - TOP_BANNER_H, width: totalW, height: TOP_BANNER_H, color: ORANGE });
        page.drawText('SUPER EXPRESS', { x: MARGIN + 10, y: y - 16, size: 12, font: fontBold, color: WHITE });
        page.drawText('SHIPMENTS REPORT (continued)', { x: MARGIN + 10, y: y - 30, size: 9, font: fontBold, color: WHITE });
        y -= TOP_BANNER_H + 10;
        drawTableHeader();
      }

      const rowBg = idx % 2 === 0 ? WHITE : LIGHT;
      page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: totalW, height: ROW_H, color: rowBg });

      const cost = parseFloat(s.shipping_cost) || 0;
      const values = [
        truncate(s.tracking_number, 20),
        truncate(buildShipmentType(s), 12),
        truncate(countryName(s.origin) + ' -> ' + countryName(s.destination), 24),
        truncate(s.sender_name, 20),
        truncate(s.recipient_name, 20),
        truncate(s.status, 14),
        s.total_weight ? (s.total_weight + 'kg') : '-',
        s.actual_weight ? (s.actual_weight + 'kg') : 'TBA',
        cost > 0 ? (cost.toFixed(2) + ' ' + (s.currency || 'USD')) : 'TBA',
        truncate(s.payment_status || 'Unpaid', 10),
        fmtDate(s.booked_at).slice(0, 10),
        s.estimated_delivery ? fmtDate(s.estimated_delivery).slice(0, 10) : 'Pending',
      ];

      let x = MARGIN;
      values.forEach((val, i) => {
        const c = cols[i];
        let drawX = x + 4;
        if (c.align === 'right') {
          const w = font.widthOfTextAtSize(val, 8);
          drawX = x + c.w - 4 - w;
        }
        page.drawText(val, { x: drawX, y: y - 11, size: 8, font, color: BLACK });
        x += c.w;
      });

      y -= ROW_H;
    });

    // ===== Footer note =====
    y -= 15;
    if (y > MARGIN) {
      page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT | (c) sXL - Super Express Logistics Center', {
        x: MARGIN, y, size: 7, font, color: GRAY,
      });
    }

    const pdfBytes = await pdfDoc.save();

    const safeTab = tab.replace(/[^a-z]/gi, '-');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `sxl-${safeTab}-${dateStr}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (err) {
    return new NextResponse('Export failed: ' + err.message, { status: 500 });
  }
}
