import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PowerSummary {
  totalSystemWatts: number;
  totalSystemAmps: number;
}

// Update the ExtendedJsPDF interface to match jsPDF's internal types
interface ExtendedJsPDF extends jsPDF {
  internal: {
    events: {
      subscribe: (event: string, callback: Function) => string;
      unsubscribe: (event: string, callback: Function) => void;
      getTopics: () => { [key: string]: Function[] };
    };
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

export const exportToPDF = async (
  title: string,
  tables: any[],
  toolType: string,
  jobTitle: string,
  location?: string,
  additionalData?: any[],
  powerSummary?: PowerSummary,
  safetyMargin?: number
): Promise<Blob> => {
  const doc = new jsPDF() as ExtendedJsPDF;

  // Set up the PDF document
  doc.setFontSize(20);
  doc.text(title, 14, 22);
  doc.setFontSize(12);
  doc.text(`Job Title: ${jobTitle}`, 14, 30);
  if (location) {
    doc.text(`Location: ${location}`, 14, 36);
  }
  doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd')}`, 14, 42);

  // Add power summary if provided
  if (powerSummary) {
    doc.text(`Total System Watts: ${powerSummary.totalSystemWatts}`, 14, 50);
    doc.text(`Total System Amps: ${powerSummary.totalSystemAmps}`, 14, 56);
  }

  // Add tables to the PDF
  tables.forEach((table, index) => {
    doc.addPage();
    autoTable(doc, {
      head: [['Quantity', 'Component', 'Watts (per unit)', 'Total Watts']],
      body: table.rows.map(row => [
        row.quantity,
        row.componentName,
        row.watts,
        row.totalWatts?.toFixed(2)
      ]),
      startY: 20,
    });
    doc.text(`Table Name: ${table.name}`, 14, 10);
  });

  return doc.output('blob');
};
