import { jsPDF } from 'jspdf';
import { CapturedPhoto } from '../types';
import { normalizeTime12Hour, formatTime12Hour, formatDateString } from '../utils/timeFormat';

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  workerId?: string;
  workerName?: string;
  categoryId?: string;
  categoryName?: string;
  wardNumber?: string;
  area?: string;
}

export class PdfReportService {
  static async generateReport(photos: CapturedPhoto[], filters: ReportFilterOptions): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Header Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SUMIT BOSS', margin, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text('GPS MAP CAMERA & WORKER FIELD DOCUMENTATION REPORT', margin, 18);

    doc.setTextColor(203, 213, 225);
    const now = new Date();
    doc.text(`Generated: ${formatDateString(now)} ${formatTime12Hour(now)}`, pageWidth - margin - 55, 18);

    let yPos = 35;

    // Summary & Filter Box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 22, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT FILTERS & AUDIT METRICS:', margin + 4, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const filterInfo = [
      `Total Photos: ${photos.length}`,
      `Worker: ${filters.workerName || 'All Workers'}`,
      `Category: ${filters.categoryName || 'All Categories'}`,
      `Ward: ${filters.wardNumber || 'All Wards'}`,
      `Date Range: ${filters.startDate || 'Any'} to ${filters.endDate || 'Any'}`,
    ].join('   |   ');

    doc.text(filterInfo, margin + 4, yPos + 13);
    yPos += 28;

    if (photos.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(148, 163, 184);
      doc.text('No photo records match the selected filter criteria.', margin, yPos + 10);
      return doc;
    }

    // Render Photo Records (2 records per page for crisp presentation and readable thumbnails)
    const recordsPerPage = 2;
    let recordIndexOnPage = 0;

    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];

      // Check if we need a new page
      if (recordIndexOnPage >= recordsPerPage) {
        doc.addPage();
        recordIndexOnPage = 0;
        yPos = margin;

        // Subheader on subsequent pages
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('SUMIT BOSS - FIELD DOCUMENTATION REPORT (Continued)', margin, 8);
        yPos = 20;
      }

      const cardHeight = 110;
      const cardWidth = pageWidth - margin * 2;

      // Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'FD');

      // Top title bar inside card
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, cardWidth, 9, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Record #${i + 1} — ${p.filename}`, margin + 4, yPos + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${p.captureDateStr}  ${normalizeTime12Hour(p.captureTimeStr, p.timestamp)}`, pageWidth - margin - 45, yPos + 6);

      const contentY = yPos + 14;

      // Image Thumbnail on Left
      const imgWidth = 72;
      const imgHeight = 84;
      try {
        const imgSrc = p.thumbnailDataUrl || p.stampedDataUrl;
        doc.addImage(imgSrc, 'JPEG', margin + 4, contentY, imgWidth, imgHeight, undefined, 'FAST');
      } catch {
        // Fallback placeholder if image load fails
        doc.setFillColor(241, 245, 249);
        doc.rect(margin + 4, contentY, imgWidth, imgHeight, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.text('Image Preview', margin + 20, contentY + 40);
      }

      // Metadata on Right
      const metaX = margin + imgWidth + 10;
      let textY = contentY + 4;
      const lineGap = 6.2;

      const printField = (label: string, value: string, isAccent = false) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(label, metaX, textY);

        doc.setFont('helvetica', isAccent ? 'bold' : 'normal');
        if (isAccent) {
          doc.setTextColor(14, 116, 144);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        doc.text(value, metaX + 32, textY);
        textY += lineGap;
      };

      printField('Worker Name:', p.workerName || 'Not Assigned', true);
      printField('Work Category:', p.workCategoryName || 'General Maintenance');
      printField('Ward & Area:', `${p.wardNumber || 'Ward not identified'}${p.area ? ` - ${p.area}` : ''}`);
      printField('Latitude:', `${p.location.latitude.toFixed(6)}°`);
      printField('Longitude:', `${p.location.longitude.toFixed(6)}°`);
      printField('GPS Accuracy:', `±${p.location.accuracy} meters`);
      printField('Compass Bearing:', p.compassDirection || p.location.compassDirection || 'Direction unavailable');
      printField('Postal PIN:', p.address.pinCode || 'PIN code unavailable', p.address.isVerifiedPin);

      // Address multiline box
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Full Address:', metaX, textY);
      textY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(7.5);
      const splitAddress = doc.splitTextToSize(p.address.fullAddress, cardWidth - imgWidth - 20);
      doc.text(splitAddress.slice(0, 3), metaX, textY);

      if (p.notes) {
        textY += 12;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        doc.text(`Notes: ${p.notes.substring(0, 70)}`, metaX, textY);
      }

      yPos += cardHeight + 8;
      recordIndexOnPage++;
    }

    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sumit Boss Report • Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    }

    return doc;
  }
}
