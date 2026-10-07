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

    const pdfBytes = await generateBookingPDF(shipment);

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
