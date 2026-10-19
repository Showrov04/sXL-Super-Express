import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePDF } from '@/lib/pdf';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const COMPANY_KEYS = [
  'company_phone', 'company_email', 'company_website', 'company_wechat', 'company_whatsapp', 'company_wechat_qr_url',
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
    return {};
  }
}

export async function GET(request, { params }) {
  try {
    const invoiceId = params.id;
    if (!invoiceId) {
      return new NextResponse('Invoice ID required.', { status: 400, headers: NO_CACHE_HEADERS });
    }

    const { data: invoice, error } = await serviceSupabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle();

    if (error) {
      return new NextResponse('Database error: ' + error.message, { status: 500, headers: NO_CACHE_HEADERS });
    }
    if (!invoice) {
      return new NextResponse('Invoice not found.', { status: 404, headers: NO_CACHE_HEADERS });
    }

    const tns = String(invoice.tracking_numbers || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const shipments = [];
    for (const tn of tns) {
      const { data: row } = await serviceSupabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', tn)
        .maybeSingle();
      if (row) shipments.push(row);
    }

    // --- AUTO-DETECT REVISED STATUS ---
    // We compare against the ISSUE DATE, not the last sent date.
    // If the cost was saved AFTER the invoice was issued, it is permanently revised.
    const issueTime = invoice.issue_date 
      ? new Date(invoice.issue_date).getTime() 
      : 0;
      
    let isRevised = shipments.some((s) => {
      if (!s.cost_saved_at) return false;
      const costTime = new Date(s.cost_saved_at).getTime();
      return costTime > (issueTime + 1000); // 1 second tolerance
    });

    // Also check URL parameter just in case we force it
    const url = new URL(request.url);
    if (url.searchParams.get('revised') === 'true') {
      isRevised = true;
    }
    // ----------------------------------

    const invoiceForPDF = {
      invoice_number: invoice.invoice_number,
      type: invoice.type,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      shipper_name: invoice.shipper_name,
      shipper_id: invoice.shipper_id || null,
      month: invoice.month,
      amount: invoice.amount,
      currency: invoice.currency,
      local_currency: invoice.local_currency,
      local_amount: invoice.local_amount,
      isRevised: isRevised,
    };

    const contact = await loadCompanyContact();
    const pdfBytes = await generateInvoicePDF(invoiceForPDF, shipments, contact);

    const stamp = Date.now();
    const safeInv = String(invoice.invoice_number || 'invoice').replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeInv}_${stamp}.pdf"`,
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
