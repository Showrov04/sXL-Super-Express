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
    console.error('[PDF Invoice] Contact load failed:', e.message);
    return {};
  }
}

export async function GET(request, { params }) {
  try {
    const invoiceId = params.id;
    if (!invoiceId) {
      return new NextResponse('Invoice ID required.', { status: 400, headers: NO_CACHE_HEADERS });
    }

    // 1. Load invoice
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

    // 2. Load each shipment INDIVIDUALLY by tracking number
    //    (avoids any weird .in() ordering / partial-match behaviour)
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

    // 3. Log what we actually pulled — visible in Vercel → Logs (Function tab)
    console.log('[PDF Invoice]', JSON.stringify({
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      storedAmount: invoice.amount,
      tns,
      shipmentCosts: shipments.map((s) => ({
        tn: s.tracking_number,
        shipping_cost: s.shipping_cost,
        actual_weight: s.actual_weight,
        cost_saved_at: s.cost_saved_at,
      })),
    }));

        let isRevised = false;
    if (invoice.sent_at) {
      const sentTime = new Date(invoice.sent_at).getTime();
      isRevised = shipments.some((s) => {
        const costTime = new Date(s.cost_saved_at || 0).getTime();
        return costTime > sentTime;
      });
    }

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

    // 4. Unique filename on EVERY request — no PDF viewer can serve a stale copy
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
