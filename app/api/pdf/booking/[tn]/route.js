import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBookingPDF } from '@/lib/pdf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// T.3 — force fresh PDF on every request
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Task 4 of 5 — Company contact keys fetched from settings table
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
    console.error('[PDF Booking] Contact load failed:', e.message);
    return {};
  }
}

export async function GET(request, { params }) {
  try {
    const tn = (params.tn || '').toUpperCase();
    if (!tn) {
      return new NextResponse('Tracking number required.', {
        status: 400,
        headers: NO_CACHE_HEADERS,
      });
    }

    const { data: shipment, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', tn)
      .maybeSingle();

    if (error) {
      return new NextResponse('Database error: ' + error.message, {
        status: 500,
        headers: NO_CACHE_HEADERS,
      });
    }
    if (!shipment) {
      return new NextResponse('Shipment not found.', {
        status: 404,
        headers: NO_CACHE_HEADERS,
      });
    }

    // Task 4 of 5 — fetch company contact and pass to PDF generator
    const contact = await loadCompanyContact();

    const pdfBytes = await generateBookingPDF(shipment, contact);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sXL_Booking_${tn}.pdf"`,
        ...NO_CACHE_HEADERS,
      },
    });
  } catch (err) {
    return new NextResponse('PDF generation failed: ' + err.message, {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
