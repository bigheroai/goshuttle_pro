/**
 * Corporate Booking Invoice PDF Generator
 * Generates a downloadable PDF invoice receipt for corporate bookings.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download a PDF invoice for a corporate booking.
 * @param {object} invoiceData - booking and company details
 */
export function generateCorporateInvoicePDF(invoiceData) {
  const {
    invoiceNumber,
    bookingId,
    bookingCode,
    companyName,
    companyAddress,
    passengerName,
    passengerEmail,
    pickupLocation,
    dropoffLocation,
    pickupDate,
    vehicleName,
    vehicleType,
    passengerCount,
    notes,
    baseFare,
    serviceFee,
    totalCost,
    status,
    createdAt,
  } = invoiceData;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc?.internal?.pageSize?.getWidth();
  const pageHeight = doc?.internal?.pageSize?.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `PHP ${num?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr)?.toLocaleString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (_) {
      return String(dateStr);
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr)?.toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch (_) {
      return String(dateStr);
    }
  };

  // ── Brand Header ─────────────────────────────────────────────────────────
  // Blue gradient bar
  doc?.setFillColor(37, 99, 235); // primary blue
  doc?.rect(0, 0, pageWidth, 38, 'F');

  // Company name
  doc?.setTextColor(255, 255, 255);
  doc?.setFontSize(20);
  doc?.setFont('helvetica', 'bold');
  doc?.text('GoShuttle Pro', margin, 16);

  doc?.setFontSize(9);
  doc?.setFont('helvetica', 'normal');
  doc?.setTextColor(191, 219, 254); // blue-200
  doc?.text('Corporate Transportation Platform', margin, 23);
  doc?.text('support@goshuttle.ph  |  goshuttle.ph', margin, 29);

  // INVOICE label (right side)
  doc?.setTextColor(255, 255, 255);
  doc?.setFontSize(22);
  doc?.setFont('helvetica', 'bold');
  doc?.text('INVOICE', pageWidth - margin, 18, { align: 'right' });

  doc?.setFontSize(9);
  doc?.setFont('helvetica', 'normal');
  doc?.setTextColor(191, 219, 254);
  const invNo = invoiceNumber || `INV-${bookingCode || bookingId || Date.now()}`;
  doc?.text(`#${invNo}`, pageWidth - margin, 25, { align: 'right' });
  doc?.text(`Issued: ${formatShortDate(createdAt || new Date()?.toISOString())}`, pageWidth - margin, 31, { align: 'right' });

  // ── Status Badge ─────────────────────────────────────────────────────────
  let badgeColor = [22, 163, 74]; // green
  if (status === 'pending') badgeColor = [234, 179, 8];
  else if (status === 'cancelled') badgeColor = [220, 38, 38];
  else if (status === 'confirmed' || status === 'completed') badgeColor = [22, 163, 74];

  doc?.setFillColor(...badgeColor);
  doc?.roundedRect(margin, 44, 40, 8, 2, 2, 'F');
  doc?.setTextColor(255, 255, 255);
  doc?.setFontSize(8);
  doc?.setFont('helvetica', 'bold');
  const statusLabel = (status || 'Confirmed')?.toUpperCase();
  doc?.text(statusLabel, margin + 20, 49.5, { align: 'center' });

  // ── Bill To / Booking Info ────────────────────────────────────────────────
  let y = 60;

  // Two-column info block
  const col1X = margin;
  const col2X = pageWidth / 2 + 5;

  // Bill To
  doc?.setTextColor(107, 114, 128); // gray-500
  doc?.setFontSize(8);
  doc?.setFont('helvetica', 'bold');
  doc?.text('BILL TO', col1X, y);

  doc?.setTextColor(17, 24, 39); // gray-900
  doc?.setFontSize(10);
  doc?.setFont('helvetica', 'bold');
  doc?.text(companyName || 'N/A', col1X, y + 6);

  doc?.setFontSize(9);
  doc?.setFont('helvetica', 'normal');
  doc?.setTextColor(55, 65, 81);
  if (companyAddress) {
    const addrLines = doc?.splitTextToSize(companyAddress, contentWidth / 2 - 10);
    doc?.text(addrLines, col1X, y + 12);
    y += addrLines?.length * 5;
  }

  doc?.setTextColor(55, 65, 81);
  doc?.setFontSize(9);
  if (passengerName) doc?.text(`Passenger: ${passengerName}`, col1X, y + 12);
  if (passengerEmail) doc?.text(`Email: ${passengerEmail}`, col1X, y + 18);

  // Booking Reference (right column)
  const refY = 60;
  doc?.setTextColor(107, 114, 128);
  doc?.setFontSize(8);
  doc?.setFont('helvetica', 'bold');
  doc?.text('BOOKING REFERENCE', col2X, refY);

  const refData = [
    ['Booking Code', bookingCode || bookingId || 'N/A'],
    ['Invoice No.', invNo],
    ['Date Issued', formatShortDate(createdAt || new Date()?.toISOString())],
  ];

  refData?.forEach(([label, value], i) => {
    doc?.setFontSize(8.5);
    doc?.setFont('helvetica', 'normal');
    doc?.setTextColor(107, 114, 128);
    doc?.text(label, col2X, refY + 7 + i * 9);
    doc?.setTextColor(17, 24, 39);
    doc?.setFont('helvetica', 'bold');
    doc?.text(String(value), col2X + 35, refY + 7 + i * 9);
  });

  // ── Divider ───────────────────────────────────────────────────────────────
  y = Math.max(y + 28, 100);
  doc?.setDrawColor(229, 231, 235);
  doc?.setLineWidth(0.4);
  doc?.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Trip Details Section ──────────────────────────────────────────────────
  doc?.setTextColor(37, 99, 235);
  doc?.setFontSize(11);
  doc?.setFont('helvetica', 'bold');
  doc?.text('Trip Details', margin, y);
  y += 6;

  const tripRows = [
    ['Pickup Location', pickupLocation || 'N/A'],
    ['Drop-off Location', dropoffLocation || 'N/A'],
    ['Date & Time', formatDate(pickupDate)],
    ['Vehicle', vehicleName || vehicleType || 'N/A'],
    ['Passengers', String(passengerCount || 1)],
  ];
  if (notes) tripRows?.push(['Notes', notes]);

  autoTable(doc, {
    startY: y,
    head: [],
    body: tripRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [107, 114, 128], cellWidth: 50 },
      1: { textColor: [17, 24, 39] },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  y = doc?.lastAutoTable?.finalY + 10;

  // ── Cost Breakdown ────────────────────────────────────────────────────────
  doc?.setTextColor(37, 99, 235);
  doc?.setFontSize(11);
  doc?.setFont('helvetica', 'bold');
  doc?.text('Cost Breakdown', margin, y);
  y += 6;

  const total = parseFloat(totalCost || 0);
  const svcFee = parseFloat(serviceFee || 0);
  const base = parseFloat(baseFare || (total - svcFee > 0 ? total - svcFee : total));

  const costRows = [];
  if (base > 0 && svcFee > 0) {
    costRows?.push(['Base Fare', formatCurrency(base)]);
    costRows?.push(['Service Fee', formatCurrency(svcFee)]);
  } else {
    costRows?.push(['Transportation Fare', formatCurrency(total)]);
  }

  autoTable(doc, {
    startY: y,
    head: [],
    body: costRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: [55, 65, 81] },
      1: { textColor: [17, 24, 39], halign: 'right' },
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
  });

  y = doc?.lastAutoTable?.finalY + 2;

  // Total row with blue background
  doc?.setFillColor(37, 99, 235);
  doc?.rect(margin, y, contentWidth, 12, 'F');
  doc?.setTextColor(255, 255, 255);
  doc?.setFontSize(11);
  doc?.setFont('helvetica', 'bold');
  doc?.text('TOTAL AMOUNT DUE', margin + 4, y + 8);
  doc?.text(formatCurrency(total), pageWidth - margin - 4, y + 8, { align: 'right' });

  y += 20;

  // ── Footer ────────────────────────────────────────────────────────────────
  // Thin line above footer
  doc?.setDrawColor(229, 231, 235);
  doc?.setLineWidth(0.3);
  doc?.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);

  doc?.setTextColor(156, 163, 175);
  doc?.setFontSize(7.5);
  doc?.setFont('helvetica', 'normal');
  doc?.text('This is a system-generated invoice. No signature required.', pageWidth / 2, pageHeight - 16, { align: 'center' });
  doc?.text('GoShuttle Pro · support@goshuttle.ph · goshuttle.ph', pageWidth / 2, pageHeight - 11, { align: 'center' });
  doc?.text(`© ${new Date()?.getFullYear()} GoShuttle Pro. All rights reserved.`, pageWidth / 2, pageHeight - 6, { align: 'center' });

  // ── Save ──────────────────────────────────────────────────────────────────
  const fileName = `GoShuttle-Invoice-${invNo}.pdf`;
  doc?.save(fileName);
  return fileName;
}
