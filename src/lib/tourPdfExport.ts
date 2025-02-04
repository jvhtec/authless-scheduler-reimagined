import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TourRow {
  date: string;
  location: string;
}

export const exportTourPDF = async (
  tourName: string,
  dateSpan: string,
  rows: TourRow[],
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Starting PDF generation with:", { tourName, dateSpan, rows });
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Header
      doc.setFillColor(125, 1, 1);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("Tour Schedule", pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(16);
      doc.text(tourName, pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(dateSpan, pageWidth / 2, 38, { align: 'center' });

      // Table
      const tableRows = rows.map(row => [row.date, row.location]);

      autoTable(doc, {
        head: [['Date', 'Location']],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [220, 220, 230],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [125, 1, 1],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: { textColor: [51, 51, 51] },
        alternateRowStyles: { fillColor: [250, 250, 255] },
      });

      // Add creation date at the bottom
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(
        `Created: ${new Date().toLocaleDateString()}`,
        pageWidth - 10,
        pageHeight - 10,
        { align: 'right' }
      );

      // Get total pages
      const totalPages = doc.internal.pages.length - 1;
      
      // Add page numbers
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      console.log("PDF generation completed successfully");
      const blob = doc.output('blob');
      resolve(blob);
    } catch (error) {
      console.error("Error in PDF generation:", error);
      reject(error);
    }
  });
};