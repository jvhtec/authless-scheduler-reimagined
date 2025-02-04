import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TourRow {
  date: string;
  location: string;
}

export const exportTourPDF = (
  tourName: string,
  dateSpan: string,
  rows: TourRow[],
): Promise<Blob> => {
  return new Promise((resolve) => {
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

    // Logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = '/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png';
    logo.onload = () => {
      const logoWidth = 50;
      const logoHeight = logoWidth * (logo.height / logo.width);
      const xPosition = (pageWidth - logoWidth) / 2;
      const yLogo = pageHeight - 20;

      try {
        doc.addImage(logo, 'PNG', xPosition, yLogo - logoHeight, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo:', error);
      }

      // Add creation date at the bottom
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(
        `Created: ${new Date().toLocaleDateString()}`,
        pageWidth - 10,
        pageHeight - 10,
        { align: 'right' }
      );

      const blob = doc.output('blob');
      resolve(blob);
    };

    logo.onerror = () => {
      console.error('Failed to load logo');
      const blob = doc.output('blob');
      resolve(blob);
    };
  });
};