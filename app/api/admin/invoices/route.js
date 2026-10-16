import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function getNextInvoiceNumber() {
  const { data: setting } = await serviceSupabase
    .from('settings')
    .select('value')
    .eq('key', 'invoice_next_number')
    .maybeSingle();

  const { data: prefixSetting } = await serviceSupabase
    .from('settings')
    .select('value')
    .eq('key', 'invoice_prefix')
    .maybeSingle();

  const prefix = prefixSetting?.value || 'SXL-INV';
  const currentNum = parseInt(setting?.value, 10) || 10001;
  const year = new Date().getFullYear();

  await serviceSupabase
    .from('settings')
    .update({ value: String(currentNum + 1), updated_at: new Date().toISOString() })
    .eq('key', 'invoice_next_number');

  return `${prefix}-${year}-${currentNum}`;
}

/* ============================================================
 *  Country / shipment type helpers (match customer dashboard)
 * ============================================================ */
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

/**
 * GET — list invoices (with optional type filter)
 */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    let query = serviceSupabase
      .from('invoices')
      .select('*')
      .order('issue_date', { ascending: false })
      .limit(200);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: invoices, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    const list = await Promise.all((invoices || []).map(async (inv) => {
      const tns = String(inv.tracking_numbers || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let primaryShipment = null;
      let allShipments = [];

      if (tns.length > 0) {
        const { data: shipments } = await serviceSupabase
          .from('shipments')
          .select('*')
          .in('tracking_number', tns);

        const byTn = {};
        (shipments || []).forEach((r) => { byTn[r.tracking_number] = r; });
        allShipments = tns.map((tn) => byTn[tn]).filter(Boolean);
        primaryShipment = allShipments[0] || null;
      }

      const shipmentRows = allShipments.map((sh) => ({
        shipperRef: sh.shipper_ref || '',
        trackingNumber: sh.tracking_number,
        mode: buildShipmentType(sh),
        route: (countryName(sh.origin) || '') + ' -> ' + (countryName(sh.destination) || ''),
        recipient: sh.recipient_name || '',
        weight: sh.total_weight,
        amount: parseFloat(sh.shipping_cost) || 0,
        currency: sh.currency || 'USD',
        shipMode: sh.ship_mode || '',
        seaLoadType: sh.sea_load_type || '',
      }));

      return {
        invoiceID: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        type: inv.type,
        trackingNumbers: inv.tracking_numbers,
        trackingList: tns,
        shipperRef: primaryShipment?.shipper_ref || '',
        shipperName: inv.shipper_name || primaryShipment?.sender_name || '',
        recipientName: primaryShipment?.recipient_name || '',
        origin: primaryShipment?.origin || '',
        destination: primaryShipment?.destination || '',
        month: inv.month,
        amount: inv.amount,
        currency: inv.currency,
        localCurrency: inv.local_currency,
        localAmount: inv.local_amount,
        status: inv.status,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        paidDate: inv.paid_date,
        paymentMethod: inv.payment_method,
        notes: inv.notes,
        pdfUrl: inv.pdf_url,
        sentAt: inv.sent_at || null,
        shipmentsCount: allShipments.length,
        shipments: shipmentRows,
      };
    }));

    return NextResponse.json({ success: true, invoices: list });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/**
 * POST — actions: createIndividual, createMonthly, updateStatus, updateNotes, updateAmount, delete
 */
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'createIndividual') {
      return await createIndividualInvoice(session, body);
    }
    if (action === 'createMonthly') {
      return await createMonthlyInvoice(session, body);
    }
    if (action === 'updateStatus') {
      return await updateInvoiceStatus(session, body);
    }
    if (action === 'updateNotes') {
      return await updateInvoiceNotes(session, body);
    }
    if (action === 'updateAmount') {
      return await updateInvoiceAmount(session, body);
    }
    if (action === 'delete') {
      return await deleteInvoice(session, body);
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/**
 * Create individual invoice (1 shipment = 1 invoice)
 */
async function createIndividualInvoice(session, body) {
  const { trackingNumber } = body;
  if (!trackingNumber) {
    return NextResponse.json({ success: false, error: 'Tracking number required.' });
  }

  const { data: shipment, error: shipErr } = await serviceSupabase
    .from('shipments')
    .select('*')
    .eq('tracking_number', trackingNumber)
    .maybeSingle();

  if (shipErr) return NextResponse.json({ success: false, error: shipErr.message });
  if (!shipment) return NextResponse.json({ success: false, error: 'Shipment not found.' });

  if (!shipment.shipping_cost || parseFloat(shipment.shipping_cost) <= 0) {
    return NextResponse.json({ success: false, error: 'Save the cost first.' });
  }

  const { data: existing } = await serviceSupabase
    .from('invoices')
    .select('invoice_id, invoice_number')
    .eq('type', 'individual')
    .ilike('tracking_numbers', '%' + trackingNumber + '%')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: false,
      error: 'Invoice already exists for this shipment: ' + existing.invoice_number,
    });
  }

  const invoiceNumber = await getNextInvoiceNumber();
  const invoiceId = 'INV' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { error: insertErr } = await serviceSupabase
    .from('invoices')
    .insert({
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      type: 'individual',
      tracking_numbers: trackingNumber,
      shipper_id: null,
      shipper_name: shipment.sender_name,
      month: null,
      amount: parseFloat(shipment.shipping_cost),
      currency: shipment.currency || 'USD',
      status: 'Issued',
      issue_date: issueDate.toISOString(),
      due_date: dueDate.toISOString(),
      notes: null,
      created_by: session.userId,
    });

  if (insertErr) {
    return NextResponse.json({ success: false, error: insertErr.message });
  }

  return NextResponse.json({
    success: true,
    invoiceID: invoiceId,
    invoiceNumber,
  });
}

