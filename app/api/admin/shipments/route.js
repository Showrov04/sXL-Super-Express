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

/* ============================================================
 *  G.52 — Status-based sort for the Active tab (and customer side)
 *
 *  Primary key:   status rank (Booked → Picked Up → In Transit →
 *                 Out for Delivery → Cancellation Requested → Exception)
 *  Secondary key: mode rank  (AIR-SP → AIR → SEA)
 *  Tiebreaker:    booked_at DESC (newest first)
 * ============================================================ */
const STATUS_RANK = {
  'booked': 1,
  'picked up': 2,
  'in transit': 3,
  'out for delivery': 4,
  'cancellation requested': 5,
  'exception': 6,
};

const MODE_RANK = {
  'AIR-SP': 1,   // Special Parcel
  'AIR': 2,
  'SEA': 3,
};

function getStatusRank(status) {
  const s = String(status || '').toLowerCase().trim();
  if (STATUS_RANK[s] !== undefined) return STATUS_RANK[s];
  // Unknown status → push to end
  return 99;
}

function getModeRank(shipment) {
  const mode = String(shipment.ship_mode || '').toUpperCase();
  const pType = String(shipment.parcel_type || '').trim();
  if (mode === 'AIR' && pType === 'Special Parcel') return MODE_RANK['AIR-SP'];
  if (mode === 'AIR') return MODE_RANK['AIR'];
  if (mode === 'SEA') return MODE_RANK['SEA'];
  return 99;
}

function sortByStatusThenModeThenBooked(list) {
  return list.slice().sort((a, b) => {
    const srA = getStatusRank(a.status);
    const srB = getStatusRank(b.status);
    if (srA !== srB) return srA - srB;

    const mrA = getModeRank(a);
    const mrB = getModeRank(b);
    if (mrA !== mrB) return mrA - mrB;

    const da = new Date(a.booked_at || 0).getTime() || 0;
    const db = new Date(b.booked_at || 0).getTime() || 0;
    return db - da;
  });
}

