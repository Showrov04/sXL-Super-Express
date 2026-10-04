import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

/**
 * GET — billing shipments (all | due | paid) + outstanding summary
 */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const shipperFilter = (searchParams.get('shipper') || '').trim().toLowerCase();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const { data: all, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .order('booked_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    const counts = {
      total: all.length,
      due: all.filter((s) => {
        const st = String(s.status || '').toLowerCase();
        const pay = String(s.payment_status || '').toLowerCase();
        return st === 'delivered' && pay !== 'paid';
      }).length,
      paid: all.filter((s) => String(s.payment_status || '').toLowerCase() === 'paid').length,
    };

    let filtered = all;
    if (filter === 'due') {
      filtered = filtered.filter((s) => {
        const st = String(s.status || '').toLowerCase();
        const pay = String(s.payment_status || '').toLowerCase();
        return st === 'delivered' && pay !== 'paid';
      });
    } else if (filter === 'paid') {
      filtered = filtered.filter((s) => String(s.payment_status || '').toLowerCase() === 'paid');
    }

    if (shipperFilter) {
      filtered = filtered.filter((s) => String(s.sender_name || '').toLowerCase() === shipperFilter);
    }
    if (search) {
      filtered = filtered.filter((s) => {
        return (
          String(s.tracking_number || '').toLowerCase().includes(search) ||
          String(s.sender_name || '').toLowerCase().includes(search) ||
          String(s.recipient_name || '').toLowerCase().includes(search)
        );
      });
    }

    // Fetch invoices for these shipments
    const tns = filtered.map((s) => s.tracking_number).filter(Boolean);
    let invoiceMap = {};
    if (tns.length > 0) {
      const { data: invoices } = await serviceSupabase
        .from('invoices')
        .select('invoice_id, invoice_number, type, tracking_numbers, status, issued_at, sent_at')
        .or(tns.map((tn) => `tracking_numbers.ilike.%${tn}%`).join(','));

      (invoices || []).forEach((inv) => {
        const list = String(inv.tracking_numbers || '').split(',').map((x) => x.trim()).filter(Boolean);
        list.forEach((tn) => {
          if (!invoiceMap[tn]) invoiceMap[tn] = [];
          invoiceMap[tn].push(inv);
        });
      });
    }

    const shipments = filtered.map((s) => {
      const cost = parseFloat(s.shipping_cost) || 0;
      const pickupService = s.pickup_service !== false;
      const customService = String(s.custom_service || '').toLowerCase();
      const deliveryService = String(s.delivery_service || '').toLowerCase();
      const parcelType = String(s.parcel_type || '').trim();
      const isSpecial = parcelType === 'Special Parcel';

      const tnsList = invoiceMap[s.tracking_number] || [];
      const hasIndividual = tnsList.some((inv) => inv.type === 'individual');
      const hasMonthly = tnsList.some((inv) => inv.type === 'monthly-summary');
      const latestInvoice = tnsList.sort((a, b) => {
        const da = new Date(a.issued_at || 0).getTime();
        const db = new Date(b.issued_at || 0).getTime();
        return db - da;
      })[0] || null;

      return {
        trackingNumber: s.tracking_number,
        shipperRef: s.shipper_ref || '',
        shipperName: s.sender_name,
        recipientName: s.recipient_name,
        status: s.status,
        shipMode: s.ship_mode,
        seaLoadType: s.sea_load_type || '',
        origin: s.origin,
        destination: s.destination,
        weight: s.total_weight,
        bookingWeight: s.total_weight,
        bookingCbm: parseFloat(s.total_cbm) || 0,
        actualWeight: s.actual_weight,
        actualCbm: parseFloat(s.total_cbm) || 0,
        ratePerKg: s.rate_per_kg,
        shippingCost: cost > 0 ? cost : null,
        totalCbm: parseFloat(s.total_cbm) || 0,
        currency: s.currency || 'USD',
        paymentStatus: s.payment_status,
        paymentMethod: s.payment_method,
        paymentTerms: s.payment_terms,
        costBreakdown: s.cost_breakdown,
        costSavedAt: s.cost_saved_at,
        bookedAt: s.booked_at,
        lastUpdate: s.last_update,
        isSpecialParcel: isSpecial,
        pickupService,
        customService,
        deliveryService,
        pickupCharge: parseFloat(s.pickup_charge) || 0,
        customsCharge: parseFloat(s.customs_charge) || 0,
        deliveryCharge: parseFloat(s.delivery_charge) || 0,
        hasIndividualInvoice: hasIndividual,
        hasMonthlyInvoice: hasMonthly,
        latestInvoice: latestInvoice ? {
          invoiceId: latestInvoice.invoice_id,
          invoiceNumber: latestInvoice.invoice_number,
          type: latestInvoice.type,
          status: latestInvoice.status,
          issuedAt: latestInvoice.issued_at,
          sentAt: latestInvoice.sent_at,
        } : null,
        invoiceSentAt: s.invoice_sent_at || null,
      };
    });

    // Outstanding summary
    const dueShipments = all.filter((s) => {
      const st = String(s.status || '').toLowerCase();
      const pay = String(s.payment_status || '').toLowerCase();
      return st === 'delivered' && pay !== 'paid';
    });

    const byShipper = {};
    dueShipments.forEach((s) => {
      const name = String(s.sender_name || 'Unknown').trim();
      if (!byShipper[name]) byShipper[name] = { shipperName: name, count: 0, total: 0 };
      byShipper[name].count++;
      byShipper[name].total += parseFloat(s.shipping_cost) || 0;
    });
    const outstandingShippers = Object.values(byShipper).map((sh) => ({
      ...sh,
      total: Math.round(sh.total * 100) / 100,
    }));
    outstandingShippers.sort((a, b) => b.total - a.total);

    const grandTotal = outstandingShippers.reduce((sum, x) => sum + x.total, 0);

    return NextResponse.json({
      success: true,
      shipments,
      counts,
      outstanding: {
        shippers: outstandingShippers,
        grandTotal: Math.round(grandTotal * 100) / 100,
        totalShipments: dueShipments.length,
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/**
 * POST — actions: saveCost | markPaid | markUnpaid | markInvoiceSent
 */
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admin can edit billing.' });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'saveCost') {
      return await handleSaveCost(session, body);
    }
    if (action === 'markPaid') {
      return await handleMarkPaid(session, body);
    }
    if (action === 'markUnpaid') {
      return await handleMarkUnpaid(session, body);
    }
    if (action === 'markInvoiceSent') {
      return await handleMarkInvoiceSent(session, body);
    }
    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

async function handleSaveCost(session, body) {
  const {
    trackingNumber,
    actualWeight,
    actualCbm,          // NEW: SEA only
    shipMode,           // NEW: 'SEA' | 'AIR' — to decide calc
    ratePerKg,
    additionalLines,
    currency,
    localCurrency,
    localAmount,
    pickupCharge,
    customsCharge,
    deliveryCharge,
  } = body;

  if (!trackingNumber) {
    return NextResponse.json({ success: false, error: 'Tracking number required.' });
  }

  const aw = parseFloat(actualWeight) || 0;
  const cbm = parseFloat(actualCbm) || 0;
  const rate = parseFloat(ratePerKg) || 0;
  const pc = parseFloat(pickupCharge) || 0;
  const cc = parseFloat(customsCharge) || 0;
  const dc = parseFloat(deliveryCharge) || 0;
  const lines = Array.isArray(additionalLines) ? additionalLines : [];
  let addlTotal = 0;
  lines.forEach((l) => { addlTotal += parseFloat(l.amount) || 0; });

  // Decide freight base:
  // AIR → weight × rate  |  SEA → CBM × rate
  const mode = String(shipMode || '').toUpperCase();
  const freightBase = (mode === 'SEA') ? cbm : aw;
  const freightTotal = Math.round((freightBase * rate) * 100) / 100;
  const servicesTotal = Math.round((pc + cc + dc) * 100) / 100;
  const total = Math.round((freightTotal + servicesTotal + addlTotal) * 100) / 100;

  const breakdown = {
    shipMode: mode,
    actualWeight: aw,
    actualCbm: cbm,
    freightBase,
    ratePerKg: rate,
    freightTotal,
    pickupCharge: pc,
    customsCharge: cc,
    deliveryCharge: dc,
    servicesTotal,
    additionalLines: lines,
    additionalTotal: addlTotal,
    total,
    currency: currency || 'USD',
    localCurrency: localCurrency || '',
    localAmount: parseFloat(localAmount) || 0,
    savedAt: new Date().toISOString(),
    savedBy: session.userId,
  };

  const updateData = {
    actual_weight: aw,
    rate_per_kg: rate,
    pickup_charge: pc,
    customs_charge: cc,
    delivery_charge: dc,
    shipping_cost: total,
    currency: currency || 'USD',
    cost_breakdown: breakdown,
    cost_saved_at: new Date().toISOString(),
    cost_saved_by: session.userId,
    last_update: new Date().toISOString(),
  };

  // Save CBM only for SEA (or if provided)
  if (mode === 'SEA' && cbm > 0) {
    updateData.total_cbm = cbm;
  }

  const { error } = await serviceSupabase
    .from('shipments')
    .update(updateData)
    .eq('tracking_number', trackingNumber);

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, total, currency: currency || 'USD' });
}

async function handleMarkPaid(session, body) {
  const { trackingNumber, paymentMethod } = body;
  if (!trackingNumber) {
    return NextResponse.json({ success: false, error: 'Tracking number required.' });
  }

  const { error } = await serviceSupabase
    .from('shipments')
    .update({
      payment_status: 'Paid',
      payment_method: paymentMethod || 'Cash',
      last_update: new Date().toISOString(),
    })
    .eq('tracking_number', trackingNumber);

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true });
}

