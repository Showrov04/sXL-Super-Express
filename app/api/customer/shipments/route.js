import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSessionUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  console.log('[Customer Shipments] Token:', token ? token.slice(0, 20) + '...' : 'MISSING');

  if (!token) return null;

  const { data: session, error } = await serviceSupabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.log('[Customer Shipments] Session error:', error.message);
    return null;
  }

  if (!session) {
    console.log('[Customer Shipments] No session for token');
    return null;
  }

  const expiresAt = new Date(session.expires_at).getTime();
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    console.log('[Customer Shipments] Session expired');
    return null;
  }

  console.log('[Customer Shipments] Valid session for:', session.user_id);
  return { userId: session.user_id, role: session.role };
}

export async function GET(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired.' });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'active';

    // Fetch all shipments for this user (no order — sort in JS)
    const { data: all, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('booked_by', session.userId);

    if (error) {
      console.log('[Customer Shipments] Query error:', error.message);
      return NextResponse.json({ success: false, error: error.message });
    }

    console.log('[Customer Shipments] Found', (all || []).length, 'shipments for', session.userId);

    const shipments = all || [];

    // Sort by booked_at descending (safe — string or date)
    shipments.sort((a, b) => {
      const da = new Date(a.booked_at || 0).getTime() || 0;
      const db = new Date(b.booked_at || 0).getTime() || 0;
      return db - da;
    });

    // Counts
    const counts = { active: 0, awaiting: 0, paid: 0, total: shipments.length };
    shipments.forEach((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';
      if (!isDelivered) counts.active++;
      else if (!isPaid) counts.awaiting++;
      else counts.paid++;
    });

    // Filter by tab
    const filtered = shipments.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';
      if (tab === 'active') return !isDelivered;
      if (tab === 'awaiting') return isDelivered && !isPaid;
      if (tab === 'paid') return isDelivered && isPaid;
      return true;
    });

    // Map
    const list = filtered.map((s) => ({
      trackingNumber: s.tracking_number,
      serviceType: s.service_type,
      shipMode: s.ship_mode,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      recipientName: s.recipient_name,
      weight: s.total_weight,
      cost: s.shipping_cost,
      currency: s.currency || 'USD',
      paymentStatus: s.payment_status,
      bookedAt: s.booked_at,
      estimatedDelivery: s.estimated_delivery,
      lastUpdate: s.last_update,
      pdfUrl: s.pdf_url,
    }));

    // Outstanding details
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
          destination: s.destination,
          deliveredAt: s.last_update,
          cost,
          currency: s.currency || 'USD',
          breakdown,
        };
      });
      outstanding = { total: Math.round(total * 100) / 100, currency: 'USD', count: items.length, items };
    }

    return NextResponse.json({
      success: true,
      shipments: list,
      counts,
      outstanding,
    });

  } catch (err) {
    console.log('[Customer Shipments] Exception:', err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
