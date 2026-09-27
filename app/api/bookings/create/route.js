import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBookingPDF } from '@/lib/pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSessionUser(request) {
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
  return { userId: session.user_id, role: session.role };
}

function generateShortForm(name) {
  if (!name || !String(name).trim()) return 'SXL';
  const words = String(name).trim().split(/\s+/).filter(w => w.length > 0);
  let short = words.map(w => w[0].toUpperCase()).join('');
  short = short.replace(/[^A-Z0-9]/g, '');
  if (short.length > 4) short = short.substring(0, 4);
  return short || 'SXL';
}

function mapServiceType(shipMode) {
  if (shipMode === 'AIR') return 'Freight-Air';
  if (shipMode === 'SEA') return 'Freight-Sea';
  return 'Courier';
}

export async function POST(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ success: false, error: 'Session expired.' });

    const body = await request.json();
    const shipMode = String(body.shipMode || '').toUpperCase();
    const shipper = body.shipper || {};
    const consignee = body.consignee || {};
    const shipment = body.shipment || {};
    const paymentTerms = body.paymentTerms || '';
    const paymentMethod = body.paymentMethod || '';

    // Validation
    if (!['AIR', 'SEA'].includes(shipMode)) return NextResponse.json({ success: false, error: 'Ship mode is required.' });
    if (!shipper.name || !shipper.fullAddress || !shipper.country || !shipper.email || !shipper.phone) {
      return NextResponse.json({ success: false, error: 'Shipper details incomplete.' });
    }
    if (!consignee.name || !consignee.fullAddress || !consignee.country || !consignee.email || !consignee.phone) {
      return NextResponse.json({ success: false, error: 'Consignee details incomplete.' });
    }
    if (!shipment.description || !String(shipment.description).trim()) return NextResponse.json({ success: false, error: 'Description required.' });
    if (!shipment.totalWeight || parseFloat(shipment.totalWeight) <= 0) return NextResponse.json({ success: false, error: 'Weight required.' });
    if (!paymentTerms || !paymentMethod) return NextResponse.json({ success: false, error: 'Payment required.' });

    // Tracking number
    const shortForm = generateShortForm(shipper.name);
    const today = new Date();
    const ddmmyyyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + today.getFullYear();

    const { data: existingCounter } = await serviceSupabase
      .from('counters').select('*').eq('short_form', shortForm).maybeSingle();

    let nextNum = 1;
    if (existingCounter) {
      nextNum = (parseInt(existingCounter.last_number, 10) || 0) + 1;
      await serviceSupabase.from('counters').update({ last_number: nextNum, updated_at: new Date().toISOString() }).eq('short_form', shortForm);
    } else {
      await serviceSupabase.from('counters').insert({ short_form: shortForm, last_number: 1 });
    }

    const modeSuffix = shipMode === 'SEA' ? 'S' : '';
    const trackingNumber = shortForm + ddmmyyyy + nextNum + modeSuffix;

    // Insert shipment
    const { data: newShipment, error: insertError } = await serviceSupabase
      .from('shipments')
      .insert({
        tracking_number: trackingNumber,
        short_form: shortForm,
        ship_mode: shipMode,
        service_type: mapServiceType(shipMode),
        parcel_type: body.parcelType || null,
        parcel_type_custom: body.parcelTypeCustom || null,
        status: 'Booked',
        shipper_ref: shipment.shipperRef || null,
        shipment_date: shipment.shipmentDate || null,
        description: shipment.description,
        packages: shipment.packages ? parseInt(shipment.packages, 10) : null,
        total_weight: parseFloat(shipment.totalWeight) || null,
        total_value: shipment.totalValue ? parseFloat(shipment.totalValue) : null,
        value_currency: shipment.valueCurrency || 'USD',
        special_instruction: shipment.specialInstruction || null,
        parcel_ready_date: shipment.parcelReadyDate || null,
        parcel_ready_time: shipment.parcelReadyTime || null,
        pickup_same_as_shipper: shipment.pickupSameAsShipper !== false,
        pickup_address: shipment.pickupAddress || shipper.fullAddress,
        pickup_city: shipment.pickupCity || shipper.city,
        pickup_state: shipment.pickupState || shipper.state,
        pickup_country: shipment.pickupCountry || shipper.country,
        origin: shipper.country,
        destination: consignee.country,
        sender_name: shipper.name,
        sender_phone: shipper.phone,
        sender_email: shipper.email,
        recipient_name: consignee.name,
        recipient_phone: consignee.phone,
        recipient_email: consignee.email,
        recipient_bin: consignee.bin || null,
        hs_code: shipment.hsCode || null,
        total_cbm: shipment.totalCbm ? parseFloat(shipment.totalCbm) : null,
        dimensions: shipment.dimensions || null,
        currency: 'USD',
        payment_status: 'Unpaid',
        payment_terms: paymentTerms,
        payment_method: paymentMethod,
        booked_by: session.userId,
        booked_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ success: false, error: insertError.message });

    // Tracking history
    await serviceSupabase.from('tracking_history').insert({
      tracking_number: trackingNumber,
      status: 'Booked',
      location: shipper.city || shipper.country || 'Origin',
      notes: 'Booking received',
      updated_by: session.userId,
    });

    // ---- Generate Booking PDF ----
    let pdfUrl = null;
    try {
      const pdfBytes = await generateBookingPDF(newShipment);
      const filename = `bookings/${trackingNumber}.pdf`;
      const { error: uploadError } = await serviceSupabase.storage
        .from('documents')
        .upload(filename, pdfBytes, { contentType: 'application/pdf', upsert: true });

      if (!uploadError) {
        const { data: publicUrl } = serviceSupabase.storage.from('documents').getPublicUrl(filename);
        pdfUrl = publicUrl.publicUrl;
        await serviceSupabase.from('shipments').update({ pdf_url: pdfUrl }).eq('id', newShipment.id);
      }
    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr);
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      shipmentId: newShipment.id,
      pdfUrl,
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
