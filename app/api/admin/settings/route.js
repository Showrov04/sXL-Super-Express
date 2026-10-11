import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SETTING_KEY = 'special_parcel_enabled';

const COMPANY_KEYS = [
  'company_phone',
  'company_email',
  'company_website',
  'company_wechat',
  'company_whatsapp',
  'company_wechat_qr_url',
  'company_address',
];

const COMPANY_DEFAULTS = {
  company_phone: '+852 60480171',
  company_email: 'admin@sxl-logistics.com',
  company_website: 'www.sxl-logistics.com',
  company_wechat: 'sXL-Logistics',
  company_whatsapp: '+852 60480171',
  company_wechat_qr_url: '',
  company_address: 'Unit 704B, 7th Floor\nWell Fung Industrial Centre 和豐工業中心\n葵涌 打磚坪街68號\n68 Ta Chuen Ping Street, Kwai Chung\nHong Kong',
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

/* ============================================================
   Task 27 — upsertSetting()
   Wipes ALL rows for a key, then inserts exactly one. This
   guarantees a single row per key even if duplicates existed
   from earlier saves (which caused the "Hong Kong" bug).
   ============================================================ */
async function upsertSetting(key, value) {
  // 1. Delete all existing rows for this key
  const { error: delErr } = await serviceSupabase
    .from('settings')
    .delete()
    .eq('key', key);

  if (delErr) {
    throw new Error('Delete failed for ' + key + ': ' + delErr.message);
  }

  // 2. Insert one clean row
  const { error: insErr } = await serviceSupabase
    .from('settings')
    .insert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

  if (insErr) {
    throw new Error('Insert failed for ' + key + ': ' + insErr.message);
  }
}

/* ============================================================
   loadCompanySettings()
   Reads all matching rows but de-duplicates by taking the LAST
   occurrence, so the freshest value wins even if duplicates exist.
   ============================================================ */
async function loadCompanySettings() {
  const { data: rows } = await serviceSupabase
    .from('settings')
    .select('key, value, updated_at')
    .in('key', COMPANY_KEYS)
    .order('updated_at', { ascending: true }); // oldest first

  const map = {};
  (rows || []).forEach((r) => { map[r.key] = r.value; }); // last wins

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

    const { data: row } = await serviceSupabase
      .from('settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    const specialParcelEnabled = row ? parseBool(row.value, true) : true;
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

    // ===== Company contact block =====
    const hasCompanyPayload = COMPANY_KEYS.some((k) =>
      Object.prototype.hasOwnProperty.call(body, k)
    );

    if (hasCompanyPayload) {
      const toSave = {};
      COMPANY_KEYS.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(body, k)) {
          const v = body[k];
          // Preserve newlines in company_address; only trim outer whitespace
          toSave[k] = (v === null || v === undefined) ? '' : String(v).trim();
        }
      });

      try {
        for (const [key, value] of Object.entries(toSave)) {
          await upsertSetting(key, value);
        }
      } catch (saveErr) {
        return NextResponse.json({ success: false, error: saveErr.message });
      }

      // Return refreshed values
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

    // ===== Special Parcel toggle =====
    if (!Object.prototype.hasOwnProperty.call(body, 'specialParcelEnabled')) {
      return NextResponse.json({ success: false, error: 'specialParcelEnabled is required.' });
    }

    const newValue = body.specialParcelEnabled === true ? 'true' : 'false';

    try {
      await upsertSetting(SETTING_KEY, newValue);
    } catch (saveErr) {
      return NextResponse.json({ success: false, error: saveErr.message });
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
