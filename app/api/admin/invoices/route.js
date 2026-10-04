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
    const type = searchParams.get('type') || ''; // 'individual' | 'monthly-summary' | ''

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

    // Fetch shipments for each invoice (for shipper_ref, tracking, route)
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
          .select('tracking_number, shipper_ref, origin, destination, sender_name, recipient_name, currency')
          .in('tracking_number', tns);
        allShipments = shipments || [];
        primaryShipment = allShipments[0] || null;
      }

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
      };
    }));

    return NextResponse.json({ success: true, invoices: list });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/**
 * POST — actions: createIndividual, createMonthly, updateStatus
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

  // Check if individual invoice already exists for this shipment
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
 */
async function createMonthlyInvoice(session, body) {
  const { shipperName, month, localCurrency, localAmount } = body;

  if (!shipperName || !month) {
    return NextResponse.json({ success: false, error: 'Shipper name and month required.' });
  }

  const { data: candidates, error: shipErr } = await serviceSupabase
    .from('shipments')
    .select('*')
    .eq('sender_name', shipperName)
    .eq('status', 'Delivered')
    .neq('payment_status', 'Paid');

  if (shipErr) return NextResponse.json({ success: false, error: shipErr.message });

  const matched = (candidates || []).filter((s) => {
    if (!s.booked_at) return false;
    const d = new Date(s.booked_at);
    if (isNaN(d.getTime())) return false;
    const sMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return sMonth === month;
  });

  if (matched.length === 0) {
    return NextResponse.json({ success: false, error: 'No unpaid shipments found for this shipper in ' + month });
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

  const { error: insertErr } = await serviceSupabase
    .from('invoices')
    .insert({
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      type: 'monthly-summary',
      tracking_numbers: tns.join(', '),
      shipper_name: shipperName,
      month,
      amount: total,
      currency: 'USD',
      status: 'Issued',
      issue_date: issueDate.toISOString(),
      due_date: dueDate.toISOString(),
      notes: matched.length + ' shipments',
      local_currency: localCurrency || null,
      local_amount: parseFloat(localAmount) || null,
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
    total,
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
