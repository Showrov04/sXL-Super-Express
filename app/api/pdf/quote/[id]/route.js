import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateQuotePDF } from '@/lib/pdf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// T.3 — force fresh PDF every request
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Company contact keys (same as booking/invoice PDFs)
const COMPANY_KEYS = [
  'company_phone',
  'company_email',
  'company_website',
  'company_wechat',
  'company_whatsapp',
  'company_wechat_qr_url',
];

async function loadCompanyContact() {
  try {
    const { data: rows } = await serviceSupabase
      .from('settings')
      .select('key, value')
      .in('key', COMPANY_KEYS);

    const map = {};
    (rows || []).forEach((r) => { map[r.key] = r.value; });

    const out = {};
    COMPANY_KEYS.forEach((k) => {
      out[k] = (map[k] === null || map[k] === undefined) ? '' : map[k];
    });
    return out;
  } catch (e) {
    console.error('[PDF Quote] Contact load failed:', e.message);
    return {};
  }
}

/* ============================================================
   Auth — allow admin + staff (quotes are internal)
   ============================================================ */
async function requireAdminOrStaff(request) {
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

export async function GET(request, { params }) {
  try {
    const session = await requireAdminOrStaff(request);
    if (!session) {
      return new NextResponse('Permission denied.', {
        status: 403,
        headers: NO_CACHE_HEADERS,
      });
    }

    const id = String(params.id || '').trim();
    if (!id) {
      return new NextResponse('Quote ID required.', {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    const { data: quote, error } = await serviceSupabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return new NextResponse('Database error: ' + error.message, {
        status: 500,
        headers: NO_CACHE_HEADERS,
      });
    }
    if (!quote) {
      return new NextResponse('Quote not found.', {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    const contact = await loadCompanyContact();

    const pdfBytes = await generateQuotePDF(quote, contact);

    const safeName = String(quote.quote_number || 'quote').replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sXL_Quote_${safeName}.pdf"`,
        ...NO_CACHE_HEADERS,
      },
    });
  } catch (err) {
    return new NextResponse('Quote PDF generation failed: ' + err.message, {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
