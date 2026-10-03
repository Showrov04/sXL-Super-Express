import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STATUS_FLOW = ['Booked', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

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

function getCountryName(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || code;
}

function getStatusIndex(status) {
  const s = String(status || '').toLowerCase();
  const normalized = s === 'pending' ? 'booked'
    : (s === 'shipped' || s === 'picked') ? 'picked up' : s;
  for (let i = 0; i < STATUS_FLOW.length; i++) {
    if (STATUS_FLOW[i].toLowerCase() === normalized) return i;
  }
  if (s.includes('exception') || s.includes('failed') || s.includes('returned')) return -2;
  return -1;
}

// Build a display label: "SEA - LCL", "AIR - Document", "AIR - Special Parcel | Timeline: ..."
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
  return mode || '—';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tn = (searchParams.get('tn') || '').trim().toUpperCase();

    if (!tn) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }

    const { data: shipment, error: shipErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', tn)
      .maybeSingle();

    if (shipErr) {
      return NextResponse.json({ success: false, error: shipErr.message });
    }
    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Tracking number not found.' });
    }

    const { data: history } = await serviceSupabase
      .from('tracking_history')
      .select('*')
      .eq('tracking_number', tn)
      .order('timestamp', { ascending: false });

    const currentStatusIndex = getStatusIndex(shipment.status);
    const isException = currentStatusIndex === -2;

    const stepper = STATUS_FLOW.map((status, idx) => {
      let state = 'pending';
      if (isException) {
        if (idx < 1) state = 'done';
      } else if (currentStatusIndex >= 0) {
        if (idx < currentStatusIndex) state = 'done';
        else if (idx === currentStatusIndex) state = 'active';
      }
      return { label: status, state, index: idx };
    });

    // Shipment type (new)
    const shipmentType = buildShipmentType(shipment);

    // Delivery timeline (Special Parcel only)
    const deliveryTimeline = (shipment.parcel_type === 'Special Parcel' && shipment.delivery_timeline)
      ? String(shipment.delivery_timeline).trim()
      : null;

    return NextResponse.json({
      success: true,
      shipment: {
        trackingNumber: shipment.tracking_number,
        serviceType: shipment.service_type,
        shipMode: shipment.ship_mode,
        seaLoadType: shipment.sea_load_type || null,
        shipmentType: shipmentType,
        parcelType: shipment.parcel_type || '',
        deliveryTimeline: deliveryTimeline,
        status: shipment.status,
        origin: getCountryName(shipment.origin),
        destination: getCountryName(shipment.destination),
        shipperName: shipment.sender_name,
        shipperPhone: shipment.sender_phone,
        shipperEmail: shipment.sender_email,
        recipientName: shipment.recipient_name,
        recipientPhone: shipment.recipient_phone,
        recipientEmail: shipment.recipient_email,
        recipientBIN: shipment.recipient_bin,
        weight: shipment.total_weight,
        packages: shipment.packages,
        description: shipment.description,
        estimatedDelivery: shipment.estimated_delivery,
        lastUpdate: shipment.last_update,
        bookedAt: shipment.booked_at,
      },
      stepper,
      isException,
      history: (history || []).map((h) => ({
        status: h.status,
        location: h.location,
        timestamp: h.timestamp,
        notes: h.notes,
        updatedBy: h.updated_by,
      })),
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
