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
  totalWatts?: number;
  currentPerPhase?: number;
}

export const exportToPDF = (
  projectName: string, 
  tables: ExportTable[], 
  type: 'weight' | 'power',
  totalSystem?: { 
    totalSystemWatts?: number; 
    totalSystemAmps?: number; 
    totalSystemWeight?: number; 
  }
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add title
    doc.setFontSize(20);
    doc.text(projectName || 'Project Report', pageWidth / 2, 20, { align: 'center' });
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    let yPosition = 40;
    
    tables.forEach((table, index) => {
      // Table header
      doc.setFontSize(14);
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
        styles: { fontSize: 10 },
        headStyles: { fillColor: [100, 100, 100] }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      // Add table totals
      if (type === 'weight' && table.totalWeight) {
        doc.text(`Total Weight: ${table.totalWeight.toFixed(2)}`, 14, yPosition);
      } else if (type === 'power') {
        if (table.totalWatts) {
          doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);
        }
        if (table.currentPerPhase) {
          doc.text(`Current per Phase: ${table.currentPerPhase.toFixed(2)} A`, 14, yPosition + 7);
          yPosition += 7;
        }
      }
      
      yPosition += 20;
      
      // Add page if needed
      if (yPosition > doc.internal.pageSize.height - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    // Add system summary if provided
    if (totalSystem) {
      doc.setFontSize(14);
      doc.text('Total System Summary', 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      if (type === 'power') {
        if (totalSystem.totalSystemWatts) {
          doc.text(`Total System Power: ${totalSystem.totalSystemWatts.toFixed(2)} W`, 14, yPosition);
          yPosition += 7;
        }
        if (totalSystem.totalSystemAmps) {
          doc.text(`Total System Current per Phase: ${totalSystem.totalSystemAmps.toFixed(2)} A`, 14, yPosition);
        }
      } else if (totalSystem.totalSystemWeight) {
        doc.text(`Total System Weight: ${totalSystem.totalSystemWeight.toFixed(2)}`, 14, yPosition);
      }
    }
      
    // Instead of saving, return blob
    const blob = doc.output('blob');
    resolve(blob);
  });
};