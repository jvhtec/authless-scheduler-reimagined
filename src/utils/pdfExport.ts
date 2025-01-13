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

    const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAxoAAABkCAYAAAF2h3boAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAACwuSURBVHhe7Z0H+CxL...'; // Full Base64 string

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
