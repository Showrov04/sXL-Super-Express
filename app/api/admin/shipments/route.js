import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'active';
    const shipperFilter = (searchParams.get('shipper') || '').trim();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const { data: all, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .order('booked_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    const counts = { active: 0, awaiting: 0, paid: 0, cancelled: 0, total: all.length };
    all.forEach((s) => {
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

    let filtered = all.filter((s) => {
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
      filtered = filtered.filter((s) => {
        return (
          String(s.tracking_number || '').toLowerCase().includes(search) ||
          String(s.sender_name || '').toLowerCase().includes(search) ||
          String(s.recipient_name || '').toLowerCase().includes(search) ||
          String(s.sender_email || '').toLowerCase().includes(search)
        );
      });
    }

    const shipments = filtered.map((s) => {
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
        senderEmail: s.sender_email,
        recipientName: s.recipient_name,
        bookingWeight: s.total_weight,
        actualWeight: s.actual_weight,
        weight: s.total_weight,
        shippingCost: cost > 0 ? cost : null,
        currency: s.currency || 'USD',
        paymentStatus: s.payment_status,
        paymentMethod: s.payment_method,
        paymentTerms: s.payment_terms,
        estimatedDelivery: s.estimated_delivery,
        bookedAt: s.booked_at,
        lastUpdate: s.last_update,
        pickupService: s.pickup_service,
        originCountry: s.origin_country || null,
        freightBillTo: s.freight_bill_to || null,
        dutyTaxBillTo: s.duty_tax_bill_to || null,
        // NEW
        customService: s.custom_service || null,
        deliveryService: s.delivery_service || null,
        uploadedDocuments: s.uploaded_documents || null,
      };
    });

    const billedTotal = filtered.reduce((sum, s) => {
      return sum + (parseFloat(s.shipping_cost) || 0);
    }, 0);

    const uniqueShippers = [...new Set(filtered.map((s) => s.sender_name).filter(Boolean))].sort();

    const summary = {
      total: Math.round(billedTotal * 100) / 100,
      currency: 'USD',
      count: filtered.length,
      shippers: uniqueShippers,
    };

    return NextResponse.json({
      success: true,
      shipments,
      counts,
      summary,
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const body = await request.json();
    const { trackingNumber, newStatus, location, notes, eta } = body;

    if (!trackingNumber || !newStatus) {
      return NextResponse.json({ success: false, error: 'Tracking number and status required.' });
    }

    const updateData = {
      status: newStatus,
      last_update: new Date().toISOString(),
    };
    if (eta) updateData.estimated_delivery = eta;

    const { error: updateErr } = await serviceSupabase
      .from('shipments')
      .update(updateData)
      .eq('tracking_number', trackingNumber);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message });
    }

    await serviceSupabase.from('tracking_history').insert({
      tracking_number: trackingNumber,
      status: newStatus,
      location: location || '',
      notes: notes || '',
      updated_by: session.userId,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