/**
 * Create monthly summary invoice
 *   GUARD 1 — reject duplicate (same shipper + month)
 *   GUARD 2 — skip TNs already in any other invoice
 *   TASK 3 — auto-compute local amount from exchange rate
 */
async function createMonthlyInvoice(session, body) {
  const { shipperName, month, localCurrency, exchangeRate } = body;

  if (!shipperName || !month) {
    return NextResponse.json({ success: false, error: 'Shipper name and month required.' });
  }

  const monthClean = String(month).trim();
  if (!/^\d{4}-\d{2}$/.test(monthClean)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid month format: "' + month + '". Expected YYYY-MM (e.g., 2026-10).',
    });
  }

  const shipperClean = String(shipperName).trim();

  // GUARD 1 — duplicate (shipper + month)
  const { data: existingMonthly } = await serviceSupabase
    .from('invoices')
    .select('invoice_number, status, amount, currency')
    .eq('type', 'monthly-summary')
    .ilike('shipper_name', shipperClean)
    .eq('month', monthClean)
    .maybeSingle();

  if (existingMonthly) {
    return NextResponse.json({
      success: false,
      error: 'A monthly invoice for "' + shipperClean + '" — ' + monthClean +
             ' already exists: ' + existingMonthly.invoice_number +
             ' (' + existingMonthly.status + ', ' + (existingMonthly.currency || 'USD') +
             ' ' + Number(existingMonthly.amount || 0).toFixed(2) + '). ' +
             'Delete it first or choose a different month.',
      existingInvoiceNumber: existingMonthly.invoice_number,
    });
  }

  // Candidate shipments (delivered + unpaid)
  const { data: candidates, error: shipErr } = await serviceSupabase
    .from('shipments')
    .select('*')
    .ilike('sender_name', shipperClean)
    .ilike('status', 'delivered')
    .neq('payment_status', 'Paid');

  if (shipErr) return NextResponse.json({ success: false, error: shipErr.message });

  const matchedByMonth = (candidates || []).filter((s) => {
    if (!s.booked_at) return false;
    const d = new Date(s.booked_at);
    if (isNaN(d.getTime())) return false;
    const sMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return sMonth === monthClean;
  });

  if (matchedByMonth.length === 0) {
    const count = (candidates || []).length;
    if (count > 0) {
      const monthsSeen = new Set();
      (candidates || []).forEach((s) => {
        if (s.booked_at) {
          const d = new Date(s.booked_at);
          if (!isNaN(d.getTime())) {
            monthsSeen.add(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
          }
        }
      });
      return NextResponse.json({
        success: false,
        error: 'No shipments for "' + shipperClean + '" in ' + monthClean +
               '. Found ' + count + ' delivered+unpaid shipment(s) in: ' +
               Array.from(monthsSeen).join(', ') + '. Try selecting one of those months.',
      });
    }
    return NextResponse.json({
      success: false,
      error: 'No delivered+unpaid shipments found for "' + shipperClean + '". ' +
             'Ensure shipment status is "Delivered" and payment status is not "Paid".',
    });
  }

  // GUARD 2 — skip TNs already in ANY invoice
  const candidateTns = matchedByMonth.map((s) => s.tracking_number).filter(Boolean);

  let existingInvoiceRows = [];
  if (candidateTns.length > 0) {
    const orFilter = candidateTns
      .map((tn) => 'tracking_numbers.ilike.%' + tn + '%')
      .join(',');
    const { data: invRows } = await serviceSupabase
      .from('invoices')
      .select('invoice_number, type, month, tracking_numbers, status')
      .or(orFilter);
    existingInvoiceRows = invRows || [];
  }

  const alreadyInvoiced = {};
  existingInvoiceRows.forEach((inv) => {
    const list = String(inv.tracking_numbers || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    list.forEach((tn) => {
      if (candidateTns.includes(tn) && !alreadyInvoiced[tn]) {
        alreadyInvoiced[tn] = {
          invoiceNumber: inv.invoice_number,
          type: inv.type,
          month: inv.month,
        };
      }
    });
  });

  const matched = matchedByMonth.filter((s) => !alreadyInvoiced[s.tracking_number]);
  const skipped = matchedByMonth.filter((s) => alreadyInvoiced[s.tracking_number]);

  if (matched.length === 0) {
    const lines = skipped.slice(0, 5).map((s) =>
      s.tracking_number + ' → ' + alreadyInvoiced[s.tracking_number].invoiceNumber +
      ' (' + alreadyInvoiced[s.tracking_number].type + ')'
    ).join('; ');
    const extra = skipped.length > 5 ? ' …and ' + (skipped.length - 5) + ' more' : '';
    return NextResponse.json({
      success: false,
      error: 'All ' + matchedByMonth.length + ' shipment(s) for "' + shipperClean +
             '" in ' + monthClean + ' are already in another invoice. ' +
             'Already invoiced: ' + lines + extra +
             '. Delete those invoices first or mark those shipments unpaid.',
    });
  }

  // Build the invoice
  let total = 0;
  const tns = [];
  matched.forEach((s) => {
    total += parseFloat(s.shipping_cost) || 0;
    tns.push(s.tracking_number);
  });
  total = Math.round(total * 100) / 100;

  const invoiceNumber = await getNextInvoiceNumber();
  const invoiceId = 'INV' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const notesText = matched.length + ' shipment' + (matched.length !== 1 ? 's' : '') +
    (skipped.length > 0 ? ' · ' + skipped.length + ' skipped (already invoiced)' : '');

  // TASK 3 — auto-compute local amount from exchange rate
  const fxRate = parseFloat(exchangeRate) || 0;
  const localAmountComputed = (fxRate > 0 && total > 0)
    ? Math.round(total * fxRate * 100) / 100
    : null;
  const localCurrencyClean = (localCurrency && localAmountComputed)
    ? String(localCurrency).trim().toUpperCase()
    : null;

  const { error: insertErr } = await serviceSupabase
    .from('invoices')
    .insert({
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      type: 'monthly-summary',
      tracking_numbers: tns.join(', '),
      shipper_name: shipperClean,
      month: monthClean,
      amount: total,
      currency: 'USD',
      status: 'Issued',
      issue_date: issueDate.toISOString(),
      due_date: dueDate.toISOString(),
      notes: notesText,
      local_currency: localCurrencyClean,
      local_amount: localAmountComputed,
      created_by: session.userId,
    });

  if (insertErr) {
    return NextResponse.json({ success: false, error: insertErr.message });
  }

  return NextResponse.json({
    success: true,
    invoiceID: invoiceId,
    invoiceNumber,
    shipmentCount: matched.length,
    skippedCount: skipped.length,
    total,
    currency: 'USD',
    localCurrency: localCurrencyClean,
    localAmount: localAmountComputed,
    exchangeRate: fxRate,
  });
}

async function updateInvoiceStatus(session, body) {
  const { invoiceId, status } = body;
  if (!invoiceId || !status) {
    return NextResponse.json({ success: false, error: 'Invoice ID and status required.' });
  }

  const updateData = { status };
  if (status === 'Paid') {
    updateData.paid_date = new Date().toISOString();
  } else {
    updateData.paid_date = null;
  }

  const { error } = await serviceSupabase
    .from('invoices')
    .update(updateData)
    .eq('invoice_id', invoiceId);

  if (error) return NextResponse.json({ success: false, error: error.message });

  return NextResponse.json({ success: true });
}

async function updateInvoiceNotes(session, body) {
  const { invoiceId, notes } = body;
  if (!invoiceId) {
    return NextResponse.json({ success: false, error: 'Invoice ID required.' });
  }

  const { error } = await serviceSupabase
    .from('invoices')
    .update({ notes: String(notes || '') })
    .eq('invoice_id', invoiceId);

  if (error) return NextResponse.json({ success: false, error: error.message });

  return NextResponse.json({ success: true });
}

async function updateInvoiceAmount(session, body) {
  const { invoiceId, amount, dueDate } = body;
  if (!invoiceId || amount === undefined) {
    return NextResponse.json({ success: false, error: 'Invoice ID and amount required.' });
  }

  const updateData = { amount: parseFloat(amount) || 0 };
  if (dueDate) updateData.due_date = dueDate;

  const { error } = await serviceSupabase
    .from('invoices')
    .update(updateData)
    .eq('invoice_id', invoiceId);

  if (error) return NextResponse.json({ success: false, error: error.message });

  return NextResponse.json({ success: true });
}

/* ============================================================
 *  Delete invoice
 *  Refuses to delete if status = Paid.
 *  Shipments stay as-is (they remain unpaid → can be reinvoiced).
 * ============================================================ */
async function deleteInvoice(session, body) {
  const { invoiceId } = body;
  if (!invoiceId) {
    return NextResponse.json({ success: false, error: 'Invoice ID required.' });
  }

  const { data: invoice } = await serviceSupabase
    .from('invoices')
    .select('invoice_number, status, type')
    .eq('invoice_id', invoiceId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ success: false, error: 'Invoice not found.' });
  }

  const statusLower = String(invoice.status || '').toLowerCase();
  if (statusLower === 'paid') {
    return NextResponse.json({
      success: false,
      error: 'Cannot delete a paid invoice (' + invoice.invoice_number + '). ' +
             'Mark it as Unpaid first if you really need to delete it.',
    });
  }

  const { error: delErr } = await serviceSupabase
    .from('invoices')
    .delete()
    .eq('invoice_id', invoiceId);

  if (delErr) {
    return NextResponse.json({ success: false, error: delErr.message });
  }

  return NextResponse.json({
    success: true,
    deletedInvoiceNumber: invoice.invoice_number,
  });
}
