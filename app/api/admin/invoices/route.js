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

      let allShipments = [];

      if (tns.length > 0) {
        const { data: shipments } = await serviceSupabase
          .from('shipments')
          .select('*')
          .in('tracking_number', tns);

        const byTn = {};
        (shipments || []).forEach((r) => { byTn[r.tracking_number] = r; });
        allShipments = tns.map((tn) => byTn[tn]).filter(Boolean);
      }

      const shipmentRows = allShipments.map((sh) => ({
        shipperRef: sh.shipper_ref || '',
        trackingNumber: sh.tracking_number,
        mode: sh.shipmentType || sh.ship_mode || '',
        route: (sh.origin || '') + ' -> ' + (sh.destination || ''),
        recipient: sh.recipient_name || '',
        weight: sh.total_weight,
        amount: parseFloat(sh.shipping_cost) || 0,
        currency: sh.currency || 'USD',
      }));

      const primaryShipment = allShipments[0] || null;

      return {
        invoiceID: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        type: inv.type,
        trackingNumbers: inv.tracking_numbers,
        trackingList: tns,
        shipperRef: primaryShipment?.shipper_ref || '',
        shipperName: inv.shipper_name || primaryShipment?.sender_name || '',
        month: inv.month,
        amount: inv.amount,
        currency: inv.currency,
        localCurrency: inv.local_currency,
        localAmount: inv.local_amount,
        status: inv.status,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        notes: inv.notes,
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
    if (action === 'delete') {
      return await deleteInvoice(session, body);
    }
    if (action === 'clearIndividualForShipperMonth') {
      return await clearIndividualForShipperMonth(session, body);
    }

    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

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

async function createMonthlyInvoice(session, body) {
  const { shipperName, month, localCurrency, exchangeRate } = body;

  if (!shipperName || !month) {
    return NextResponse.json({ success: false, error: 'Shipper name and month required.' });
  }

  const monthClean = String(month).trim();
  if (!/^\d{4}-\d{2}$/.test(monthClean)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid month format: "' + month + '". Expected YYYY-MM.',
    });
  }

  const shipperClean = String(shipperName).trim();

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
    });
  }

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
    return NextResponse.json({
      success: false,
      error: 'No delivered+unpaid shipments found for "' + shipperClean + '" in ' + monthClean + '.',
    });
  }

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
    return NextResponse.json({
      success: false,
      error: 'All ' + matchedByMonth.length + ' shipment(s) for "' + shipperClean +
             '" in ' + monthClean + ' are already in another invoice. ' +
             'Use "Clear Individual Invoices" button, then retry.',
    });
  }

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
    (skipped.length > 0 ? ' · ' + skipped.length + ' skipped' : '');

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

async function deleteInvoice(session, body) {
  const { invoiceId } = body;
  if (!invoiceId) {
    return NextResponse.json({ success: false, error: 'Invoice ID required.' });
  }

  const { data: invoice } = await serviceSupabase
    .from('invoices')
    .select('invoice_id, invoice_number, status, type, tracking_numbers')
    .eq('invoice_id', invoiceId)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ success: false, error: 'Invoice not found.' });
  }

  const statusLower = String(invoice.status || '').toLowerCase();
  if (statusLower === 'paid') {
    return NextResponse.json({
      success: false,
      error: 'Cannot delete a paid invoice (' + invoice.invoice_number + '). Mark it as Unpaid first.',
    });
  }

  let unlinkedIndividuals = [];

  if (invoice.type === 'monthly-summary') {
    const tns = String(invoice.tracking_numbers || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (tns.length > 0) {
      const orFilter = tns
        .map((tn) => 'tracking_numbers.ilike.%' + tn + '%')
        .join(',');

      const { data: linkedIndividuals } = await serviceSupabase
        .from('invoices')
        .select('invoice_id, invoice_number, status')
        .eq('type', 'individual')
        .or(orFilter);

      const paidLinked = (linkedIndividuals || []).filter(
        (i) => String(i.status).toLowerCase() === 'paid'
      );

      if (paidLinked.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete — some individual invoices linked to this monthly are Paid: ' +
                 paidLinked.map((i) => i.invoice_number).join(', ') +
                 '. Mark them Unpaid first.',
        });
      }

      if (linkedIndividuals && linkedIndividuals.length > 0) {
        const ids = linkedIndividuals.map((i) => i.invoice_id);
        await serviceSupabase
          .from('invoices')
          .delete()
          .in('invoice_id', ids);
        unlinkedIndividuals = linkedIndividuals.map((i) => i.invoice_number);
      }
    }
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
    deletedType: invoice.type,
    unlinkedIndividuals,
    unlinkedCount: unlinkedIndividuals.length,
  });
}

async function clearIndividualForShipperMonth(session, body) {
  const { shipperName, month } = body;
  if (!shipperName || !month) {
    return NextResponse.json({ success: false, error: 'Shipper name and month required.' });
  }

  const monthClean = String(month).trim();
  if (!/^\d{4}-\d{2}$/.test(monthClean)) {
    return NextResponse.json({ success: false, error: 'Invalid month format. Expected YYYY-MM.' });
  }

  const shipperClean = String(shipperName).trim();

  const { data: shipments } = await serviceSupabase
    .from('shipments')
    .select('tracking_number, booked_at')
    .ilike('sender_name', shipperClean);

  const shipmentTns = (shipments || []).filter((s) => {
    if (!s.booked_at) return false;
    const d = new Date(s.booked_at);
    if (isNaN(d.getTime())) return false;
    const sMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return sMonth === monthClean;
  }).map((s) => s.tracking_number).filter(Boolean);

  if (shipmentTns.length === 0) {
    return NextResponse.json({ success: false, error: 'No shipments found for that shipper + month.' });
  }

  const orFilter = shipmentTns
    .map((tn) => 'tracking_numbers.ilike.%' + tn + '%')
    .join(',');

  const { data: individualInvoices } = await serviceSupabase
    .from('invoices')
    .select('invoice_id, invoice_number, status, tracking_numbers')
    .eq('type', 'individual')
    .or(orFilter);

  if (!individualInvoices || individualInvoices.length === 0) {
    return NextResponse.json({ success: false, error: 'No individual invoices found for that shipper + month.' });
  }

  const paidInvoices = individualInvoices.filter((inv) => String(inv.status).toLowerCase() === 'paid');
  if (paidInvoices.length > 0) {
    return NextResponse.json({
      success: false,
      error: 'Cannot clear — some are marked Paid: ' +
             paidInvoices.map((i) => i.invoice_number).join(', ') +
             '. Mark them unpaid first.',
    });
  }

  const ids = individualInvoices.map((inv) => inv.invoice_id);
  const { error: delErr } = await serviceSupabase
    .from('invoices')
    .delete()
    .in('invoice_id', ids);

  if (delErr) {
    return NextResponse.json({ success: false, error: delErr.message });
  }

  return NextResponse.json({
    success: true,
    deletedCount: ids.length,
    deletedInvoiceNumbers: individualInvoices.map((inv) => inv.invoice_number),
  });
}
