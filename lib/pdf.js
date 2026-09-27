import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const ORANGE = rgb(1, 0.42, 0);
const NAVY = rgb(0, 0.2, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT = rgb(0.95, 0.95, 0.96);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

/**
 * Booking confirmation PDF
 */
export async function generateBookingPDF(shipment) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 40;

  // ---- Header bar ----
  page.drawRectangle({ x: 40, y: y - 20, width: 60, height: 40, color: ORANGE });
  page.drawText('sXL', { x: 50, y: y - 8, size: 20, font: fontBold, color: WHITE });

  page.drawText('Super Express Logistics Center', {
    x: 110, y: y - 4, size: 14, font: fontBold, color: NAVY,
  });
  page.drawText('Booking Confirmation', {
    x: 110, y: y - 20, size: 10, font, color: ORANGE,
  });

  y -= 60;

  // ---- Tracking number ----
  page.drawRectangle({ x: 40, y: y - 25, width: width - 80, height: 45, color: LIGHT });
  page.drawText('TRACKING NUMBER', {
    x: 55, y: y - 8, size: 9, font, color: GRAY,
  });
  page.drawText(shipment.tracking_number || '', {
    x: 55, y: y - 22, size: 16, font: fontBold, color: NAVY,
  });

  y -= 60;

  // ---- Parties ----
  y = drawSection(page, y, 'SHIPPER (FROM)', [
    ['Name', shipment.sender_name],
    ['Address', shipment.pickup_address],
    ['City', `${shipment.pickup_city || ''} ${shipment.pickup_state || ''}`.trim()],
    ['Country', shipment.origin],
    ['Email', shipment.sender_email],
    ['Phone', shipment.sender_phone],
  ], font, fontBold);

  y = drawSection(page, y, 'CONSIGNEE (TO)', [
    ['Name', shipment.recipient_name],
    ['Address', shipment.destination],
    ['Email', shipment.recipient_email],
    ['Phone', shipment.recipient_phone],
    ['BIN', shipment.recipient_bin],
  ], font, fontBold);

  y = drawSection(page, y, 'SHIPMENT DETAILS', [
    ['Ship Mode', shipment.ship_mode],
    ['Service Type', shipment.service_type],
    ['Parcel Type', shipment.parcel_type],
    ['Description', shipment.description],
    ['Packages', shipment.packages],
    ['Total Weight', (shipment.total_weight || '') + ' kg'],
    ['Value', `${shipment.total_value || ''} ${shipment.value_currency || ''}`.trim()],
    ['Ready Date', `${shipment.parcel_ready_date || ''} ${shipment.parcel_ready_time || ''}`.trim()],
  ], font, fontBold);

  // ---- Footer ----
  page.drawText('This is a computer-generated document.', {
    x: 40, y: 40, size: 8, font, color: GRAY,
  });
  page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT', {
    x: 40, y: 28, size: 8, font, color: GRAY,
  });
  page.drawText('© sXL - Super Express Logistics Center', {
    x: 40, y: 16, size: 8, font, color: GRAY,
  });

  return await pdfDoc.save();
}

/**
 * Invoice PDF (individual or monthly)
 */
