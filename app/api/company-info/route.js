import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Public company contact keys — safe to expose (no secrets)
const COMPANY_KEYS = [
  'company_phone',
  'company_email',
  'company_website',
  'company_wechat',
  'company_whatsapp',
  'company_wechat_qr_url',
];

// Fallbacks if the settings row is missing
const DEFAULTS = {
  company_phone: '+852 60480171',
  company_email: 'admin@sxl-logistics.com',
  company_website: 'www.sxl-logistics.com',
  company_wechat: 'sXL-Logistics',
  company_whatsapp: '+852 60480171',
  company_wechat_qr_url: '',
};

export async function GET() {
  try {
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
        ? DEFAULTS[k]
        : String(v);
    });

    return NextResponse.json(
      { success: true, company: out },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    // Always return defaults on error so the home page never breaks
    return NextResponse.json(
      { success: true, company: DEFAULTS },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
