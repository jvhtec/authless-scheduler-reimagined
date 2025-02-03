import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Exports a tour report PDF.
 *
 * The report header contains the tour name and the date span.
 * The table lists tour dates and their associated locations.
 * The table’s bottom margin is set so that it does not overlap the logo.
 *
 * @param tourName - The tour name to be displayed in the header.
 * @param dateSpan - The tour date span (e.g. "01/01/2025 - 01/15/2025").
 * @param rows - An array of objects with keys "date" and "location".
 * @returns A Promise that resolves to a Blob containing the PDF.
 */
export const exportTourPDF = (
  tourName: string,
  dateSpan: string,
  rows: { date: string; location: string }[]
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const createdDate = new Date().toLocaleDateString("en-GB");

    // ----- HEADER SECTION -----
    // Tour Name
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text(tourName, pageWidth / 2, 20, { align: "center" });

    // Date span below the tour name
    doc.setFontSize(16);
    doc.text(dateSpan, pageWidth / 2, 30, { align: "center" });

    // ----- TABLE SECTION -----
    // Set the starting y position below the header.
    const yStart = 40;
    const tableHeaders = [["Date", "Location"]];
    const tableRows = rows.map((row) => [row.date, row.location]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: yStart,
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
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const xPosition = (pageWidth - logoWidth) / 2;
        const yLogo = pageHeight - 20;
        try {
          doc.addImage(logo, "PNG", xPosition, yLogo - logoHeight, logoWidth, logoHeight);
        } catch (error) {
          console.error(`Error adding logo on page ${i}:`, error);
        }
      }
      // Add created date on the last page.
      doc.setPage(totalPages);
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Created: ${createdDate}`, pageWidth - 10, pageHeight - 10, { align: "right" });
      const blob = doc.output("blob");
      resolve(blob);
    };

    logo.onerror = () => {
      console.error("Failed to load logo");
      const totalPages = doc.internal.getNumberOfPages();
      doc.setPage(totalPages);
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Created: ${createdDate}`, pageWidth - 10, pageHeight - 10, { align: "right" });
      const blob = doc.output("blob");
      resolve(blob);
    };
  });
};