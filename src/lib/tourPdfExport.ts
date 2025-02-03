import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TourRow {
  date: string;
  location: string;
}

/**
 * Exports a tour report PDF.
 * @param tourName - The name of the tour
 * @param dateSpan - The date span of the tour (e.g. "01/01/2024 - 01/31/2024")
 * @param rows - Array of tour dates and locations
 */
export const exportTourPDF = (
  tourName: string,
  dateSpan: string,
  rows: TourRow[]
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const createdDate = new Date().toLocaleDateString("en-GB");

    // ----- HEADER SECTION -----
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text(tourName, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text(dateSpan, pageWidth / 2, 30, { align: "center" });

    // ----- TABLE SECTION -----
    const tableHeaders = [["Date", "Location"]];
    const tableRows = rows.map((row) => [row.date, row.location]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 40,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineColor: [220, 220, 230],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [125, 1, 1],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { bottom: 40 },
    });

    // ----- LOGO SECTION -----
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = "/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png";
    logo.onload = () => {
      const logoWidth = 50;
      const logoHeight = logoWidth * (logo.height / logo.width);
      const xPosition = (pageWidth - logoWidth) / 2;
      const yLogo = pageHeight - 20;
      
      try {
        doc.addImage(logo, "PNG", xPosition, yLogo - logoHeight, logoWidth, logoHeight);
      } catch (error) {
        console.error("Error adding logo:", error);
      }

      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Created: ${createdDate}`, pageWidth - 10, pageHeight - 10, { align: "right" });
      
      const blob = doc.output("blob");
      resolve(blob);
    };

    logo.onerror = () => {
      console.error("Failed to load logo");
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Created: ${createdDate}`, pageWidth - 10, pageHeight - 10, { align: "right" });
      const blob = doc.output("blob");
      resolve(blob);
    };
  });
};