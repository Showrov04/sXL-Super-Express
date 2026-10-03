import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
  return mode || '—';
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
      return NextResponse.json(
        { success: false, error: 'Session expired.' },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'active';

    const { data: all, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('booked_by', session.userId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const shipments = all || [];

    shipments.sort((a, b) => {
      const da = new Date(a.booked_at || 0).getTime() || 0;
      const db = new Date(b.booked_at || 0).getTime() || 0;
      return db - da;
    });

    const counts = { active: 0, awaiting: 0, paid: 0, cancelled: 0, total: shipments.length };
    shipments.forEach((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isCancelled = status === 'cancelled' || status.includes('cancellation');
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';
      if (isCancelled) { counts.cancelled++; return; }
      if (!isDelivered) counts.active++;
      else if (!isPaid) counts.awaiting++;
      else counts.paid++;
    });

    const filtered = shipments.filter((s) => {
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

    const list = filtered.map((s) => {
      const cost = parseFloat(s.shipping_cost) || 0;
      return {
        trackingNumber: s.tracking_number,
        shipMode: s.ship_mode,
        seaLoadType: s.sea_load_type || null,
        shipmentType: buildShipmentType(s),
        serviceType: s.service_type,
        status: s.status,
        origin: countryName(s.origin),
        destination: countryName(s.destination),
        senderName: s.sender_name,
        recipientName: s.recipient_name,
        bookingWeight: s.total_weight,
        actualWeight: s.actual_weight,
        weight: s.total_weight,
        shippingCost: cost > 0 ? cost : null,
        cost: cost > 0 ? cost : null,
        currency: s.currency || 'USD',
        paymentStatus: s.payment_status,
        bookedAt: s.booked_at,
        estimatedDelivery: s.estimated_delivery,
        lastUpdate: s.last_update,
        pdfUrl: s.pdf_url,
        originCountry: s.origin_country || null,
        freightBillTo: s.freight_bill_to || null,
        dutyTaxBillTo: s.duty_tax_bill_to || null,
        // NEW
        customService: s.custom_service || null,
        deliveryService: s.delivery_service || null,
        uploadedDocuments: s.uploaded_documents || null,
      };
    });

    const activeShipments = filtered.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      return status !== 'delivered' && status !== 'cancelled';
    });
    const activeBillingTotal = activeShipments.reduce((sum, s) => {
      return sum + (parseFloat(s.shipping_cost) || 0);
    }, 0);

    const paidShipments = shipments.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      return status === 'delivered' && payment === 'paid';
    });
    const totalPaid = paidShipments.reduce((sum, s) => {
      return sum + (parseFloat(s.shipping_cost) || 0);
    }, 0);

    const summary = {
      activeBilling: {
        total: Math.round(activeBillingTotal * 100) / 100,
        currency: 'USD',
        count: activeShipments.length,
      },
      totalPaid: {
        total: Math.round(totalPaid * 100) / 100,
        currency: 'USD',
        count: paidShipments.length,
      },
    };

    let outstanding = null;
    if (tab === 'awaiting') {
      let total = 0;
      const items = filtered.map((s) => {
        const cost = parseFloat(s.shipping_cost) || 0;
        total += cost;
        let breakdown = null;
        try {
          if (s.cost_breakdown) {
            breakdown = typeof s.cost_breakdown === 'string' ? JSON.parse(s.cost_breakdown) : s.cost_breakdown;
          }
        } catch (e) { breakdown = null; }
        return {
          trackingNumber: s.tracking_number,
          recipientName: s.recipient_name,
          destination: countryName(s.destination),
          deliveredAt: s.last_update,
          cost,
          currency: s.currency || 'USD',
          breakdown,
        };
      });
      outstanding = { total: Math.round(total * 100) / 100, currency: 'USD', count: items.length, items };
    }

    return NextResponse.json(
      { success: true, shipments: list, counts, outstanding, summary },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    );

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
