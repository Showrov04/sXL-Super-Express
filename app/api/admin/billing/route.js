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

    // Fetch all shipments
    const { data: all, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .order('booked_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    // Counts
    const counts = {
      total: all.length,
      due: all.filter((s) => {
        const st = String(s.status || '').toLowerCase();
        const pay = String(s.payment_status || '').toLowerCase();
        return st === 'delivered' && pay !== 'paid';
      }).length,
      paid: all.filter((s) => String(s.payment_status || '').toLowerCase() === 'paid').length,
    };

    // Filter
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

    // Map
    const shipments = filtered.map((s) => ({
      trackingNumber: s.tracking_number,
      shipperName: s.sender_name,
      recipientName: s.recipient_name,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      weight: s.total_weight,
      actualWeight: s.actual_weight,
      ratePerKg: s.rate_per_kg,
      shippingCost: s.shipping_cost,
      currency: s.currency || 'USD',
      paymentStatus: s.payment_status,
      paymentMethod: s.payment_method,
      paymentTerms: s.payment_terms,
      costBreakdown: s.cost_breakdown,
      costSavedAt: s.cost_saved_at,
      bookedAt: s.booked_at,
      lastUpdate: s.last_update,
    }));

    // Outstanding summary — group due by shipper
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
 * POST — actions: saveCost | markPaid | markUnpaid
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
    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

async function handleSaveCost(session, body) {
  const { trackingNumber, actualWeight, ratePerKg, additionalLines, currency, localCurrency, localAmount } = body;

  if (!trackingNumber) {
    return NextResponse.json({ success: false, error: 'Tracking number required.' });
  }

  const aw = parseFloat(actualWeight) || 0;
  const rate = parseFloat(ratePerKg) || 0;
  const lines = Array.isArray(additionalLines) ? additionalLines : [];
  let addlTotal = 0;
  lines.forEach((l) => { addlTotal += parseFloat(l.amount) || 0; });
  const total = Math.round((aw * rate + addlTotal) * 100) / 100;

  const breakdown = {
    actualWeight: aw,
    ratePerKg: rate,
    additionalLines: lines,
    additionalTotal: addlTotal,
    total,
    currency: currency || 'USD',
    localCurrency: localCurrency || '',
    localAmount: parseFloat(localAmount) || 0,
    savedAt: new Date().toISOString(),
    savedBy: session.userId,
  };

  const { error } = await serviceSupabase
    .from('shipments')
    .update({
      actual_weight: aw,
      rate_per_kg: rate,
      shipping_cost: total,
      currency: currency || 'USD',
      cost_breakdown: breakdown,
      cost_saved_at: new Date().toISOString(),
      cost_saved_by: session.userId,
      last_update: new Date().toISOString(),
    })
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