async function handleMarkUnpaid(session, body) {
  const { trackingNumber } = body;
  if (!trackingNumber) {
    return NextResponse.json({ success: false, error: 'Tracking number required.' });
  }

  const { error } = await serviceSupabase
    .from('shipments')
    .update({
      payment_status: 'Unpaid',
      last_update: new Date().toISOString(),
    })
    .eq('tracking_number', trackingNumber);

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true });
}

async function handleMarkInvoiceSent(session, body) {
  const { trackingNumber } = body;
  if (!trackingNumber) {
    return NextResponse.json({ success: false, error: 'Tracking number required.' });
  }

  const now = new Date().toISOString();

  const { error: shipErr } = await serviceSupabase
    .from('shipments')
    .update({
      invoice_sent_at: now,
      last_update: now,
    })
    .eq('tracking_number', trackingNumber);

  if (shipErr) return NextResponse.json({ success: false, error: shipErr.message });

  const { data: relatedInvoices } = await serviceSupabase
    .from('invoices')
    .select('invoice_id, tracking_numbers')
    .ilike('tracking_numbers', '%' + trackingNumber + '%');

  if (relatedInvoices && relatedInvoices.length > 0) {
    for (const inv of relatedInvoices) {
      await serviceSupabase
        .from('invoices')
        .update({ sent_at: now })
        .eq('invoice_id', inv.invoice_id);
    }
  }

  return NextResponse.json({ success: true, sentAt: now });
}
