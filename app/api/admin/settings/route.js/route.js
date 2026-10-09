import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SETTING_KEY = 'special_parcel_enabled';

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

function parseBool(v, fallback = true) {
  if (v === null || v === undefined || v === '') return fallback;
  const s = String(v).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
}

/* ============================================================
 *  F.1 — Admin settings API
 *  Only setting for now: special_parcel_enabled (default: true)
 * ============================================================ */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { data: row } = await serviceSupabase
      .from('settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    // Default: enabled if no row exists
    const specialParcelEnabled = row ? parseBool(row.value, true) : true;

    return NextResponse.json({
      success: true,
      settings: {
        specialParcelEnabled,
      },
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

    if (!Object.prototype.hasOwnProperty.call(body, 'specialParcelEnabled')) {
      return NextResponse.json({ success: false, error: 'specialParcelEnabled is required.' });
    }

    const newValue = body.specialParcelEnabled === true ? 'true' : 'false';

    // Check if the row already exists
    const { data: existing } = await serviceSupabase
      .from('settings')
      .select('key')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await serviceSupabase
        .from('settings')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('key', SETTING_KEY);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message });
      }
    } else {
      const { error: insErr } = await serviceSupabase
        .from('settings')
        .insert({ key: SETTING_KEY, value: newValue });

      if (insErr) {
        return NextResponse.json({ success: false, error: insErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        specialParcelEnabled: newValue === 'true',
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
