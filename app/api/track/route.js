import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STATUS_FLOW = ['Booked', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

function getStatusIndex(status) {
  const s = String(status || '').toLowerCase();
  const normalized = s === 'pending' ? 'booked' : (s === 'shipped' || s === 'picked' ? 'picked up' : s);
  for (let i = 0; i < STATUS_FLOW.length; i++) {
    if (STATUS_FLOW[i].toLowerCase() === normalized) return i;
  }
  if (s.includes('exception') || s.includes('failed') || s.includes('returned')) return -2;
  return -1;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tn = (searchParams.get('tn') || '').trim().toUpperCase();

    if (!tn) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }

    // Fetch shipment
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

    // Fetch history
    const { data: history } = await serviceSupabase
      .from('tracking_history')
      .select('*')
      .eq('tracking_number', tn)
      .order('timestamp', { ascending: false });

    // Build stepper state
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

    return NextResponse.json({
      success: true,
      shipment: {
        trackingNumber: shipment.tracking_number,
        serviceType: shipment.service_type,
        shipMode: shipment.ship_mode,
        parcelType: shipment.parcel_type,
        parcelTypeCustom: shipment.parcel_type_custom,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        shipperName: shipment.sender_name,
        recipientName: shipment.recipient_name,
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
