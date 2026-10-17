import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMonthlySummaryPDF } from '@/lib/pdf-summary';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const COMPANY_KEYS = [
  'company_phone',
  'company_email',
  'company_website',
  'company_wechat',
  'company_whatsapp',
  'company_wechat_qr_url',
];

async function loadCompanyContact() {
  try {
    const { data: rows } = await serviceSupabase
      .from('settings')
      .select('key, value')
      .in('key', COMPANY_KEYS);

    const map = {};
    (rows || []).forEach((r) => { map[r.key] = r.value; });

    const out = {};
    COMPANY_KEYS.forEach((k) => {
      out[k] = (map[k] === null || map[k] === undefined) ? '' : map[k];
    });
    return out;
  } catch (e) {
    console.error('[PDF Summary] Contact load failed:', e.message);
    return {};
  }
}

async function requireAdmin(request) {
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

  if (session.role !== 'admin' && session.role !== 'staff') return null;

  return { userId: session.user_id, role: session.role };
}

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
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
};

function countryName(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || code;
}

function buildShipmentType(shipment) {
  const mode = String(shipment.ship_mode || '').toUpperCase();
  const load = String(shipment.sea_load_type || '').toUpperCase();
  const pType = String(shipment.parcel_type || '').trim();
  const pCustom = String(shipment.parcel_type_custom || '').trim();

  if (mode === 'SEA') return load ? ('SEA - ' + load) : 'SEA';
  if (mode === 'AIR') {
    let p = pType;
    if (p === 'Others' && pCustom) p = 'Others: ' + pCustom;
    return p ? ('AIR - ' + p) : 'AIR';
  }
  return mode || '—';
}

function monthLabel(m) {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return m || '-';
  const [y, mo] = m.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const idx = parseInt(mo, 10) - 1;
  return (months[idx] || mo) + ' ' + y;
}

