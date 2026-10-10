import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SETTING_KEY = 'special_parcel_enabled';

// Task 1 of 5 — Company contact keys (admin-editable, used by PDF generator)
const COMPANY_KEYS = [
  'company_phone',
  'company_email',
  'company_website',
  'company_wechat',
  'company_whatsapp',
  'company_wechat_qr_url',
];

const COMPANY_DEFAULTS = {
  company_phone: '+852 60480171',
  company_email: 'admin@sxl-logistics.com',
  company_website: 'www.sxl-logistics.com',
  company_wechat: 'sXL-Logistics',
  company_whatsapp: '+852 60480171',
  company_wechat_qr_url: '',
};

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

async function loadCompanySettings() {
  const { data: rows } = await serviceSupabase
    .from('settings')
    .select('key, value')
    .in('key', COMPANY_KEYS);

  const map = {};
  (rows || []).forEach((r) => { map[r.key] = r.value; });

  const out = {};
  COMPANY_KEYS.forEach((k) => {
    const v = map[k];
    out[k] = (v === null || v === undefined || v === '')
      ? (COMPANY_DEFAULTS[k] || '')
      : v;
  });
  return out;
}

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in.' });
    }

    // Special Parcel flag
    const { data: row } = await serviceSupabase
      .from('settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    const specialParcelEnabled = row ? parseBool(row.value, true) : true;

    // Company contact block (Task 1 of 5)
    const company = await loadCompanySettings();

    return NextResponse.json({
      success: true,
      settings: {
        specialParcelEnabled,
        ...company,
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

    // ===== Task 1 of 5 — Save company contact block =====
    const hasCompanyPayload = COMPANY_KEYS.some((k) =>
      Object.prototype.hasOwnProperty.call(body, k)
    );

    if (hasCompanyPayload) {
      const toSave = {};
      COMPANY_KEYS.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(body, k)) {
          const v = body[k];
          toSave[k] = (v === null || v === undefined) ? '' : String(v).trim();
        }
      });

      for (const [key, value] of Object.entries(toSave)) {
        const { data: existing } = await serviceSupabase
          .from('settings')
          .select('key')
          .eq('key', key)
          .maybeSingle();

        if (existing) {
          const { error: updErr } = await serviceSupabase
            .from('settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key);

          if (updErr) {
            return NextResponse.json({ success: false, error: updErr.message });
          }
        } else {
          const { error: insErr } = await serviceSupabase
            .from('settings')
            .insert({ key, value });

          if (insErr) {
            return NextResponse.json({ success: false, error: insErr.message });
          }
        }
      }

      // Return full refreshed settings
      const { data: row2 } = await serviceSupabase
        .from('settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      const specialParcelEnabled = row2 ? parseBool(row2.value, true) : true;
      const company = await loadCompanySettings();

      return NextResponse.json({
        success: true,
        settings: {
          specialParcelEnabled,
          ...company,
        },
      });
    }

    // ===== Existing Special Parcel toggle (unchanged) =====
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

    const company = await loadCompanySettings();

    return NextResponse.json({
      success: true,
      settings: {
        specialParcelEnabled: newValue === 'true',
        ...company,
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
