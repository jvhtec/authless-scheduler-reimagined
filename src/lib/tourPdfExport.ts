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
      const createdDate = new Date().toLocaleDateString('en-GB');

      // === HEADER SECTION ===
      doc.setFillColor(125, 1, 1);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("Tour Schedule", pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(16);
      doc.text(tourName, pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(dateSpan, pageWidth / 2, 38, { align: 'center' });

      // === TABLE SECTION ===
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

      // === PAGE NUMBERS SECTION ===
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // === LOGO & CREATED DATE SECTION ===
      // Add the company logo on every page and on the last page add the created date.
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = '/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png';

      logo.onload = () => {
        // Convert the logo image to a data URL via a canvas
        const canvas = document.createElement('canvas');
        canvas.width = logo.width;
        canvas.height = logo.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logo, 0, 0);
        }
        const dataURL = canvas.toDataURL('image/png');

        const logoWidth = 50;
        const logoHeight = logoWidth * (logo.height / logo.width);
        const totalPagesAfterLogo = doc.internal.getNumberOfPages();

        // Loop through every page and add the logo
        for (let i = 1; i <= totalPagesAfterLogo; i++) {
          doc.setPage(i);
          const xPosition = (pageWidth - logoWidth) / 2;
          const yLogo = pageHeight - 20;
          try {
            doc.addImage(dataURL, 'PNG', xPosition, yLogo - logoHeight, logoWidth, logoHeight);
          } catch (error) {
            console.error(`Error adding logo on page ${i}:`, error);
          }
        }
        // On the last page, add the created date at the bottom right.
        doc.setPage(totalPagesAfterLogo);
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text(`Created: ${createdDate}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
        const blob = doc.output('blob');
        resolve(blob);
      };

      logo.onerror = () => {
        console.error('Failed to load logo');
        const totalPagesAfterLogo = doc.internal.getNumberOfPages();
        doc.setPage(totalPagesAfterLogo);
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text(`Created: ${createdDate}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
        const blob = doc.output('blob');
        resolve(blob);
      };

    } catch (error) {
      console.error("Error in PDF generation:", error);
      reject(error);
    }
  });
};
