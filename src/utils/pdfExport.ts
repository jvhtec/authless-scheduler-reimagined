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
  totalSystem?: { totalSystemWatts?: number; totalSystemAmps?: number; totalSystemWeight?: number }
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add title with project name
    doc.setFontSize(24);
    doc.setTextColor(51, 51, 51);
    doc.text(projectName, pageWidth / 2, 20, { align: 'center' });
    
    // Add subtitle based on type
    doc.setFontSize(16);
    doc.setTextColor(102, 102, 102);
    doc.text(
      type === 'power' ? 'Power Consumption Report' : 'Weight Distribution Report',
      pageWidth / 2,
      30,
      { align: 'center' }
    );
    
    // Add date
    doc.setFontSize(12);
    doc.setTextColor(115, 115, 115);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 40, { align: 'center' });
    
    let yPosition = 50;
    
    tables.forEach((table, index) => {
      // Table header
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text(table.name, 14, yPosition);
      yPosition += 10;
      
      // Table content
      const tableRows = table.rows.map(row => {
        if (type === 'weight') {
          return [
            row.quantity,
            row.componentName || '',
            row.weight || '',
            row.totalWeight?.toFixed(2) || ''
          ];
        } else {
          return [
            row.quantity,
            row.componentName || '',
            row.watts || '',
            row.totalWatts?.toFixed(2) || ''
          ];
        }
      });
      
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
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [69, 78, 86],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [68, 68, 68],
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      // Add table totals
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      if (type === 'weight' && table.totalWeight) {
        doc.text(`Total Weight: ${table.totalWeight.toFixed(2)} kg`, 14, yPosition);
      } else if (type === 'power') {
        if (table.totalWatts) {
          doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);
        }
        if (table.currentPerPhase) {
          doc.text(`Current per Phase: ${table.currentPerPhase.toFixed(2)} A`, 14, yPosition + 7);
          yPosition += 7;
        }
        if (table.dualMotors) {
          yPosition += 7;
          doc.setFontSize(9);
          doc.setTextColor(128, 128, 128);  // Gray color for the disclaimer
          doc.text(
            '*This configuration uses dual motors. Load is distributed between two motors for safety and redundancy.',
            14,
            yPosition
          );
        }
      }
      
      
      yPosition += 20;
      
      // Add page if needed
      if (yPosition > doc.internal.pageSize.height - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    // Add system summary
    if (totalSystem) {
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text('Total System Summary', 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(11);
      if (type === 'power') {
        if (totalSystem.totalSystemWatts) {
          doc.text(`Total System Power: ${totalSystem.totalSystemWatts.toFixed(2)} W`, 14, yPosition);
          yPosition += 7;
        }
        if (totalSystem.totalSystemAmps) {
          doc.text(`Total System Current per Phase: ${totalSystem.totalSystemAmps.toFixed(2)} A`, 14, yPosition);
        }
      } else if (totalSystem.totalSystemWeight) {
        doc.text(`Total System Weight: ${totalSystem.totalSystemWeight.toFixed(2)} kg`, 14, yPosition);
      }
    }
    
    const blob = doc.output('blob');
    resolve(blob);
  });
};
