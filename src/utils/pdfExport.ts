import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    const logoBase64 = 'data:image/png;base64,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';


    // Header
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
        // Add logo to the bottom of the current page before adding a new page
        addLogoToBottom(doc, pageWidth, pageHeight, logoBase64);
        doc.addPage();
        yPosition = 20; // Reset yPosition for the new page
      }

      // Table Header
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');
      doc.setFontSize(14);
      doc.setTextColor(59, 59, 13);
      doc.text(table.name, 14, yPosition);
      yPosition += 10;

      // Table Content
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
        willDrawCell: (data) => {
          if (data.row.section === 'body' && yPosition + data.cell.height > pageHeight - 30) {
            addLogoToBottom(doc, pageWidth, pageHeight, logoBase64);
            doc.addPage();
            yPosition = 20; // Reset yPosition for the new page
          }
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

    // Add Logo to the Last Page
    addLogoToBottom(doc, pageWidth, pageHeight, logoBase64);

    const blob = doc.output('blob');
    resolve(blob);
  });
};

// Utility: Calculate estimated table height based on rows
const calculateTableHeight = (doc: jsPDF, rowCount: number): number => {
  const rowHeight = 10; // Approximate height per row
  const headerHeight = 10; // Height for the table header
  const totalHeight = headerHeight + rowCount * rowHeight;
  return totalHeight;
};

// Utility: Add Logo to the bottom of the page
const addLogoToBottom = (doc: jsPDF, pageWidth: number, pageHeight: number, logoBase64: string) => {
  const logoWidth = 50; // Desired width in mm
  const logoHeight = 15; // Desired height in mm
  doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, pageHeight - 20, logoWidth, logoHeight);
};
