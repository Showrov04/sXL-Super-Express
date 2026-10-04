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
        // Editable booking detail fields
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

    // ---- Edit Booking action (G.14 — expanded whitelist) ----
    if (body.action === 'editBooking') {
      const { trackingNumber, fields } = body;
      if (!trackingNumber || !fields || typeof fields !== 'object') {
        return NextResponse.json({ success: false, error: 'Tracking number and fields required.' });
      }

      // Expanded whitelist — everything admin can edit
      // NOT editable: tracking_number, id, booked_by, booked_at, status, payment_status,
      // cost_saved_at, cost_saved_by, shipping_cost, uploaded_documents, warehouse_sent_at
      const editableMap = {
        // Reference & Mode
        shipperRef: 'shipper_ref',
        shipmentDate: 'shipment_date',
        parcelType: 'parcel_type',
        parcelTypeCustom: 'parcel_type_custom',
        deliveryTimeline: 'delivery_timeline',
        originCountry: 'origin_country',

        // Sender
        senderName: 'sender_name',
        senderPhone: 'sender_phone',
        senderEmail: 'sender_email',

        // Recipient
        recipientName: 'recipient_name',
        recipientPhone: 'recipient_phone',
        recipientEmail: 'recipient_email',
        recipientBin: 'recipient_bin',
        recipientAddress: 'recipient_address',
        recipientCity: 'recipient_city',
        recipientState: 'recipient_state',

        // Shipment Details
        description: 'description',
        packages: 'packages',
        totalWeight: 'total_weight',
        totalCbm: 'total_cbm',
        hsCode: 'hs_code',
        dimLength: 'dim_length',
        dimWidth: 'dim_width',
        dimHeight: 'dim_height',
        dimensions: 'dimensions',
        packagingType: 'packaging_type',
        packagingTypeCustom: 'packaging_type_custom',
        totalValue: 'total_value',
        valueCurrency: 'value_currency',

        // Pickup
        pickupAddress: 'pickup_address',
        pickupCity: 'pickup_city',
        pickupState: 'pickup_state',
        pickupCountry: 'pickup_country',
        parcelReadyDate: 'parcel_ready_date',
        parcelReadyTime: 'parcel_ready_time',

        // Payment & Billing
        paymentTerms: 'payment_terms',
        paymentMethod: 'payment_method',
        freightBillTo: 'freight_bill_to',
        dutyTaxBillTo: 'duty_tax_bill_to',

        // Services & Notes
        customService: 'custom_service',
        deliveryService: 'delivery_service',
        specialInstruction: 'special_instruction',
      };

      const numericIntFields = ['packages'];
      const numericFloatFields = [
        'dim_length', 'dim_width', 'dim_height',
        'total_weight', 'total_cbm', 'total_value',
      ];

      const updateData = { last_update: new Date().toISOString() };
      const changed = [];

      Object.entries(editableMap).forEach(([formKey, dbKey]) => {
        if (Object.prototype.hasOwnProperty.call(fields, formKey)) {
          let val = fields[formKey];

          // Normalize
          if (typeof val === 'string') val = val.trim();

          // Numeric conversions
          if (numericIntFields.includes(dbKey)) {
            val = (val === '' || val === null || val === undefined) ? null : (parseInt(val, 10) || null);
          } else if (numericFloatFields.includes(dbKey)) {
            val = (val === '' || val === null || val === undefined) ? null : (parseFloat(val) || null);
          } else {
            if (val === '') val = null;
          }

          updateData[dbKey] = val;
          changed.push(formKey);
        }
      });

      if (changed.length === 0) {
        return NextResponse.json({ success: false, error: 'No fields to update.' });
      }

      const { error: updErr } = await serviceSupabase
        .from('shipments')
        .update(updateData)
        .eq('tracking_number', trackingNumber);

      if (updErr) return NextResponse.json({ success: false, error: updErr.message });

      // Log to tracking history (visible on customer's tracking page)
      await serviceSupabase.from('tracking_history').insert({
        tracking_number: trackingNumber,
        status: 'Booking Edited',
        location: '',
        notes: 'Booking details updated by admin: ' + changed.join(', '),
        updated_by: session.userId,
      });

      return NextResponse.json({ success: true, changed });
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
