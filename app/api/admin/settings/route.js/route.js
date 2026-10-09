import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SETTING_KEY = 'special_parcel_enabled';

/* ============================================================
 *  F.1b — two session checkers
 *    requireSession  → any valid logged-in user (customer / staff / admin)
 *    requireAdmin    → admin or staff only (for POST)
 * ============================================================ */
async function requireSession(request) {
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

  return { userId: session.user_id, role: session.role };
}

async function requireAdmin(request) {
  const session = await requireSession(request);
  if (!session) return null;
  if (session.role !== 'admin' && session.role !== 'staff') return null;
  return session;
}

function parseBool(v, fallback = true) {
  if (v === null || v === undefined || v === '') return fallback;
  const s = String(v).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
}

/* ============================================================
 *  GET /api/admin/settings
 *  Any logged-in user can read (customer booking wizard needs
 *  this to know whether Special Parcel is available).
 *  Returns a harmless boolean — no sensitive data.
 * ============================================================ */
export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in.' });
    }

    const { data: row } = await serviceSupabase
      .from('settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

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

/* ============================================================
 *  POST /api/admin/settings — admin / staff only
 * ============================================================ */
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
