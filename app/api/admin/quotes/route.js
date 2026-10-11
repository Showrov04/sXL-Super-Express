import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdmin(request) {
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

/* ============================================================
   Task 35b — Quote number generator
   Pattern: SXL-QT-<YEAR>-<COUNTER>
   ============================================================ */
async function getNextQuoteNumber() {
  const { data: setting } = await serviceSupabase
    .from('settings')
    .select('value')
    .eq('key', 'quote_next_number')
    .maybeSingle();

  const currentNum = parseInt(setting?.value, 10) || 10001;
  const year = new Date().getFullYear();

  await serviceSupabase
    .from('settings')
    .upsert(
      { key: 'quote_next_number', value: String(currentNum + 1), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  return `SXL-QT-${year}-${currentNum}`;
}

/* ============================================================
   Validation helper — quote_type drives which fields are required
   ============================================================ */
function validateQuoteInput(body) {
  const errors = [];
  const t = String(body.quote_type || '').toUpperCase();

  if (!['AIR', 'SEA'].includes(t)) errors.push('quote_type must be AIR or SEA');
  if (!body.customer_name) errors.push('Customer name is required');
  if (!body.origin) errors.push('Origin is required');
  if (!body.destination) errors.push('Destination is required');
  if (!body.rate || parseFloat(body.rate) <= 0) errors.push('Rate is required');

  if (t === 'AIR') {
    if (!body.total_weight || parseFloat(body.total_weight) <= 0) {
      errors.push('Weight is required for AIR quotes');
    }
  }
  if (t === 'SEA') {
    if (!body.total_cbm || parseFloat(body.total_cbm) <= 0) {
      errors.push('Volume (CBM) is required for SEA quotes');
    }
  }

  return errors;
}

/* ============================================================
   Compute totals on the server (never trust client math)
   ============================================================ */
function computeTotals(body) {
  const rate = parseFloat(body.rate) || 0;
  const t = String(body.quote_type || '').toUpperCase();

  const weight = parseFloat(body.total_weight) || 0;
  const cbm = parseFloat(body.total_cbm) || 0;

  const base = t === 'SEA' ? cbm : weight;
  const freightTotal = Math.round((base * rate) * 100) / 100;

  const pickupCharge = parseFloat(body.pickup_charge) || 0;
  const customsCharge = parseFloat(body.customs_charge) || 0;
  const deliveryCharge = parseFloat(body.delivery_charge) || 0;

  let additionalTotal = 0;
  const additionalLines = Array.isArray(body.additional_lines) ? body.additional_lines : [];
  additionalLines.forEach((l) => {
    additionalTotal += parseFloat(l.amount) || 0;
  });

  const subtotal = Math.round((freightTotal + pickupCharge + customsCharge + deliveryCharge + additionalTotal) * 100) / 100;
  const total = subtotal; // reserved for future discounts

  return {
    freightTotal,
    subtotal,
    total,
    additionalLines: additionalLines.map((l) => ({
      label: String(l.label || '').trim(),
      amount: parseFloat(l.amount) || 0,
    })),
  };
}

/* ============================================================
   GET — list quotes
   Query params:
     - status  (optional)  draft | sent | accepted | rejected | expired
     - type    (optional)  AIR | SEA
     - search  (optional)  match quote_number or customer name
   ============================================================ */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    let query = serviceSupabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('quote_type', type);

    const { data: quotes, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    let list = quotes || [];

    if (search) {
      list = list.filter((q) =>
        String(q.quote_number || '').toLowerCase().includes(search) ||
        String(q.customer_name || '').toLowerCase().includes(search) ||
        String(q.customer_company || '').toLowerCase().includes(search)
      );
    }

    const counts = {
      total: list.length,
      draft: list.filter((q) => q.status === 'draft').length,
      sent: list.filter((q) => q.status === 'sent').length,
      accepted: list.filter((q) => q.status === 'accepted').length,
    };

    return NextResponse.json({ success: true, quotes: list, counts });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/* ============================================================
   POST — actions: create | update | delete | updateStatus
   ============================================================ */
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const body = await request.json();
    const action = String(body.action || 'create').toLowerCase();

    if (action === 'create') return await createQuote(session, body);
    if (action === 'update') return await updateQuote(session, body);
    if (action === 'delete') return await deleteQuote(session, body);
    if (action === 'updateStatus') return await updateQuoteStatus(session, body);

    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

async function createQuote(session, body) {
  const errors = validateQuoteInput(body);
  if (errors.length > 0) {
    return NextResponse.json({ success: false, error: errors.join(' | ') });
  }

  const totals = computeTotals(body);
  const quoteNumber = await getNextQuoteNumber();

  const insert = {
    quote_number: quoteNumber,
    quote_type: String(body.quote_type).toUpperCase(),

    customer_name: String(body.customer_name || '').trim(),
    customer_company: String(body.customer_company || '').trim() || null,
    customer_email: String(body.customer_email || '').trim() || null,
    customer_phone: String(body.customer_phone || '').trim() || null,

    origin: String(body.origin || '').trim(),
    destination: String(body.destination || '').trim(),

    description: String(body.description || '').trim() || null,
    packages: body.packages ? parseInt(body.packages, 10) : null,
    total_weight: body.total_weight ? parseFloat(body.total_weight) : null,
    total_cbm: body.total_cbm ? parseFloat(body.total_cbm) : null,
    packaging_type: String(body.packaging_type || '').trim() || null,
    dimensions: String(body.dimensions || '').trim() || null,
    hs_code: String(body.hs_code || '').trim() || null,
    commodity: String(body.commodity || '').trim() || null,

    currency: String(body.currency || 'USD').toUpperCase(),
    rate: parseFloat(body.rate) || 0,
    rate_unit: String(body.quote_type).toUpperCase() === 'SEA' ? 'cbm' : 'kg',
    freight_total: totals.freightTotal,

    pickup_charge: parseFloat(body.pickup_charge) || 0,
    customs_charge: parseFloat(body.customs_charge) || 0,
    delivery_charge: parseFloat(body.delivery_charge) || 0,
    additional_lines: totals.additionalLines,

    subtotal: totals.subtotal,
    total: totals.total,

    valid_until: body.valid_until || null,
    lead_time: String(body.lead_time || '').trim() || null,
    transit_time: String(body.transit_time || '').trim() || null,
    notes: String(body.notes || '').trim() || null,
    terms: String(body.terms || '').trim() || null,

    status: 'draft',
    created_by: session.userId,
  };

  const { data, error } = await serviceSupabase
    .from('quotes')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({
    success: true,
    quote: data,
    quoteNumber,
  });
}

async function updateQuote(session, body) {
  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Quote ID required.' });
  }

  // Re-validate because totals depend on values
  const errors = validateQuoteInput(body);
  if (errors.length > 0) {
    return NextResponse.json({ success: false, error: errors.join(' | ') });
  }

  const totals = computeTotals(body);

  const updateData = {
    quote_type: String(body.quote_type).toUpperCase(),

    customer_name: String(body.customer_name || '').trim(),
    customer_company: String(body.customer_company || '').trim() || null,
    customer_email: String(body.customer_email || '').trim() || null,
    customer_phone: String(body.customer_phone || '').trim() || null,

    origin: String(body.origin || '').trim(),
    destination: String(body.destination || '').trim(),

    description: String(body.description || '').trim() || null,
    packages: body.packages ? parseInt(body.packages, 10) : null,
    total_weight: body.total_weight ? parseFloat(body.total_weight) : null,
    total_cbm: body.total_cbm ? parseFloat(body.total_cbm) : null,
    packaging_type: String(body.packaging_type || '').trim() || null,
    dimensions: String(body.dimensions || '').trim() || null,
    hs_code: String(body.hs_code || '').trim() || null,
    commodity: String(body.commodity || '').trim() || null,

    currency: String(body.currency || 'USD').toUpperCase(),
    rate: parseFloat(body.rate) || 0,
    rate_unit: String(body.quote_type).toUpperCase() === 'SEA' ? 'cbm' : 'kg',
    freight_total: totals.freightTotal,

    pickup_charge: parseFloat(body.pickup_charge) || 0,
    customs_charge: parseFloat(body.customs_charge) || 0,
    delivery_charge: parseFloat(body.delivery_charge) || 0,
    additional_lines: totals.additionalLines,

    subtotal: totals.subtotal,
    total: totals.total,

    valid_until: body.valid_until || null,
    lead_time: String(body.lead_time || '').trim() || null,
    transit_time: String(body.transit_time || '').trim() || null,
    notes: String(body.notes || '').trim() || null,
    terms: String(body.terms || '').trim() || null,

    updated_at: new Date().toISOString(),
  };

  const { data, error } = await serviceSupabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, quote: data });
}

async function deleteQuote(session, body) {
  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ success: false, error: 'Quote ID required.' });
  }

  const { error } = await serviceSupabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true });
}

async function updateQuoteStatus(session, body) {
  const id = String(body.id || '').trim();
  const status = String(body.status || '').trim().toLowerCase();
  const allowed = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

  if (!id) {
    return NextResponse.json({ success: false, error: 'Quote ID required.' });
  }
  if (!allowed.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status.' });
  }

  const { data, error } = await serviceSupabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, quote: data });
}
