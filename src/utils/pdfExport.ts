import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PubSub {
  events: Record<string, Function[]>;
  subscribe: (event: string, callback: Function) => void;
  unsubscribe: (event: string, callback: Function) => void;
  publish: (event: string, ...args: any[]) => void;
}

interface ExtendedJsPDF extends jsPDF {
  internal: {
    events: PubSub;
    scaleFactor: number;
    pageSize: {
      width: number;
      getWidth: () => number;
      height: number;
      getHeight: () => number;
    };
    pages: number[];
    getEncryptor: (objectId: number) => (data: string) => string;
    getNumberOfPages: () => number;
  };
}

interface TableRow {
  quantity: string;
  componentId: string;
  componentName?: string;
  weight?: string;
  totalWeight?: number;
  watts?: string;
  totalWatts?: number;
}

interface Table {
  name: string;
  rows: TableRow[];
  totalWeight?: number;
  totalWatts?: number;
  currentPerPhase?: number;
  pduType?: string;
  toolType?: 'pesos' | 'consumos';
  dualMotors?: boolean;
  riggingPoints?: string;
}

interface SummaryRow {
  clusterName: string;
  riggingPoints: string;
  clusterWeight: number;
}

interface PowerSummary {
  totalSystemWatts: number;
  totalSystemAmps: number;
}

export const exportToPDF = async (
  jobTitle: string,
  tables: Table[],
  type: 'weight' | 'power',
  title: string,
  date?: string,
  summaryRows?: SummaryRow[],
  powerSummary?: PowerSummary,
  safetyMargin?: number
): Promise<Blob> => {
  const doc = new jsPDF() as ExtendedJsPDF;
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const effectiveWidth = pageWidth - 2 * margin;

  // Add header with job title and date
  doc.setFontSize(16);
  doc.text(jobTitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  if (date) {
    doc.setFontSize(12);
    doc.text(date, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
  }

  // Add tables
  tables.forEach((table, index) => {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Table header
    doc.setFontSize(12);
    doc.text(table.name, margin, yPos);
    yPos += 10;

    // Table content
    const tableData = table.rows.map((row) => {
      if (type === 'weight') {
        return [
          row.quantity,
          row.componentName,
          row.weight,
          row.totalWeight?.toFixed(2),
        ];
      } else {
        return [
          row.quantity,
          row.componentName,
          row.watts,
          row.totalWatts?.toFixed(2),
        ];
      }
    });

    const headers = type === 'weight'
      ? [['Quantity', 'Component', 'Weight (kg)', 'Total (kg)']]
      : [['Quantity', 'Component', 'Watts', 'Total Watts']];

    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
    });

    // Update yPos after table
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Add totals
    if (type === 'weight') {
      doc.text(
        `Total Weight: ${table.totalWeight?.toFixed(2)} kg`,
        pageWidth - margin,
        yPos,
        { align: 'right' }
      );
    } else {
      doc.text(
        `Total Power: ${table.totalWatts?.toFixed(2)} W`,
        pageWidth - margin,
        yPos,
        { align: 'right' }
      );
      yPos += 5;
      if (table.currentPerPhase) {
        doc.text(
          `Current per Phase: ${table.currentPerPhase?.toFixed(2)} A`,
          pageWidth - margin,
          yPos,
          { align: 'right' }
        );
      }
      yPos += 5;
      if (table.pduType) {
        doc.text(
          `PDU Type: ${table.pduType}`,
          pageWidth - margin,
          yPos,
          { align: 'right' }
        );
      }
    }

    yPos += 15;

    // Add rigging points information if available
    if (table.riggingPoints) {
      doc.setFontSize(10);
      doc.text(
        `Rigging Points: ${table.riggingPoints}`,
        margin,
        yPos
      );
      yPos += 10;
    }

    // Add a separator between tables
    if (index < tables.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }
  });

  // Add summary section if provided
  if (summaryRows && summaryRows.length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      yPos = 20;
    }

    // Summary header
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Summary', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Summary table
    const summaryData = summaryRows.map((row) => [
      row.clusterName,
      row.riggingPoints,
      `${row.clusterWeight.toFixed(2)} kg`,
    ]);

    autoTable(doc, {
      head: [['Cluster', 'Rigging Points', 'Weight']],
      body: summaryData,
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Add power summary if provided
  if (powerSummary) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 10;
    doc.setFontSize(14);
    doc.text('Power Summary', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total System Power: ${powerSummary.totalSystemWatts.toFixed(2)} W`, margin, yPos);
    yPos += 7;
    doc.text(`Total System Current: ${powerSummary.totalSystemAmps.toFixed(2)} A`, margin, yPos);

    if (typeof safetyMargin === 'number') {
      yPos += 7;
      doc.text(`Safety Margin Applied: ${safetyMargin}%`, margin, yPos);
    }
  }

  // Return as blob
  return doc.output('blob');
};