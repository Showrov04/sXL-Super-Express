import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePDF } from '@/lib/pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const invoiceId = params.id;
    if (!invoiceId) {
      return new NextResponse('Invoice ID required.', { status: 400 });
    }

    const { data: invoice, error } = await serviceSupabase
      .from('invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle();

    if (error) {
      return new NextResponse('Database error: ' + error.message, { status: 500 });
    }
    if (!invoice) {
      return new NextResponse('Invoice not found.', { status: 404 });
    }

    let shipments = [];
    const tns = String(invoice.tracking_numbers || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (tns.length > 0) {
      const { data } = await serviceSupabase
        .from('shipments')
        .select('*')
        .in('tracking_number', tns);
      shipments = data || [];
    }

    const invoiceForPDF = {
      invoice_number: invoice.invoice_number,
      type: invoice.type,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      shipper_name: invoice.shipper_name,
      month: invoice.month,
      amount: invoice.amount,
      currency: invoice.currency,
      local_currency: invoice.local_currency,
      local_amount: invoice.local_amount,
    };

    const pdfBytes = await generateInvoicePDF(invoiceForPDF, shipments);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sXL_Invoice_${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (err) {
    return new NextResponse('PDF generation failed: ' + err.message, { status: 500 });
  }
}
