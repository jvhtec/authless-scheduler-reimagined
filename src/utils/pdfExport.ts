```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TableStyles {
  border?: string;
  headerBgColor?: string;
  font?: string;
  fontSize?: number;
}

interface PDFOptions {
  tableStyles?: TableStyles;
}

export const exportToPDF = async (
  jobTitle: string, 
  tables: any[], 
  type: 'weight' | 'power',
  totals: { [key: string]: number }
) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Add title
  doc.setFontSize(16);
  doc.text(`${type === 'weight' ? 'Weight' : 'Power'} Calculation - ${jobTitle}`, 14, yPos);
  yPos += 10;

  // Add date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPos);
  yPos += 15;

  tables.forEach((table, index) => {
    // Add table name
    doc.setFontSize(14);
    doc.text(table.name, 14, yPos);
    yPos += 10;

    // Create table data
    const tableData = table.rows.map((row: any) => [
      row.quantity,
      row.componentName,
      row.weight,
      row.totalWeight?.toFixed(2)
    ]);

    // Add table total row
    tableData.push([
      '',
      '',
      'Total:',
      table.totalWeight?.toFixed(2)
    ]);

    // Generate table
    doc.autoTable({
      startY: yPos,
      head: [['Quantity', 'Component', type === 'weight' ? 'Weight (per unit)' : 'Power (per unit)', 'Total']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 80 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Add page if needed
    if (yPos > 250 && index < tables.length - 1) {
      doc.addPage();
      yPos = 20;
    }
  });

  // Add system total
  doc.setFontSize(14);
  doc.text(
    `Total System ${type === 'weight' ? 'Weight' : 'Power'}: ${totals.totalSystemWeight?.toFixed(2)}${type === 'weight' ? ' kg' : ' kW'}`,
    14,
    yPos
  );

  return doc.output('blob');
};
```