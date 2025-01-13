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
  dualMotors?: boolean;  // Add this line
  totalWatts?: number;
  currentPerPhase?: number;
}

export const exportToPDF = (
  projectName: string, 
  tables: ExportTable[], 
  type: 'weight' | 'power',
  jobName?: string
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add company logo or header
    doc.setFillColor(51, 51, 153); // Dark blue header
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Add title with job name
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Weight Distribution Report", pageWidth / 2, 20, { align: 'center' });
    
    // Add job name as subtitle
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(jobName || 'Untitled Job', pageWidth / 2, 30, { align: 'center' });
    
    // Add date with more elegant styling
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 50);
    
    let yPosition = 60;
    
    tables.forEach((table, index) => {
      // Table header with elegant styling
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 153);
      doc.text(table.name, 14, yPosition);
      yPosition += 10;
      
      // Table content with improved styling
      const tableRows = table.rows.map(row => [
        row.quantity,
        row.componentName || '',
        row.weight || '',
        row.totalWeight?.toFixed(2) || ''
      ]);
      
      autoTable(doc, {
        head: [['Quantity', 'Component', 'Weight (per unit)', 'Total Weight']],
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
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      // Table totals with improved styling
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 153);
      if (table.totalWeight) {
        doc.text(`Total Weight: ${table.totalWeight.toFixed(2)} kg`, 14, yPosition);
      }
      
      // Add dual motors disclaimer if applicable
      if (table.dualMotors) {
        yPosition += 7;
        doc.setFontSize(9);
        doc.setTextColor(102, 102, 153);
        doc.text(
          '*This configuration uses dual motors. Load is distributed between two motors for safety and redundancy.',
          14,
          yPosition,
        );
      }
      
      yPosition += 20;
      
      // Add page if needed
      if (yPosition > doc.internal.pageSize.height - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    const blob = doc.output('blob');
    resolve(blob);
  });
};