function sortByBookedDesc(list) {
  return list.slice().sort((a, b) => {
    const da = new Date(a.booked_at || 0).getTime() || 0;
    const db = new Date(b.booked_at || 0).getTime() || 0;
    return db - da;
  });
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

/* ============================================================
 *  G.16 — Field metadata for editBooking diffing
 * ============================================================ */
const EDITABLE_FIELDS = {
  shipperRef:         { dbKey: 'shipper_ref',            label: 'Shipper Reference',      public: false, kind: 'text' },
  shipmentDate:       { dbKey: 'shipment_date',          label: 'Shipment Date',          public: false, kind: 'date' },
  parcelType:         { dbKey: 'parcel_type',            label: 'Parcel Type',            public: true,  kind: 'text' },
  parcelTypeCustom:   { dbKey: 'parcel_type_custom',     label: 'Parcel Type (Custom)',   public: true,  kind: 'text' },
  deliveryTimeline:   { dbKey: 'delivery_timeline',      label: 'Delivery Timeline',      public: true,  kind: 'text' },
  originCountry:      { dbKey: 'origin_country',         label: 'Country of Origin',      public: true,  kind: 'text' },

  senderName:         { dbKey: 'sender_name',            label: 'Sender Name',            public: true,  kind: 'text' },
  senderPhone:        { dbKey: 'sender_phone',           label: 'Sender Phone',           public: true,  kind: 'text' },
  senderEmail:        { dbKey: 'sender_email',           label: 'Sender Email',           public: true,  kind: 'text' },

  recipientName:      { dbKey: 'recipient_name',         label: 'Recipient Name',         public: true,  kind: 'text' },
  recipientPhone:     { dbKey: 'recipient_phone',        label: 'Recipient Phone',        public: true,  kind: 'text' },
  recipientEmail:     { dbKey: 'recipient_email',        label: 'Recipient Email',        public: true,  kind: 'text' },
  recipientBin:       { dbKey: 'recipient_bin',          label: 'Recipient BIN',          public: true,  kind: 'text' },
  recipientAddress:   { dbKey: 'recipient_address',      label: 'Recipient Address',      public: true,  kind: 'text' },
  recipientCity:      { dbKey: 'recipient_city',         label: 'Recipient City',         public: true,  kind: 'text' },
  recipientState:     { dbKey: 'recipient_state',        label: 'Recipient State',        public: true,  kind: 'text' },

  description:        { dbKey: 'description',            label: 'Description',            public: true,  kind: 'text' },
  packages:           { dbKey: 'packages',               label: 'Packages',               public: true,  kind: 'int' },
  totalWeight:        { dbKey: 'total_weight',           label: 'Weight (kg)',            public: true,  kind: 'float' },
  totalCbm:           { dbKey: 'total_cbm',              label: 'Volume (CBM)',           public: true,  kind: 'float' },
  hsCode:             { dbKey: 'hs_code',                label: 'HS Code',                public: true,  kind: 'text' },
  dimLength:          { dbKey: 'dim_length',             label: 'Dimension Length (cm)',  public: true,  kind: 'float' },
  dimWidth:           { dbKey: 'dim_width',              label: 'Dimension Width (cm)',   public: true,  kind: 'float' },
  dimHeight:          { dbKey: 'dim_height',             label: 'Dimension Height (cm)',  public: true,  kind: 'float' },
  packagingType:      { dbKey: 'packaging_type',         label: 'Packaging Type',         public: true,  kind: 'text' },
  packagingTypeCustom:{ dbKey: 'packaging_type_custom',  label: 'Packaging Type (Custom)',public: true,  kind: 'text' },
  totalValue:         { dbKey: 'total_value',            label: 'Declared Value',         public: true,  kind: 'float' },
  valueCurrency:      { dbKey: 'value_currency',         label: 'Value Currency',         public: true,  kind: 'text' },

  pickupAddress:      { dbKey: 'pickup_address',         label: 'Pickup Address',         public: true,  kind: 'text' },
  pickupCity:         { dbKey: 'pickup_city',            label: 'Pickup City',            public: true,  kind: 'text' },
  pickupState:        { dbKey: 'pickup_state',           label: 'Pickup State',           public: true,  kind: 'text' },
  pickupCountry:      { dbKey: 'pickup_country',         label: 'Pickup Country',         public: true,  kind: 'text' },
  parcelReadyDate:    { dbKey: 'parcel_ready_date',      label: 'Parcel Ready Date',      public: true,  kind: 'date' },
  parcelReadyTime:    { dbKey: 'parcel_ready_time',      label: 'Parcel Ready Time',      public: true,  kind: 'time' },

  paymentTerms:       { dbKey: 'payment_terms',          label: 'Payment Terms',          public: false, kind: 'text' },
  paymentMethod:      { dbKey: 'payment_method',         label: 'Payment Method',         public: false, kind: 'text' },
  freightBillTo:      { dbKey: 'freight_bill_to',        label: 'Freight Bill To',        public: false, kind: 'text' },
  dutyTaxBillTo:      { dbKey: 'duty_tax_bill_to',       label: 'Duty & Tax Bill To',     public: false, kind: 'text' },

  customService:      { dbKey: 'custom_service',         label: 'Customs Clearance',      public: true,  kind: 'text' },
  deliveryService:    { dbKey: 'delivery_service',       label: 'Delivery Service',       public: true,  kind: 'text' },
  specialInstruction: { dbKey: 'special_instruction',    label: 'Special Instructions',   public: true,  kind: 'text' },
};

function normalizeValue(val, kind) {
  if (val === undefined || val === null || val === '') return null;
  if (kind === 'int') {
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }
  if (kind === 'float') {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  if (kind === 'date') {
    return String(val).slice(0, 10) || null;
  }
  if (kind === 'time') {
    return String(val).slice(0, 5) || null;
  }
  return String(val).trim() || null;
}

function valuesDiffer(a, b) {
  if (a === b) return false;
  if (a === null && b === null) return false;
  if (a === undefined && b === null) return false;
  if (a === null && b === undefined) return false;
  return String(a) !== String(b);
}

function prettyServiceValue(val) {
  const v = String(val || '').toLowerCase();
  if (v === 'sxl') return 'Handled by sXL';
  if (v === 'consignee') return 'Handled by Consignee';
  return val || '(none)';
}

function truncateVal(val, max = 40) {
  if (val === null || val === undefined) return '(empty)';
  const s = String(val);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function prettyValue(val, label) {
  if (val === null || val === undefined || val === '') return '(empty)';
  if (label === 'Customs Clearance' || label === 'Delivery Service') {
    return prettyServiceValue(val);
  }
  if (label === 'Weight (kg)' || label === 'Volume (CBM)') {
    return val + ' ' + (label === 'Weight (kg)' ? 'kg' : 'CBM');
  }
  if (label === 'Declared Value') {
    return String(val);
  }
  return truncateVal(val);
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

    // Counts — 'Cancellation Requested' counts as Active (pending decision),
    // only 'Cancelled' counts toward cancelled.
    const counts = { active: 0, awaiting: 0, paid: 0, cancelled: 0, total: all.length };
    all.forEach((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isCancelled = status === 'cancelled';
      const isPendingCancel = status.includes('cancellation');
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';

      if (isCancelled) { counts.cancelled++; return; }
      if (isPendingCancel) { counts.active++; return; }
      if (!isDelivered) counts.active++;
      else if (!isPaid) counts.awaiting++;
      else counts.paid++;
    });

    let filtered = all.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isCancelled = status === 'cancelled';
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

    // ============================================================
    //  G.52 — Sort
    //  Active tab → status → mode → booked_at DESC
    //  Other tabs → booked_at DESC (unchanged)
    // ============================================================
    if (tab === 'active') {
      filtered = sortByStatusThenModeThenBooked(filtered);
    } else {
      filtered = sortByBookedDesc(filtered);
    }

    const shipments = filtered.map((s) => {
      const cost = parseFloat(s.shipping_cost) || 0;
      return {
        trackingNumber: s.tracking_number,
        shortForm: s.short_form || null,
        shipMode: s.ship_mode,
        seaLoadType: s.sea_load_type || null,
        shipmentType: buildShipmentType(s),
        serviceType: s.service_type,
        status: s.status,
        origin: countryName(s.origin),
        destination: countryName(s.destination),
        originCode: s.origin || null,
        destinationCode: s.destination || null,
        senderName: s.sender_name,
        senderEmail: s.sender_email,
        senderPhone: s.sender_phone || null,
        recipientName: s.recipient_name,
        recipientEmail: s.recipient_email || null,
        recipientPhone: s.recipient_phone || null,
        recipientBin: s.recipient_bin || null,
        recipientAddress: s.recipient_address || null,
        recipientCity: s.recipient_city || null,
        recipientState: s.recipient_state || null,
        bookingWeight: s.total_weight,
        actualWeight: s.actual_weight,
        actualCbm: parseFloat(s.total_cbm) || null,
        bookingCbm: parseFloat(s.total_cbm) || null,
        weight: s.total_weight,
        shippingCost: cost > 0 ? cost : null,
        currency: s.currency || 'USD',
        paymentStatus: s.payment_status,
        paymentMethod: s.payment_method || null,
        paymentTerms: s.payment_terms || null,
        freightBillTo: s.freight_bill_to || null,
        dutyTaxBillTo: s.duty_tax_bill_to || null,
        estimatedDelivery: s.estimated_delivery,
        bookedAt: s.booked_at,
        lastUpdate: s.last_update,
        pickupService: s.pickup_service,
        pickupSameAsShipper: s.pickup_same_as_shipper,
        pickupAddress: s.pickup_address || null,
        pickupCity: s.pickup_city || null,
        pickupState: s.pickup_state || null,
        pickupCountry: s.pickup_country || null,
        parcelReadyDate: s.parcel_ready_date || null,
        parcelReadyTime: s.parcel_ready_time || null,
        originCountry: s.origin_country || null,
        customService: s.custom_service || null,
        deliveryService: s.delivery_service || null,
        uploadedDocuments: s.uploaded_documents || null,
        warehouseSentAt: s.warehouse_sent_at || null,
        shipperRef: s.shipper_ref || null,
        shipmentDate: s.shipment_date || null,
        description: s.description || null,
        packages: s.packages || null,
        hsCode: s.hs_code || null,
        dimensions: s.dimensions || null,
        dimLength: s.dim_length || null,
        dimWidth: s.dim_width || null,
        dimHeight: s.dim_height || null,
        totalValue: s.total_value || null,
        valueCurrency: s.value_currency || 'USD',
        specialInstruction: s.special_instruction || null,
        parcelType: s.parcel_type || null,
        parcelTypeCustom: s.parcel_type_custom || null,
        deliveryTimeline: s.delivery_timeline || null,
        packagingType: s.packaging_type || null,
        packagingTypeCustom: s.packaging_type_custom || null,
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

    // ---- Update Status action ----
    if (body.action === 'updateStatus' || (!body.action && body.trackingNumber && body.newStatus)) {
      const { trackingNumber, newStatus, location, notes, eta, actualWeight, actualCbm } = body;
      if (!trackingNumber || !newStatus) {
        return NextResponse.json({ success: false, error: 'Tracking number and status required.' });
      }

      const updateData = {
        status: newStatus,
        last_update: new Date().toISOString(),
      };
      if (eta) updateData.estimated_delivery = eta;

      if (actualWeight !== undefined && actualWeight !== null && String(actualWeight).trim() !== '') {
        const aw = parseFloat(actualWeight);
        if (!isNaN(aw)) updateData.actual_weight = aw;
      }
      if (actualCbm !== undefined && actualCbm !== null && String(actualCbm).trim() !== '') {
        const cbm = parseFloat(actualCbm);
        if (!isNaN(cbm)) updateData.total_cbm = cbm;
      }

      const { error: updateErr } = await serviceSupabase
        .from('shipments')
        .update(updateData)
        .eq('tracking_number', trackingNumber);

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message });
      }

      let historyNotes = notes || '';
      const extraBits = [];
      if (updateData.actual_weight !== undefined) extraBits.push('Actual Wt: ' + updateData.actual_weight + ' kg');
      if (updateData.total_cbm !== undefined) extraBits.push('CBM: ' + updateData.total_cbm);
      if (extraBits.length > 0) {
        historyNotes = (historyNotes ? historyNotes + ' · ' : '') + extraBits.join(' · ');
      }

      await serviceSupabase.from('tracking_history').insert({
        tracking_number: trackingNumber,
        status: newStatus,
        location: location || '',
        notes: historyNotes,
        updated_by: session.userId,
      });

      return NextResponse.json({ success: true });
    }

    // ---- Edit Booking action ----
    if (body.action === 'editBooking') {
      const { trackingNumber, fields, changeReason } = body;
      if (!trackingNumber || !fields || typeof fields !== 'object') {
        return NextResponse.json({ success: false, error: 'Tracking number and fields required.' });
      }

      const { data: current, error: fetchErr } = await serviceSupabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message });
      if (!current) return NextResponse.json({ success: false, error: 'Shipment not found.' });

      const updateData = {};
      const publicChanges = [];
      const internalChangeCount = { count: 0 };
      const allChangedLabels = [];

      Object.entries(EDITABLE_FIELDS).forEach(([formKey, meta]) => {
        if (!Object.prototype.hasOwnProperty.call(fields, formKey)) return;

        const newVal = normalizeValue(fields[formKey], meta.kind);
        const oldVal = normalizeValue(current[meta.dbKey], meta.kind);

        if (!valuesDiffer(oldVal, newVal)) return;

        updateData[meta.dbKey] = newVal;
        allChangedLabels.push(meta.label);

        if (meta.public) {
          publicChanges.push({
            label: meta.label,
            oldVal: prettyValue(oldVal, meta.label),
            newVal: prettyValue(newVal, meta.label),
          });
        } else {
          internalChangeCount.count++;
        }
      });

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({
          success: true,
          noChanges: true,
          changed: [],
        });
      }

      updateData.last_update = new Date().toISOString();

      const { error: updErr } = await serviceSupabase
        .from('shipments')
        .update(updateData)
        .eq('tracking_number', trackingNumber);

      if (updErr) return NextResponse.json({ success: false, error: updErr.message });

      let historyNotes = '';
      if (publicChanges.length > 0) {
        const lines = publicChanges.map((c) => c.label + ': ' + c.oldVal + ' → ' + c.newVal);
        historyNotes = lines.join('\n');
        if (changeReason && String(changeReason).trim()) {
          historyNotes += '\nReason: ' + String(changeReason).trim();
        }

        await serviceSupabase.from('tracking_history').insert({
          tracking_number: trackingNumber,
          status: 'Booking Edited',
          location: '',
          notes: historyNotes,
          updated_by: session.userId,
        });
      }

      return NextResponse.json({
        success: true,
        changed: allChangedLabels,
        publicChangeCount: publicChanges.length,
        internalChangeCount: internalChangeCount.count,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
