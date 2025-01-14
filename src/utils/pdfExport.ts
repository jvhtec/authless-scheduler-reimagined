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
  return new Promise(async (resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header background
    doc.setFillColor(51, 51, 153);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    const title = type === 'weight' ? "Weight Distribution Report" : "Power Distribution Report";
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    // Subtitle (Job Name)
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(jobName || 'Untitled Job', pageWidth / 2, 30, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 50);

    let yPosition = 60;

    // Tables
    tables.forEach((table, index) => {
      // Section header
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');

      doc.setFontSize(14);
      doc.setTextColor(51, 51, 153);
      doc.text(table.name, 14, yPosition);
      yPosition += 10;

      // Table data
      const tableRows = table.rows.map((row) => [
        row.quantity,
        row.componentName || '',
        type === 'weight' ? row.weight || '' : row.watts || '',
        type === 'weight'
          ? row.totalWeight?.toFixed(2) || ''
          : row.totalWatts?.toFixed(2) || ''
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
        styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [220, 220, 230],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [51, 51, 153],
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

      // Update yPosition after autoTable
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Table totals
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');

      doc.setFontSize(11);
      doc.setTextColor(51, 51, 153);
      if (type === 'weight' && table.totalWeight) {
        doc.text(`Total Weight: ${table.totalWeight.toFixed(2)} kg`, 14, yPosition);
      } else if (type === 'power' && table.totalWatts) {
        doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);
        if (table.currentPerPhase) {
          yPosition += 7;
          doc.text(`Current per Phase: ${table.currentPerPhase.toFixed(2)} A`, 14, yPosition);
        }
      }

      // Dual motors note
      if (table.dualMotors) {
        yPosition += 7;
        doc.setFontSize(9);
        doc.setTextColor(102, 102, 153);
        doc.text(
          '*This configuration uses dual motors. Load is distributed between two motors for safety and redundancy.',
          14,
          yPosition
        );
      }

      yPosition += 20;

      // Add a new page if space is insufficient and not at the last table
      if (yPosition > doc.internal.pageSize.height - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // System summary (if power report and summary provided)
    if (powerSummary && type === 'power') {
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 30, 'F');

      doc.setFontSize(14);
      doc.setTextColor(51, 51, 153);
      doc.text("System Summary", 14, yPosition);

      yPosition += 10;
      doc.setFontSize(11);
      doc.text(`Total System Power: ${powerSummary.totalSystemWatts.toFixed(2)} W`, 14, yPosition);

      yPosition += 7;
      doc.text(`Total System Current per Phase: ${powerSummary.totalSystemAmps.toFixed(2)} A`, 14, yPosition);
      yPosition += 20;
    }

    // Finally, load and add the logo to the bottom of the last page
    const logo = new Image();
    logo.crossOrigin = 'anonymous'; // Important for embedding the image
    logo.src = '/public/sector%20pro%20logo.png';
    logo.onload = () => {
      doc.setPage(doc.getNumberOfPages());
      doc.addImage(
        logo,
        'PNG',
        (pageWidth - 50) / 2,     // Center horizontally
        doc.internal.pageSize.height - 15, // Position near bottom
        50,                       // Logo width
                                  // Logo height
      );

      // Output as Blob
      const blob = doc.output('blob');
      resolve(blob);
    };

    // If the image fails to load, still resolve with whatever we have
    logo.onerror = () => {
      const blob = doc.output('blob');
      resolve(blob);
    };
  });
};
