import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportTableRow {
  quantity: string;
  componentName?: string;
  weight?: string;
  watts?: string;
  totalWeight?: number;
  totalWatts?: number;
}

export interface ExportTable {
  name: string;
  rows: ExportTableRow[];
  totalWeight?: number;
  dualMotors?: boolean;
  totalWatts?: number;
  currentPerPhase?: number;
  toolType?: "pesos" | "consumos";
  pduType?: string;
  customPduType?: string;
  includesHoist?: boolean;
}

export interface SummaryRow {
  clusterName: string;
  riggingPoints: string;
  clusterWeight: number;
}

/**
 * Exports the provided tables and summary information to a PDF.
 *
 * @param projectName - The name of the project.
 * @param tables - An array of export tables.
 * @param type - 'weight' or 'power'
 * @param jobName - The name of the job.
 * @param jobDate - The date of the job.
 * @param summaryRows - (Optional) Summary rows for "pesos" reports.
 * @param powerSummary - (Optional) Total power system details.
 * @param safetyMargin - (Optional) The safety margin applied.
 * @param options - (Optional) Extra options. When options.isTourReport is true, a custom header and table layout are used.
 * @returns A Promise that resolves to a Blob containing the PDF.
 */
export const exportToPDF = (
  projectName: string,
  tables: ExportTable[],
  type: "weight" | "power",
  jobName: string,
  jobDate: string,
  summaryRows?: SummaryRow[],
  powerSummary?: { totalSystemWatts: number; totalSystemAmps: number },
  safetyMargin?: number,
  options?: { isTourReport?: boolean; dateSpan?: string }
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF() as ExtendedJsPDF;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const createdDate = new Date().toLocaleDateString("en-GB");

    // ----- CUSTOM TOUR REPORT BRANCH -----
    if (options?.isTourReport) {
      // Draw a simple header with the tour name and its date span.
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(projectName, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(16);
      const dateSpan = options.dateSpan || jobDate;
      doc.text(dateSpan, pageWidth / 2, 30, { align: "center" });

      // Start the table below the header.
      const yStart = 40;
      // Use fixed headers for tour reports.
      const tableHeaders = [["Date", "Location"]];
      // Map table rows to use only the two desired columns.
      const tableRows = tables[0].rows.map((row) => [
        row.quantity,
        row.componentName || "",
      ]);

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
        // Ensure a bottom margin so the table never overlaps the logo.
        margin: { bottom: 40 },
      });

      // ----- ADD THE LOGO (same as default) -----
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

      return; // Exit after handling the tour report branch.
    }

    // ----- DEFAULT REPORT (unchanged) -----
    // HEADER SECTION (for main tables)
    doc.setFillColor(125, 1, 1);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    const title =
      type === "weight"
        ? "Weight Distribution Report"
        : "Power Distribution Report";
    doc.text(title, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text(jobName || "Untitled Job", pageWidth / 2, 30, { align: "center" });
    // Print job date below the job name.
    doc.setFontSize(12);
    doc.text(`Job Date: ${jobDate}`, pageWidth / 2, 38, { align: "center" });

    if (safetyMargin !== undefined) {
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Safety Margin Applied: ${safetyMargin}%`, 14, 50);
    }
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 60);

    let yPosition = 70;

    // MAIN TABLES SECTION
    tables.forEach((table, index) => {
      doc.setFillColor(245, 245, 250);
      doc.rect(14, yPosition - 6, pageWidth - 28, 10, "F");

      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);

      let displayName = table.name;
      if (type === "power" && (table.customPduType || table.pduType)) {
        displayName = `${table.name} (${table.customPduType || table.pduType})`;
      }
      doc.text(displayName, 14, yPosition);
      yPosition += 10;

      const tableRows = table.rows.map((row) => [
        row.quantity,
        row.componentName || "",
        type === "weight" ? row.weight || "" : row.watts || "",
        type === "weight"
          ? row.totalWeight !== undefined
            ? row.totalWeight.toFixed(2)
            : ""
          : row.totalWatts !== undefined
          ? row.totalWatts.toFixed(2)
          : "",
      ]);

      if (type === "weight" && table.totalWeight !== undefined) {
        tableRows.push(["", "Total Weight", "", table.totalWeight.toFixed(2)]);
      }

      const headers =
        type === "weight"
          ? [["Quantity", "Component", "Weight (per unit)", "Total Weight"]]
          : [["Quantity", "Component", "Watts (per unit)", "Total Watts"]];

      autoTable(doc, {
        head: headers,
        body: tableRows,
        startY: yPosition,
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
        bodyStyles: { textColor: [51, 51, 51] },
        alternateRowStyles: { fillColor: [250, 250, 255] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      if (type === "power") {
        if (table.totalWatts !== undefined) {
          doc.setFillColor(245, 245, 250);
          doc.rect(14, yPosition - 6, pageWidth - 28, 20, "F");

          doc.setFontSize(11);
          doc.setTextColor(125, 1, 1);
          doc.text(`Total Power: ${table.totalWatts.toFixed(2)} W`, 14, yPosition);

          if (table.currentPerPhase !== undefined) {
            yPosition += 7;
            doc.text(`Current per Phase: ${table.currentPerPhase.toFixed(2)} A`, 14, yPosition);
          }
          yPosition += 10;
        }

        if (table.includesHoist) {
          doc.setFontSize(10);
          doc.setTextColor(51, 51, 51);
          doc.setFont(undefined, "italic");
          doc.text(`Additional Hoist Power Required for ${table.name}: CEE32A 3P+N+G`, 14, yPosition);
          yPosition += 10;
          doc.setFont(undefined, "normal");
        }
      }

      if (yPosition > pageHeight - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // SUMMARY PAGE
    doc.addPage();

    doc.setFillColor(125, 1, 1);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text(jobName || "Untitled Job", pageWidth / 2, 30, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Job Date: ${jobDate}`, pageWidth / 2, 38, { align: "center" });

    if (safetyMargin !== undefined) {
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      doc.text(`Safety Margin Applied: ${safetyMargin}%`, 14, 50);
    }
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 60);

    let yPositionSummary = 70;

    if (tables[0]?.toolType === "consumos") {
      doc.setFontSize(16);
      doc.setTextColor(125, 1, 1);
      doc.text("Summary", 14, yPositionSummary);
      yPositionSummary += 10;

      tables.forEach((table) => {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        let pduText = table.customPduType ? table.customPduType : table.pduType;
        let line = `${table.name} - PDU: ${pduText || "N/A"}`;
        doc.text(line, 14, yPositionSummary);
        yPositionSummary += 7;
        if (table.includesHoist) {
          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text(`Additional Hoist Power Required for ${table.name}: CEE32A 3P+N+G`, 14, yPositionSummary);
          yPositionSummary += 7;
        }
        yPositionSummary += 5;
        if (yPositionSummary > pageHeight - 40) {
          doc.addPage();
          yPositionSummary = 20;
          doc.setFontSize(16);
          doc.setTextColor(125, 1, 1);
          doc.text("Summary (cont'd)", 14, yPositionSummary);
          yPositionSummary += 10;
        }
      });

      let followspotCount = 0;
      tables.forEach((table) => {
        table.rows.forEach((row) => {
          if (row.componentName && row.componentName.toLowerCase().includes("cañón")) {
            followspotCount++;
          }
        });
      });
      for (let i = 1; i <= followspotCount; i++) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`CEE16A 1P+N+G required at followspot position #${i}`, 14, yPositionSummary);
        yPositionSummary += 7;
        if (yPositionSummary > pageHeight - 40) {
          doc.addPage();
          yPositionSummary = 20;
          doc.setFontSize(16);
          doc.setTextColor(125, 1, 1);
          doc.text("Summary (cont'd)", 14, yPositionSummary);
          yPositionSummary += 10;
        }
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("16A Schuko Power required at FoH position", 14, yPositionSummary);
      yPositionSummary += 7;
    } else if (summaryRows && summaryRows.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(125, 1, 1);
      doc.text("Summary", 14, yPositionSummary);
      yPositionSummary += 6;

      const summaryData = summaryRows.map((row) => [
        row.clusterName,
        row.riggingPoints,
        row.clusterWeight.toFixed(2),
      ]);

      autoTable(doc, {
        head: [["Cluster Name", "Rigging Points", "Cluster Weight"]],
        body: summaryData,
        startY: yPositionSummary,
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
        bodyStyles: { textColor: [51, 51, 51] },
        alternateRowStyles: { fillColor: [250, 250, 255] },
      });
      yPositionSummary = (doc as any).lastAutoTable.finalY + 10;
    }

    // LOGO & CREATED DATE SECTION
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

interface ExtendedJsPDF extends jsPDF {
  internal: {
    getNumberOfPages: () => number;
    pageSize: {
      width: number;
      getWidth: () => number;
      height: number;
      getHeight: () => number;
    };
  };
}
