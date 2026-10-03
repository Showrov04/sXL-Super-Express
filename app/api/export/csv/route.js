import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Escape a CSV field
function csvField(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function fmtDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return ''; }
}

export async function GET(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return new NextResponse('Session expired.', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'customer'; // 'customer' | 'admin'
    const tab = searchParams.get('tab') || 'active';
    const shipperFilter = (searchParams.get('shipper') || '').trim();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // Admin check for admin scope
    if (scope === 'admin') {
      if (session.role !== 'admin' && session.role !== 'staff') {
        return new NextResponse('Permission denied.', { status: 403 });
      }
    }

    // Fetch shipments
    let query = serviceSupabase.from('shipments').select('*');

    if (scope === 'customer') {
      query = query.eq('booked_by', session.userId);
    }

    const { data: all, error } = await query.order('booked_at', { ascending: false });

    if (error) {
      return new NextResponse('DB error: ' + error.message, { status: 500 });
    }

    // Filter by tab
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

    // Shipper filter (admin)
    if (shipperFilter) {
      const sf = shipperFilter.toLowerCase();
      filtered = filtered.filter((s) => String(s.sender_name || '').toLowerCase() === sf);
    }

    // Search
    if (search) {
      filtered = filtered.filter((s) =>
        String(s.tracking_number || '').toLowerCase().includes(search) ||
        String(s.sender_name || '').toLowerCase().includes(search) ||
        String(s.recipient_name || '').toLowerCase().includes(search)
      );
    }

    // Build CSV
    const headers = [
      'Tracking #', 'Mode', 'Route', 'Shipper', 'Recipient', 'Status',
      'Booking Wt', 'Actual Wt', 'Cost', 'Payment', 'Booked', 'ETA'
    ];

    const rows = [headers.map(csvField).join(',')];

    filtered.forEach((s) => {
      const cost = parseFloat(s.shipping_cost) || 0;
      const row = [
        s.tracking_number || '',
        buildShipmentType(s),
        (countryName(s.origin) || '') + ' → ' + (countryName(s.destination) || ''),
        s.sender_name || '',
        s.recipient_name || '',
        s.status || '',
        s.total_weight ? (s.total_weight + ' kg') : '',
        s.actual_weight ? (s.actual_weight + ' kg') : 'TBA',
        cost > 0 ? (cost.toFixed(2) + ' ' + (s.currency || 'USD')) : 'TBA',
        s.payment_status || 'Unpaid',
        fmtDate(s.booked_at),
        s.estimated_delivery ? fmtDate(s.estimated_delivery) : 'Pending',
      ];
      rows.push(row.map(csvField).join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\r\n'); // BOM for Excel compatibility

    // Filename
    const safeTab = tab.replace(/[^a-z]/gi, '-');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `sxl-${safeTab}-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (err) {
    return new NextResponse('Export failed: ' + err.message, { status: 500 });
  }
}
