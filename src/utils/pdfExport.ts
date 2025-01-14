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
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header background
    doc.setFillColor(125, 1, 1);
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
      doc.setTextColor(125, 1, 1);
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
          fillColor: [125, 1, 1],
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
      doc.setTextColor(125, 1, 1);
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
      if (yPosition > pageHeight - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Add logo to the bottom of the last page
    const logo = new Image();
    logo.crossOrigin = 'anonymous'; // Important for embedding the image
    logo.src = '/public/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png';
    logo.onload = () => {
      // Set the page to the last page before adding the logo
      doc.setPage(doc.getNumberOfPages());
      
      // Calculate dimensions to maintain aspect ratio
      const logoWidth = 50; // Fixed width in mm
      const aspectRatio = logo.height / logo.width;
      const logoHeight = logoWidth * aspectRatio;
      
      // Calculate position to center horizontally and place near bottom
      const xPosition = (pageWidth - logoWidth) / 2;
      const yPosition = pageHeight - 20; // 20mm from bottom
      
      try {
        doc.addImage(
          logo,
          'PNG',
          xPosition,
          yPosition,
          logoWidth,
          logoHeight
        );
        const blob = doc.output('blob');
        resolve(blob);
      } catch (error) {
        console.error('Error adding logo:', error);
        // If logo fails, still generate PDF without it
        const blob = doc.output('blob');
        resolve(blob);
      }
    };

    // If the image fails to load, still resolve with the PDF without the logo
    logo.onerror = () => {
      console.error('Failed to load logo');
      const blob = doc.output('blob');
      resolve(blob);
    };
  });
};