export async function generateInvoicePDF(invoice, shipments) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const { width } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 842 - 40;

  // ---- Header ----
  page.drawRectangle({ x: 40, y: y - 20, width: 60, height: 40, color: ORANGE });
  page.drawText('sXL', { x: 50, y: y - 8, size: 20, font: fontBold, color: WHITE });

  page.drawText('Super Express Logistics Center', {
    x: 110, y: y - 4, size: 14, font: fontBold, color: NAVY,
  });
  page.drawText(invoice.type === 'monthly-summary' ? 'MONTHLY SUMMARY INVOICE' : 'INVOICE', {
    x: 110, y: y - 20, size: 10, font, color: ORANGE,
  });

  y -= 60;

  // ---- Invoice info ----
  const info = [
    ['Invoice Number', invoice.invoice_number],
    ['Issue Date', String(invoice.issue_date || '').slice(0, 10)],
    ['Due Date', String(invoice.due_date || '').slice(0, 10)],
    ['Status', invoice.status],
    ['Shipper', invoice.shipper_name],
  ];
  if (invoice.month) info.push(['Month', invoice.month]);

  info.forEach(([label, value]) => {
    page.drawText(label + ':', { x: 40, y, size: 10, font: fontBold, color: NAVY });
    page.drawText(String(value || ''), { x: 160, y, size: 10, font, color: BLACK });
    y -= 16;
  });

  y -= 10;

  // ---- Shipments table ----
  page.drawText('SHIPMENTS', { x: 40, y, size: 11, font: fontBold, color: NAVY });
  y -= 18;

  // Table header
  page.drawRectangle({ x: 40, y: y - 14, width: width - 80, height: 20, color: NAVY });
  page.drawText('Tracking #', { x: 45, y: y - 8, size: 9, font: fontBold, color: WHITE });
  page.drawText('Route', { x: 200, y: y - 8, size: 9, font: fontBold, color: WHITE });
  page.drawText('Weight', { x: 380, y: y - 8, size: 9, font: fontBold, color: WHITE });
  page.drawText('Amount', { x: 470, y: y - 8, size: 9, font: fontBold, color: WHITE });
  y -= 20;

  let grandTotal = 0;
  (shipments || []).forEach((s, idx) => {
    if (y < 80) {
      // new page
      page = pdfDoc.addPage([595, 842]);
      y = 802;
    }
    const bg = idx % 2 === 0 ? WHITE : LIGHT;
    page.drawRectangle({ x: 40, y: y - 12, width: width - 80, height: 16, color: bg });
    page.drawText(s.tracking_number || '', { x: 45, y: y - 8, size: 8, font, color: BLACK });
        page.drawText(`${s.origin || ''} -> ${s.destination || ''}`, { x: 200, y: y - 8, size: 8, font, color: BLACK });
    page.drawText(String(s.total_weight || '') + ' kg', { x: 380, y: y - 8, size: 8, font, color: BLACK });
    const amt = parseFloat(s.shipping_cost) || 0;
    grandTotal += amt;
    page.drawText(amt.toFixed(2), { x: 470, y: y - 8, size: 8, font, color: BLACK });
    y -= 16;
  });

  y -= 10;

  // ---- Total ----
  page.drawRectangle({ x: 40, y: y - 30, width: width - 80, height: 35, color: LIGHT });
  page.drawText('TOTAL AMOUNT DUE', { x: 55, y: y - 8, size: 11, font: fontBold, color: NAVY });
  page.drawText(
    `${invoice.currency || 'USD'} ${Number(invoice.amount || grandTotal).toFixed(2)}`,
    { x: 380, y: y - 22, size: 16, font: fontBold, color: ORANGE }
  );

  y -= 50;

  if (invoice.local_currency && invoice.local_amount) {
    page.drawText(
      `Local currency: ${invoice.local_currency} ${Number(invoice.local_amount).toFixed(2)}`,
      { x: 40, y, size: 10, font, color: GRAY }
    );
    y -= 16;
  }

  // ---- Footer ----
  page.drawText('This is a computer-generated document.', {
    x: 40, y: 40, size: 8, font, color: GRAY,
  });
  page.drawText('Generated on ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' GMT', {
    x: 40, y: 28, size: 8, font, color: GRAY,
  });
  page.drawText('© sXL - Super Express Logistics Center', {
    x: 40, y: 16, size: 8, font, color: GRAY,
  });

  return await pdfDoc.save();
}

/**
 * Helper — draws a titled section with key/value rows
 */
function drawSection(page, y, title, rows, font, fontBold) {
  page.drawText(title, { x: 40, y, size: 11, font: fontBold, color: NAVY });
  y -= 16;
  page.drawRectangle({ x: 40, y: y - rows.length * 14 - 6, width: 515, height: rows.length * 14 + 8, color: LIGHT });
  rows.forEach(([label, value]) => {
    page.drawText(label + ':', { x: 50, y: y - 4, size: 9, font: fontBold, color: GRAY });
    const safeValue = String(value || '—').slice(0, 60);
    page.drawText(safeValue, { x: 130, y: y - 4, size: 9, font, color: BLACK });
    y -= 14;
  });
  return y - 12;
}
