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

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { searchParams } = new URL(request.url);
    const tn = (searchParams.get('tn') || '').trim().toUpperCase();

    if (!tn) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }

    // Fetch the most recent tracking history entry (with a location)
    const { data: history, error } = await serviceSupabase
      .from('tracking_history')
      .select('status, location, timestamp')
      .eq('tracking_number', tn)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    // Find most recent entry that has a non-empty location
    let lastLocation = '';
    let lastStatus = '';
    if (history && history.length > 0) {
      lastStatus = history[0].status || '';
      for (const h of history) {
        if (h.location && String(h.location).trim()) {
          lastLocation = String(h.location).trim();
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      location: lastLocation,
      status: lastStatus,
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
