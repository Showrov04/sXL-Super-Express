import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'booking-docs';

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

// Extract storage path from a public URL like:
// https://<project>.supabase.co/storage/v1/object/public/booking-docs/<path>
function pathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const marker = '/storage/v1/object/public/' + BUCKET + '/';
    const idx = String(url).indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(String(url).substring(idx + marker.length));
  } catch (e) {
    return null;
  }
}

// D.1 — month range helper: 'YYYY-MM' → { startIso, endIso }
function monthRange(month) {
  const m = String(month || '').trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;

  const [yearStr, monthStr] = m.split('-');
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  if (mon < 1 || mon > 12) return null;

  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 1, 0, 0, 0, 0)); // exclusive upper bound

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: m,
  };
}

// D.1 — eligibility check (matches Q2 = b + c)
function isEligible(s) {
  const status = String(s.status || '').toLowerCase();
  const payment = String(s.payment_status || '').toLowerCase();

  if (status === 'delivered' && payment === 'paid') return true;
  if (status === 'cancelled') return true;
  return false;
}

/* ============================================================
 *  GET /api/admin/cleanup?shipper=<shipperID>&month=YYYY-MM
 *  Returns a preview — no deletion happens here.
 * ============================================================ */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { searchParams } = new URL(request.url);
    const shipperID = String(searchParams.get('shipper') || '').trim();
    const month = String(searchParams.get('month') || '').trim();

    if (!shipperID) {
      return NextResponse.json({ success: false, error: 'Shipper ID required.' });
    }

    const range = monthRange(month);
    if (!range) {
      return NextResponse.json({ success: false, error: 'Invalid month. Expected format: YYYY-MM.' });
    }

    // Fetch all shipments for this shipper in the month
    const { data: shipments, error: shipErr } = await serviceSupabase
      .from('shipments')
      .select('id, tracking_number, status, payment_status, booked_at, uploaded_documents')
      .eq('booked_by', shipperID)
      .gte('booked_at', range.startIso)
      .lt('booked_at', range.endIso);

    if (shipErr) {
      return NextResponse.json({ success: false, error: shipErr.message });
    }

    const allInMonth = shipments || [];
    const eligible = allInMonth.filter(isEligible);

    // Collect tracking numbers and file paths
    const tns = eligible.map((s) => s.tracking_number).filter(Boolean);
    const filePaths = [];

    eligible.forEach((s) => {
      const docs = s.uploaded_documents || {};
      const invoices = Array.isArray(docs.invoices) ? docs.invoices : [];
      const packingLists = Array.isArray(docs.packingLists) ? docs.packingLists : [];
      [...invoices, ...packingLists].forEach((f) => {
        const p = f && f.url ? pathFromPublicUrl(f.url) : null;
        if (p) filePaths.push(p);
      });
    });

    // Count tracking history entries + invoices
    let trackingCount = 0;
    let invoiceCount = 0;

    if (tns.length > 0) {
      const { count: thCount } = await serviceSupabase
        .from('tracking_history')
        .select('*', { count: 'exact', head: true })
        .in('tracking_number', tns);
      trackingCount = thCount || 0;

      // invoices.tracking_numbers is a comma-separated string; use ilike per TN
      const orFilter = tns.map((tn) => `tracking_numbers.ilike.%${tn}%`).join(',');
      const { count: invCount } = await serviceSupabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .or(orFilter);
      invoiceCount = invCount || 0;
    }

    // Breakdown of skipped rows (for informational display)
    const skipped = allInMonth.length - eligible.length;

    return NextResponse.json({
      success: true,
      month: range.label,
      shipperID,
      eligibleCount: eligible.length,
      skippedCount: skipped,
      totalInMonth: allInMonth.length,
      trackingNumbers: tns,
      trackingHistoryCount: trackingCount,
      invoiceCount,
      fileCount: filePaths.length,
      message: eligible.length === 0
        ? 'No eligible shipments in ' + range.label + '. Only Delivered+Paid and Cancelled shipments can be deleted.'
        : eligible.length + ' shipment(s) eligible for deletion.',
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/* ============================================================
 *  POST /api/admin/cleanup
 *  Body: { shipperID, month, confirm: 'YYYY-MM' }
 *  Deletes eligible shipments + tracking_history + invoices + storage files.
 * ============================================================ */
export async function POST(request) {
  const startTime = Date.now();

  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admin can run deletions.' });
    }

    const body = await request.json();
    const shipperID = String(body.shipperID || '').trim();
    const month = String(body.month || '').trim();
    const confirm = String(body.confirm || '').trim();

    if (!shipperID) {
      return NextResponse.json({ success: false, error: 'Shipper ID required.' });
    }

    const range = monthRange(month);
    if (!range) {
      return NextResponse.json({ success: false, error: 'Invalid month. Expected format: YYYY-MM.' });
    }

    if (confirm !== month) {
      return NextResponse.json({
        success: false,
        error: 'Confirmation does not match. Please type the month exactly: ' + month,
      });
    }

    // Re-fetch to make sure we operate on the same data as the preview
    const { data: shipments, error: shipErr } = await serviceSupabase
      .from('shipments')
      .select('id, tracking_number, status, payment_status, booked_at, uploaded_documents')
      .eq('booked_by', shipperID)
      .gte('booked_at', range.startIso)
      .lt('booked_at', range.endIso);

    if (shipErr) {
      return NextResponse.json({ success: false, error: shipErr.message });
    }

    const eligible = (shipments || []).filter(isEligible);
    const tns = eligible.map((s) => s.tracking_number).filter(Boolean);

    if (eligible.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No eligible shipments found for ' + month + '.',
      });
    }

    // ---- 1. Delete storage files first (so we know if any fail) ----
    const filePaths = [];
    eligible.forEach((s) => {
      const docs = s.uploaded_documents || {};
      const invoices = Array.isArray(docs.invoices) ? docs.invoices : [];
      const packingLists = Array.isArray(docs.packingLists) ? docs.packingLists : [];
      [...invoices, ...packingLists].forEach((f) => {
        const p = f && f.url ? pathFromPublicUrl(f.url) : null;
        if (p) filePaths.push(p);
      });
    });

    let filesDeleted = 0;
    if (filePaths.length > 0) {
      const { data: removed, error: removeErr } = await serviceSupabase
        .storage
        .from(BUCKET)
        .remove(filePaths);

      if (removeErr) {
        console.error('[Cleanup] Storage remove error:', removeErr.message);
        // Continue — orphaned files are less bad than stuck rows.
      } else {
        filesDeleted = Array.isArray(removed) ? removed.length : filePaths.length;
      }
    }

    // ---- 2. Delete invoices ----
    let invoicesDeleted = 0;
    if (tns.length > 0) {
      const orFilter = tns.map((tn) => `tracking_numbers.ilike.%${tn}%`).join(',');
      const { data: removedInv, error: invErr } = await serviceSupabase
        .from('invoices')
        .delete()
        .or(orFilter)
        .select('invoice_id');

      if (invErr) {
        console.error('[Cleanup] Invoice delete error:', invErr.message);
      } else {
        invoicesDeleted = Array.isArray(removedInv) ? removedInv.length : 0;
      }
    }

    // ---- 3. Delete tracking_history ----
    let trackingDeleted = 0;
    if (tns.length > 0) {
      const { data: removedTh, error: thErr } = await serviceSupabase
        .from('tracking_history')
        .delete()
        .in('tracking_number', tns)
        .select('id');

      if (thErr) {
        console.error('[Cleanup] Tracking delete error:', thErr.message);
      } else {
        trackingDeleted = Array.isArray(removedTh) ? removedTh.length : 0;
      }
    }

    // ---- 4. Delete shipments (last, so partial failures leave traceable rows) ----
    const shipmentIds = eligible.map((s) => s.id);
    const { data: removedShip, error: shipDelErr } = await serviceSupabase
      .from('shipments')
      .delete()
      .in('id', shipmentIds)
      .select('id, tracking_number');

    if (shipDelErr) {
      return NextResponse.json({ success: false, error: shipDelErr.message });
    }

    const shipmentsDeleted = Array.isArray(removedShip) ? removedShip.length : 0;

    const durationMs = Date.now() - startTime;

    console.log(
      '[Cleanup] Done. shipper=' + shipperID + ' month=' + month +
      ' shipments=' + shipmentsDeleted +
      ' tracking=' + trackingDeleted +
      ' invoices=' + invoicesDeleted +
      ' files=' + filesDeleted +
      ' durationMs=' + durationMs
    );

    return NextResponse.json({
      success: true,
      month,
      shipperID,
      shipmentsDeleted,
      trackingDeleted,
      invoicesDeleted,
      filesDeleted,
      deletedTrackingNumbers: tns,
      durationMs,
    });

  } catch (err) {
    console.error('[Cleanup] Exception:', err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
