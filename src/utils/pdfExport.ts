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

interface PowerSystemSummary {
  totalSystemWatts: number;
  totalSystemAmps: number;
}

export const exportToPDF = (
  projectName: string,
  tables: ExportTable[],
  type: 'weight' | 'power',
  jobName: string,
  powerSummary?: PowerSystemSummary
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Load the logo from the assets folder
      const logoUrl = '/public/lovable-uploads/sector pro logo.png'; // Replace with the actual path to the logo
      const logoImg = await loadImage(logoUrl);

      // Add Header
      doc.setFillColor(59, 59, 13);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      const title = type === 'weight' ? "Weight Distribution Report" : "Power Distribution Report";
      doc.text(title, pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(16);
      doc.text(jobName || 'Untitled Job', pageWidth / 2, 30, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 50);

      let yPosition = 60;

      tables.forEach((table, index) => {
        // Check available space on the current page
        const tableHeight = calculateTableHeight(doc, table.rows.length);
        if (yPosition + tableHeight > pageHeight - 30) {
          addLogoToBottom(doc, logoImg, pageWidth, pageHeight);
          doc.addPage();
          yPosition = 20;
        }

        // Add Table Header
        doc.setFillColor(245, 245, 250);
        doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');
        doc.setFontSize(14);
        doc.setTextColor(59, 59, 13);
        doc.text(table.name, 14, yPosition);
        yPosition += 10;

        // Prepare table content
        const tableRows = table.rows.map(row => [
          row.quantity,
          row.componentName || '',
          type === 'weight' ? row.weight || '' : row.watts || '',
          type === 'weight' ? row.totalWeight?.toFixed(2) || '' : row.totalWatts?.toFixed(2) || ''
        ]);

        const headers = type === 'weight'
          ? [['Quantity', 'Component', 'Weight (per unit)', 'Total Weight']]
          : [['Quantity', 'Component', 'Watts (per unit)', 'Total Watts']];

        autoTable(doc, {
          head: headers,
          body: tableRows,
          startY: yPosition,
          theme: 'grid',
          styles: {
            fontSize: 10,
            cellPadding: 5,
            lineColor: [220, 220, 230],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [59, 59, 13],
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

        // Add Table Totals
        doc.setFillColor(245, 245, 250);
        doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');
        doc.setFontSize(11);
        doc.setTextColor(59, 59, 13);
        if (type === 'weight' && table.totalWeight) {
          doc.text(`Total Weight: ${table.totalWeight.toFixed(2)} kg`, 14, yPosition);
        } else if (type === 'power' && table.totalWatts) {
          doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);
          if (table.currentPerPhase) {
            yPosition += 7;
            doc.text(`Current per Phase: ${table.currentPerPhase.toFixed(2)} A`, 14, yPosition);
          }
        }

        yPosition += 20;
      });

      // Add Logo to the last page
      addLogoToBottom(doc, logoImg, pageWidth, pageHeight);

      const blob = doc.output('blob');
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
};

// Utility: Load the image dynamically
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

// Utility: Add Logo to the bottom of the page
const addLogoToBottom = (
  doc: jsPDF,
  img: HTMLImageElement,
  pageWidth: number,
  pageHeight: number
) => {
  const logoWidth = 50;
  const logoHeight = 7;
  const x = (pageWidth - logoWidth) / 2;
  const y = pageHeight - 20;
  doc.addImage(img, 'PNG', x, y, logoWidth, logoHeight);
};

// Utility: Calculate table height
const calculateTableHeight = (doc: jsPDF, rowCount: number): number => {
  const rowHeight = 10; // Approximate height per row
  const headerHeight = 10; // Height for the table header
  return headerHeight + rowCount * rowHeight;
};