function formatDateForCsv(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toISOString().split('T')[0];
  } catch (e) { return ''; }
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return '"' + str.replace(/"/g, '""') + '"';
}

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return new NextResponse('Permission denied.', {
        status: 403,
        headers: NO_CACHE_HEADERS,
      });
    }

    const { searchParams } = new URL(request.url);
    const shipperName = String(searchParams.get('shipper') || '').trim();
    const month = String(searchParams.get('month') || '').trim();
    const format = String(searchParams.get('format') || 'pdf').toLowerCase();

    if (!shipperName || !month) {
      return new NextResponse('Shipper and month are required.', {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new NextResponse('Invalid month format. Expected YYYY-MM.', {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    const { data: invoices, error: invErr } = await serviceSupabase
      .from('invoices')
      .select('*')
      .ilike('shipper_name', shipperName)
      .order('issue_date', { ascending: true });

    if (invErr) {
      return new NextResponse('Database error: ' + invErr.message, {
        status: 500,
        headers: NO_CACHE_HEADERS,
      });
    }

    const allInvoices = invoices || [];
    const allTns = new Set();

    allInvoices.forEach((inv) => {
      const list = String(inv.tracking_numbers || '').split(',').map((t) => t.trim()).filter(Boolean);
      list.forEach((tn) => allTns.add(tn));
    });

    if (allTns.size === 0) {
      return new NextResponse('No invoices found for this shipper.', {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    const tnArray = Array.from(allTns);

    const { data: shipments, error: shipErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .in('tracking_number', tnArray);

    if (shipErr) {
      return new NextResponse('Database error: ' + shipErr.message, {
        status: 500,
        headers: NO_CACHE_HEADERS,
      });
    }

    const shipmentsByTn = {};
    (shipments || []).forEach((s) => { shipmentsByTn[s.tracking_number] = s; });

    const monthShipments = [];
    tnArray.forEach((tn) => {
      const s = shipmentsByTn[tn];
      if (!s) return;
      const dateForMonth = s.shipment_date || s.booked_at;
      if (!dateForMonth) return;
      const d = new Date(dateForMonth);
      if (isNaN(d.getTime())) return;
      const sMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (sMonth === month) {
        monthShipments.push(s);
      }
    });

    if (monthShipments.length === 0) {
      return new NextResponse('No shipments found for ' + shipperName + ' in ' + monthLabel(month), {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    const invoiceByTn = {};
    allInvoices.forEach((inv) => {
      const list = String(inv.tracking_numbers || '').split(',').map((t) => t.trim()).filter(Boolean);
      list.forEach((tn) => {
        if (!invoiceByTn[tn] || inv.type === 'individual') {
          invoiceByTn[tn] = {
            invoiceNumber: inv.invoice_number,
            invoiceType: inv.type,
            invoiceId: inv.invoice_id,
          };
        }
      });
    });
    const shipperAccount = monthShipments.length > 0 ? (monthShipments[0].booked_by || '') : '';
    let localTotal = 0;
    let localCurrency = '';

    const rows = monthShipments.map((s) => {
      const inv = invoiceByTn[s.tracking_number] || {};
      const amount = parseFloat(s.shipping_cost) || 0;
      
      let locAmt = 0;
      let locCur = '';
      try {
        const bd = s.cost_breakdown;
        if (bd) {
          const parsed = typeof bd === 'string' ? JSON.parse(bd) : bd;
          locAmt = parseFloat(parsed.localAmount) || 0;
          locCur = String(parsed.localCurrency || '').trim().toUpperCase();
        }
      } catch(e) {}
      
      if (locAmt > 0 && locCur) {
        if (!localCurrency) localCurrency = locCur;
        if (locCur === localCurrency) {
          localTotal += locAmt;
        }
      }

      return {
        shipperRef: s.shipper_ref || '',
        shipmentDate: s.shipment_date || s.booked_at,
        trackingNumber: s.tracking_number,
        mode: buildShipmentType(s),
        route: (countryName(s.origin) || '-') + ' -> ' + (countryName(s.destination) || '-'),
        recipient: s.recipient_name || '',
        actualWeight: s.actual_weight || 0,
        actualCbm: (String(s.ship_mode || '').toUpperCase() === 'SEA') ? (parseFloat(s.total_cbm) || 0) : 0,
        amount,
        currency: s.currency || 'USD',
        invoiceNumber: inv.invoiceNumber || '',
        invoiceType: inv.invoiceType || '',
      };
    });

    rows.sort((a, b) => {
      const da = new Date(a.shipmentDate || 0).getTime() || 0;
      const db = new Date(b.shipmentDate || 0).getTime() || 0;
      return da - db;
    });

    localTotal = Math.round(localTotal * 100) / 100;
    const total = Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
    const uniqueInvoiceNumbers = new Set(rows.map((r) => r.invoiceNumber).filter(Boolean));
    const invoiceCount = uniqueInvoiceNumbers.size;

    const safeShipper = shipperName.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (format === 'csv') {
      const headers = [
        'Shipper Ref', 'Shipment Date', 'Tracking #', 'Mode', 'Route', 
        'Recipient', 'Invoice #', 'Weight (kg)', 'CBM', 'Amount', 'Currency'
      ];
      let csv = headers.map(escapeCsv).join(',') + '\n';

      rows.forEach(r => {
        const rowData = [
          r.shipperRef,
          formatDateForCsv(r.shipmentDate),
          r.trackingNumber,
          r.mode,
          r.route,
          r.recipient,
          r.invoiceNumber,
          r.actualWeight,
          r.actualCbm > 0 ? r.actualCbm : '',
          r.amount.toFixed(2),
          r.currency
        ];
        csv += rowData.map(escapeCsv).join(',') + '\n';
      });

      csv += [
        'Total USD', '', '', '', '', '', '', '', '',
        total.toFixed(2),
        'USD'
      ].map(escapeCsv).join(',') + '\n';

      if (localCurrency && localTotal > 0) {
        csv += [
          'Total Local', '', '', '', '', '', '', '', '',
          localTotal.toFixed(2),
          localCurrency
        ].map(escapeCsv).join(',') + '\n';
      }

      const filename = 'sXL_Monthly_Summary_' + safeShipper + '_' + month + '.csv';
      const buffer = Buffer.from('\uFEFF' + csv, 'utf-8');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          ...NO_CACHE_HEADERS,
        },
      });
    }

    const contact = await loadCompanyContact();
        const summary = {
      shipperName,
      shipperAccount,
      month,
      monthLabel: monthLabel(month),
      generatedAt: new Date().toISOString(),
      currency: 'USD',
      total,
      localCurrency,
      localTotal,
      invoiceCount,
      rows,
    };

    const pdfBytes = await generateMonthlySummaryPDF(summary, contact);
    const filename = 'sXL_Monthly_Summary_' + safeShipper + '_' + month + '.pdf';

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        ...NO_CACHE_HEADERS,
      },
    });

  } catch (err) {
    console.error('[Summary API] Exception:', err.message);
    return new NextResponse('Summary generation failed: ' + err.message, {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
