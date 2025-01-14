import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportTableRow {
  quantity: string;
  componentName?: string;
  weight?: string;
  watts?: string;
  totalWeight?: number;
  totalWatts?: number;
}

interface ExportTable {
  name: string;
  rows: ExportTableRow[];
  totalWeight?: number;
  dualMotors?: boolean;
  totalWatts?: number;
  currentPerPhase?: number;
}

export const exportToPDF = async (
  projectName: string,
  tables: ExportTable[],
  type: 'weight' | 'power',
  jobName: string
): Promise<Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Corporate Color (125, 1, 1)
  const corporateColor = [125, 1, 1];

  // Add header
  doc.setFillColor(...corporateColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Add title
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  const title = type === 'weight' ? "Weight Distribution Report" : "Power Distribution Report";
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Add job name as subtitle
  doc.setFontSize(16);
  doc.text(jobName || 'Untitled Job', pageWidth / 2, 30, { align: 'center' });

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 50);

  let yPosition = 60;

  tables.forEach((table, index) => {
    // Table header
    doc.setFillColor(245, 245, 250);
    doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');

    doc.setFontSize(14);
    doc.setTextColor(...corporateColor);
    doc.text(table.name, 14, yPosition);
    yPosition += 10;

    // Table content
    const tableRows = table.rows.map((row) => [
      row.quantity,
      row.componentName || '',
      type === 'weight' ? row.weight || '' : row.watts || '',
      type === 'weight' ? row.totalWeight?.toFixed(2) || '' : row.totalWatts?.toFixed(2) || '',
    ]);

    const headers =
      type === 'weight'
        ? [['Quantity', 'Component', 'Weight (per unit)', 'Total Weight']]
        : [['Quantity', 'Component', 'Watts (per unit)', 'Total Watts']];

    autoTable(doc, {
      head: headers,
      body: tableRows,
      startY: yPosition,
      theme: 'grid',
      pageBreak: 'avoid', // Avoid breaking tables across pages
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineColor: [220, 220, 230],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: corporateColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [51, 51, 51],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 255],
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Total weight or power
    if (type === 'weight' && table.totalWeight) {
      doc.text(`Total Weight: ${table.totalWeight.toFixed(2)} kg`, 14, yPosition);
    } else if (type === 'power' && table.totalWatts) {
      doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);
    }

    yPosition += 20;

    if (yPosition > doc.internal.pageSize.height - 40 && index < tables.length - 1) {
      doc.addPage();
      yPosition = 20;
    }
  });

  // Add Logo to the bottom of the last page
  const logoURL = '/public/lovable-uploads/sector pro logo.png';
  const logoWidth = 50;
  const logoHeight = 7;

  return new Promise((resolve) => {
    const img = new Image();
    img.src = logoURL;
    img.crossOrigin = 'Anonymous'; // Ensure proper loading for external images
    img.onload = () => {
      const totalPages = doc.getNumberOfPages();
      doc.setPage(totalPages);
      doc.addImage(img, 'PNG', (pageWidth - logoWidth) / 2, pageHeight - logoHeight - 10, logoWidth, logoHeight);

      // Output as Blob
      const blob = doc.output('blob');
      resolve(blob);
    };

    img.onerror = () => {
      console.error("Failed to load the logo image.");
      const blob = doc.output('blob');
      resolve(blob);
    };
  });
};
