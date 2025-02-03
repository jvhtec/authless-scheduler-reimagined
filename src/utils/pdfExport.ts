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
  toolType?: 'pesos' | 'consumos';
  pduType?: string;
  customPduType?: string;
  includesHoist?: boolean;
}

export interface SummaryRow {
  clusterName: string;
  riggingPoints: string;
  clusterWeight: number;
}

/**
 * Function signature updated so that:
 * 1. projectName
 * 2. tables
 * 3. type ('weight' | 'power')
 * 4. jobName
 * 5. summaryRows (optional)
 * 6. powerSummary (optional)
 * 7. safetyMargin (optional)
 */
export const exportToPDF = (
  projectName: string,
  tables: ExportTable[],
  type: 'weight' | 'power',
  jobName: string,
  summaryRows?: SummaryRow[],
  powerSummary?: { totalSystemWatts: number; totalSystemAmps: number },
  safetyMargin?: number
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // HEADER SECTION
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

    // Safety Margin (if applicable)
    if (safetyMargin !== undefined) {
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Safety Margin Applied: ${safetyMargin}%`, 14, 50);
    }

    // Date
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 60);

    let yPosition = 70;

    // PROCESS EACH TABLE
    tables.forEach((table, index) => {
      // Section header background for each table
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');

      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      
      // For power reports, append PDU type if provided.
      let displayName = table.name;
      if (type === 'power' && (table.customPduType || table.pduType)) {
        displayName = `${table.name} (${table.customPduType || table.pduType})`;
      }
      
      doc.text(displayName, 14, yPosition);
      yPosition += 10;

      // Build the rows for the table.
      const tableRows = table.rows.map((row) => [
        row.quantity,
        row.componentName || '',
        type === 'weight' ? row.weight || '' : row.watts || '',
        type === 'weight'
          ? row.totalWeight !== undefined ? row.totalWeight.toFixed(2) : ''
          : row.totalWatts !== undefined ? row.totalWatts.toFixed(2) : ''
      ]);

      // Add total row for weight reports if available.
      if (type === 'weight' && table.totalWeight !== undefined) {
        tableRows.push([
          '',
          'Total Weight',
          '',
          table.totalWeight.toFixed(2)
        ]);
      }

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

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      if (type === 'power') {
        if (table.totalWatts !== undefined) {
          doc.setFillColor(245, 245, 250);
          doc.rect(14, yPosition - 6, pageWidth - 28, 20, 'F');

          doc.setFontSize(11);
          doc.setTextColor(125, 1, 1);
          doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);
          
          if (table.currentPerPhase !== undefined) {
            yPosition += 7;
            doc.text(`Current per Phase: ${table.currentPerPhase.toFixed(2)} A`, 14, yPosition);
          }
          
          yPosition += 10;
        }

        // If the table includes hoist power requirement, add the note.
        if (table.includesHoist) {
          doc.setFontSize(10);
          doc.setTextColor(51, 51, 51);
          doc.setFont(undefined, 'italic');
          doc.text(`Additional Hoist Power Required for ${table.name}: CEE32A 3P+N+G`, 14, yPosition);
          yPosition += 10;
          doc.setFont(undefined, 'normal');
        }
      }

      // If near the bottom of the page and more tables remain, add a new page.
      if (yPosition > pageHeight - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // SUMMARY TABLE SECTION
    if (summaryRows && summaryRows.length > 0) {
      // If there's not enough room on the current page, add a new page.
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      // Print summary header.
      doc.setFontSize(16);
      doc.setTextColor(125, 1, 1);
      doc.text("Summary", 14, yPosition);
      yPosition += 6;

      // Build summary table rows.
      const summaryData = summaryRows.map((row) => [
        row.clusterName,
        row.riggingPoints,
        row.clusterWeight.toFixed(2)
      ]);

      autoTable(doc, {
        head: [['Cluster Name', 'Rigging Points', 'Cluster Weight']],
        body: summaryData,
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

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // LOGO SECTION
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = '/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png';
    logo.onload = () => {
      doc.setPage(doc.getNumberOfPages());
      const logoWidth = 50;
      const logoHeight = logoWidth * (logo.height / logo.width);
      const xPosition = (pageWidth - logoWidth) / 2;
      const yLogo = pageHeight - 20;
      try {
        doc.addImage(logo, 'PNG', xPosition, yLogo - logoHeight, logoWidth, logoHeight);
        const blob = doc.output('blob');
        resolve(blob);
      } catch (error) {
        console.error('Error adding logo:', error);
        const blob = doc.output('blob');
        resolve(blob);
      }
    };

    // In case the logo image fails to load, resolve with the PDF anyway.
    logo.onerror = () => {
      console.error('Failed to load logo');
      const blob = doc.output('blob');
      resolve(blob);
    };
  });
};