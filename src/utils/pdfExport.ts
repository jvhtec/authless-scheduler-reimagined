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
      const logoUrl = 'public/assets/logo.png'; // Replace with your actual path
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
        const tableHeight = calculateTableHeight(doc, table.rows.length);
        if (yPosition + tableHeight > pageHeight - 30) {
          addLogoToBottom(doc, logoImg, pageWidth, pageHeight);
          doc.addPage();
          yPosition = 20;
        }

        doc.setFillColor(245, 245, 250);
        doc.rect(14, yPosition - 6, pageWidth - 28, 10, 'F');
        doc.setFontSize(14);
        doc.setTextColor(59, 59, 13);
        doc.text(table.name, 14, yPosition);
        yPosition += 10;

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
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
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

// Utility: Add Logo to the bottom
const addLogoToBottom = (
  doc: jsPDF,
  img: HTMLImageElement,
  pageWidth: number,
  pageHeight: number
) => {
  const logoWidth = 50;
  const logoHeight = 15;
  const x = (pageWidth - logoWidth) / 2;
  const y = pageHeight - 20;
  doc.addImage(img, 'PNG', x, y, logoWidth, logoHeight);
};

// Utility: Calculate table height
const calculateTableHeight = (doc: jsPDF, rowCount: number): number => {
  const rowHeight = 10;
  const headerHeight = 10;
  return headerHeight + rowCount * rowHeight;
};
