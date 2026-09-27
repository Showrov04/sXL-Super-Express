import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tn = (searchParams.get('tn') || '').trim().toUpperCase();

    if (!tn) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }

    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', tn)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Tracking number not found.' });
    }

    return NextResponse.json({ success: true, shipment: data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
