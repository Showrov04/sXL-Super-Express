import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBookingPDF } from '@/lib/pdf';
import { sendBookingConfirmation, sendAdminNewBookingAlert } from '@/lib/email';

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
    const seaLoadType = String(body.seaLoadType || '').trim().toUpperCase();
    const shipper = body.shipper || {};
    const consignee = body.consignee || {};
    const shipment = body.shipment || {};
    const paymentTerms = body.paymentTerms || '';
    const paymentMethod = body.paymentMethod || '';
    const freightBillTo = body.freightBillTo ? String(body.freightBillTo).trim() : null;
    const dutyTaxBillTo = body.dutyTaxBillTo ? String(body.dutyTaxBillTo).trim() : null;
    const invoiceUrls = Array.isArray(body.invoiceUrls) ? body.invoiceUrls : [];
    const packingListUrls = Array.isArray(body.packingListUrls) ? body.packingListUrls : [];

    if (!['AIR', 'SEA'].includes(shipMode)) return NextResponse.json({ success: false, error: 'Ship mode is required.' });
    if (shipMode === 'SEA' && !['LCL', 'FCL'].includes(seaLoadType)) {
      return NextResponse.json({ success: false, error: 'Please select LCL or FCL for SEA shipments.' });
    }
    if (!shipper.name || !shipper.fullAddress || !shipper.country || !shipper.email || !shipper.phone) {
      return NextResponse.json({ success: false, error: 'Shipper details incomplete.' });
    }
    if (!consignee.name || !consignee.fullAddress || !consignee.country || !consignee.email || !consignee.phone) {
      return NextResponse.json({ success: false, error: 'Consignee details incomplete.' });
    }
    if (!shipment.description || !String(shipment.description).trim()) {
      return NextResponse.json({ success: false, error: 'Description required.' });
    }
    if (!shipment.totalWeight || parseFloat(shipment.totalWeight) <= 0) {
      return NextResponse.json({ success: false, error: 'Weight required.' });
    }
    if (!paymentTerms || !paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment required.' });
    }
    if (invoiceUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one Invoice file is required.' });
    }
    if (packingListUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one Packing List file is required.' });
    }

    if (shipMode === 'AIR') {
      if (!body.parcelType) {
        return NextResponse.json({ success: false, error: 'Parcel Type is required for AIR shipments.' });
      }
      if (body.parcelType === 'Special Parcel' && (!shipment.deliveryTimeline || !String(shipment.deliveryTimeline).trim())) {
        return NextResponse.json({ success: false, error: 'Delivery Timeline is required for Special Parcel shipments.' });
      }
    }

    const requiresBilling = !(shipMode === 'AIR' && body.parcelType === 'Special Parcel');
    if (requiresBilling) {
      if (!freightBillTo) {
        return NextResponse.json({ success: false, error: 'Please select who pays the freight cost.' });
      }
      if (!dutyTaxBillTo) {
        return NextResponse.json({ success: false, error: 'Please select who pays the duty & taxes.' });
      }
    }

    if (paymentTerms === 'Credit Account') {
      const { data: userRecord } = await serviceSupabase
        .from('users')
        .select('credit_approved, credit_limit, credit_request_status')
        .eq('user_id', session.userId)
        .maybeSingle();

      if (!userRecord || userRecord.credit_approved !== true) {
        return NextResponse.json({
          success: false,
          error: 'Your account is not approved for Credit Account. Please use Prepaid or Collect, or apply for credit in My Account.',
        });
      }

      const { data: existingShipments } = await serviceSupabase
        .from('shipments')
        .select('shipping_cost, payment_status')
        .eq('booked_by', session.userId)
        .neq('payment_status', 'Paid');

      let currentBalance = 0;
      (existingShipments || []).forEach((s) => {
        currentBalance += parseFloat(s.shipping_cost) || 0;
      });

      const creditLimit = parseFloat(userRecord.credit_limit) || 0;
      if (creditLimit > 0 && currentBalance >= creditLimit) {
        return NextResponse.json({
          success: false,
          error: 'Your credit limit has been reached. Please settle outstanding invoices or use Prepaid / Collect.',
        });
      }
    }

    const pickupService = shipment.pickupService !== false;
    const pickupSameAsShipper = pickupService && shipment.pickupSameAsShipper !== false;

    const dimLength = parseFloat(shipment.dimLength) || 0;
    const dimWidth = parseFloat(shipment.dimWidth) || 0;
    const dimHeight = parseFloat(shipment.dimHeight) || 0;
    let dimensionsStr = '';
    if (dimLength > 0 && dimWidth > 0 && dimHeight > 0) {
      dimensionsStr = dimLength + 'x' + dimWidth + 'x' + dimHeight;
    }

    const packagingType = String(shipment.packagingType || '').trim();
    const packagingTypeCustom = String(shipment.packagingTypeCustom || '').trim();

    const deliveryTimeline = (shipMode === 'AIR' && body.parcelType === 'Special Parcel' && shipment.deliveryTimeline)
      ? String(shipment.deliveryTimeline).trim()
      : null;

    const originCountry = shipment.originCountry ? String(shipment.originCountry).trim() : null;

    const uploadedDocuments = {
      invoices: invoiceUrls,
      packingLists: packingListUrls,
      uploadedAt: new Date().toISOString(),
    };

    const shortForm = generateShortForm(shipper.name);
    const today = new Date();
    const ddmmyyyy = String(today.getDate()).padStart(2, '0') +
                     String(today.getMonth() + 1).padStart(2, '0') +
                     today.getFullYear();

    const { data: existingCounter } = await serviceSupabase
      .from('counters').select('*').eq('short_form', shortForm).maybeSingle();

    let nextNum = 1;
    if (existingCounter) {
      nextNum = (parseInt(existingCounter.last_number, 10) || 0) + 1;
      await serviceSupabase.from('counters')
        .update({ last_number: nextNum, updated_at: new Date().toISOString() })
        .eq('short_form', shortForm);
    } else {
      await serviceSupabase.from('counters').insert({ short_form: shortForm, last_number: 1 });
    }

    const modeSuffix = shipMode === 'SEA' ? 'S' : '';
    const trackingNumber = shortForm + ddmmyyyy + nextNum + modeSuffix;

    let pickupAddress = '';
    let pickupCity = '';
    let pickupState = '';
    let pickupCountry = '';

    if (pickupService) {
      if (pickupSameAsShipper) {
        pickupAddress = shipper.fullAddress || '';
        pickupCity = shipper.city || '';
        pickupState = shipper.state || '';
        pickupCountry = shipper.country || '';
      } else {
        pickupAddress = shipment.pickupAddress || '';
        pickupCity = shipment.pickupCity || '';
        pickupState = shipment.pickupState || '';
        pickupCountry = shipment.pickupCountry || '';
      }
    }

    const { data: newShipment, error: insertError } = await serviceSupabase
      .from('shipments')
      .insert({
        tracking_number: trackingNumber,
        short_form: shortForm,
        ship_mode: shipMode,
        sea_load_type: shipMode === 'SEA' ? seaLoadType : null,
        service_type: mapServiceType(shipMode),
        parcel_type: body.parcelType || null,
        parcel_type_custom: body.parcelTypeCustom || null,
        delivery_timeline: deliveryTimeline,
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
        pickup_service: pickupService,
        pickup_same_as_shipper: pickupSameAsShipper,
        pickup_address: pickupAddress || null,
        pickup_city: pickupCity || null,
        pickup_state: pickupState || null,
        pickup_country: pickupCountry || null,
        origin: shipper.country,
        destination: consignee.country,
        origin_country: originCountry,
        sender_name: shipper.name,
        sender_phone: shipper.phone,
        sender_email: shipper.email,
        recipient_name: consignee.name,
        recipient_phone: consignee.phone,
        recipient_email: consignee.email,
        recipient_bin: consignee.bin || null,
        hs_code: shipment.hsCode || null,
        total_cbm: shipment.totalCbm ? parseFloat(shipment.totalCbm) : null,
        dimensions: dimensionsStr || null,
        dim_length: dimLength > 0 ? dimLength : null,
        dim_width: dimWidth > 0 ? dimWidth : null,
        dim_height: dimHeight > 0 ? dimHeight : null,
        packaging_type: packagingType || null,
        packaging_type_custom: packagingTypeCustom || null,
        freight_bill_to: freightBillTo,
        duty_tax_bill_to: dutyTaxBillTo,
        uploaded_documents: uploadedDocuments,
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

    await serviceSupabase.from('tracking_history').insert({
      tracking_number: trackingNumber,
      status: 'Booked',
      location: shipper.city || shipper.country || 'Origin',
      notes: 'Booking received',
      updated_by: session.userId,
    });

    const pdfUrl = '/api/pdf/booking/' + trackingNumber;

    try {
      await generateBookingPDF(newShipment);
    } catch (pdfErr) {
      console.error('[Booking PDF] Exception:', pdfErr.message);
    }

    try {
      const emailResult = await sendBookingConfirmation(newShipment);
      console.log('[Email] Customer confirmation:', emailResult.success ? 'sent' : 'failed', emailResult.error || '');
    } catch (emailErr) {
      console.error('[Email] Customer confirmation failed:', emailErr.message);
    }

    try {
      const adminResult = await sendAdminNewBookingAlert(newShipment);
      console.log('[Email] Admin alert:', adminResult.success ? 'sent' : 'failed', adminResult.error || '');
    } catch (emailErr) {
      console.error('[Email] Admin alert failed:', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      shipmentId: newShipment.id,
      pdfUrl,
    });

  } catch (err) {
    console.error('[Booking] Exception:', err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
