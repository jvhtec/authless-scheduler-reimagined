import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TourDate {
  date: string;
  location: string;
}

export const exportTourPDF = async (
  tourName: string,
  dateSpan: string,
  rows: TourDate[]
): Promise<Blob> => {
  console.log("Starting PDF export with data:", { tourName, dateSpan, rows });
  
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(tourName, 14, 15);
  
  // Add date span
  doc.setFontSize(12);
  doc.text(`Dates: ${dateSpan}`, 14, 25);
  
  // Add table
  autoTable(doc, {
    head: [['Date', 'Location']],
    body: rows.map(row => [row.date, row.location]),
    startY: 35,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [126, 105, 171],
      textColor: 255,
      fontStyle: 'bold',
    },
  });
  
  console.log("PDF generation completed");
  return doc.output('blob');
};