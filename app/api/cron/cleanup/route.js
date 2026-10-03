import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RETENTION_DAYS = 180;
const BUCKET = 'booking-docs';

// Extract the storage path from a public URL like:
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

export async function GET(request) {
  const startTime = Date.now();

  // Optional: protect with a secret (Vercel Cron adds Authorization: Bearer <CRON_SECRET> if set)
  const authHeader = request.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET || '';
  if (expectedSecret) {
    if (authHeader !== 'Bearer ' + expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
  }

  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // ===== Find candidates =====
    // Status must be Delivered or Cancelled, booked_at older than cutoff
    const { data: shipments, error: fetchErr } = await serviceSupabase
      .from('shipments')
      .select('id, tracking_number, status, booked_at, uploaded_documents')
      .lt('booked_at', cutoff)
      .in('status', ['Delivered', 'Cancelled']);

    if (fetchErr) {
      console.error('[Cleanup] Fetch error:', fetchErr.message);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    const candidates = (shipments || []).filter((s) => {
      const docs = s.uploaded_documents;
      if (!docs) return false;
      const inv = Array.isArray(docs.invoices) ? docs.invoices.length : 0;
      const pl = Array.isArray(docs.packingLists) ? docs.packingLists.length : 0;
      return inv + pl > 0;
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        cutoff,
        candidates: 0,
        filesDeleted: 0,
        shipmentsUpdated: 0,
        message: 'Nothing to clean up.',
        durationMs: Date.now() - startTime,
      });
    }

    // ===== Collect paths to delete =====
    const allPaths = [];
    const shipmentPathMap = {}; // shipmentId -> paths to delete

    candidates.forEach((s) => {
      const docs = s.uploaded_documents || {};
      const invoices = Array.isArray(docs.invoices) ? docs.invoices : [];
      const packingLists = Array.isArray(docs.packingLists) ? docs.packingLists : [];
      const shipmentPaths = [];

      [...invoices, ...packingLists].forEach((file) => {
        const path = file && file.url ? pathFromPublicUrl(file.url) : null;
        if (path) {
          shipmentPaths.push(path);
          allPaths.push(path);
        }
      });

      if (shipmentPaths.length > 0) {
        shipmentPathMap[s.id] = shipmentPaths;
      }
    });

    if (allPaths.length === 0) {
      return NextResponse.json({
        success: true,
        cutoff,
        candidates: candidates.length,
        filesDeleted: 0,
        shipmentsUpdated: 0,
        message: 'No valid file paths found.',
        durationMs: Date.now() - startTime,
      });
    }

    // ===== Delete files from storage =====
    // Supabase .remove() accepts array of paths
    const { data: removedData, error: removeErr } = await serviceSupabase
      .storage
      .from(BUCKET)
      .remove(allPaths);

    if (removeErr) {
      console.error('[Cleanup] Storage remove error:', removeErr.message);
      return NextResponse.json({ success: false, error: removeErr.message }, { status: 500 });
    }

    const filesDeleted = Array.isArray(removedData) ? removedData.length : allPaths.length;

    // ===== Clear uploaded_documents on affected shipments =====
    let shipmentsUpdated = 0;
    for (const [shipmentId] of Object.entries(shipmentPathMap)) {
      const { error: updateErr } = await serviceSupabase
        .from('shipments')
        .update({ uploaded_documents: null })
        .eq('id', shipmentId);

      if (!updateErr) shipmentsUpdated++;
    }

    const durationMs = Date.now() - startTime;

    console.log('[Cleanup] Done. cutoff=' + cutoff + ' candidates=' + candidates.length + ' filesDeleted=' + filesDeleted + ' shipmentsUpdated=' + shipmentsUpdated + ' durationMs=' + durationMs);

    return NextResponse.json({
      success: true,
      cutoff,
      retentionDays: RETENTION_DAYS,
      candidates: candidates.length,
      filesDeleted,
      shipmentsUpdated,
      durationMs,
    });

  } catch (err) {
    console.error('[Cleanup] Exception:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
