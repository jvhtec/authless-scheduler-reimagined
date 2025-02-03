import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportTableRow {
  // Existing properties for weight/power tables…
  quantity?: string;
  componentName?: string;
  weight?: string;
  watts?: string;
  totalWeight?: number;
  totalWatts?: number;
  // New optional properties for tour dates export.
  date?: string;
  location?: string;
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
 * exportToPDF now supports an additional type "tour" to export tour dates.
 *
 * Function signature:
 * 1. projectName
 * 2. tables
 * 3. type ('weight' | 'power' | 'tour')
 * 4. jobName
 * 5. jobDate (the date of the job)
 * 6. summaryRows (optional) – used for "pesos" reports
 * 7. powerSummary (optional)
 * 8. safetyMargin (optional)
 */
export const exportToPDF = (
  projectName: string,
  tables: ExportTable[],
  type: "weight" | "power" | "tour",
  jobName: string,
  jobDate: string,
  summaryRows?: SummaryRow[],
  powerSummary?: { totalSystemWatts: number; totalSystemAmps: number },
  safetyMargin?: number
): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const createdDate = new Date().toLocaleDateString("en-GB");

    if (type === "tour") {
      // ---------------------------
      // New "Tour Dates Report" PDF
      // ---------------------------
      doc.setFillColor(0, 102, 204);
      doc.rect(0, 0, pageWidth, 40, "F");

      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      const title = "Tour Dates Report";
      doc.text(title, pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(16);
      doc.text(jobName || "Untitled Tour", pageWidth / 2, 30, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Tour Date: ${jobDate}`, pageWidth / 2, 38, { align: "center" });

      let yPosition = 50;

      // We assume that tables[0] contains the tour dates.
      const tourTable = tables[0];
      const headers = [["No.", "Date", "Location"]];
      const tableRows = tourTable.rows.map((row, index) => [
        (index + 1).toString(),
        row.date || "",
        row.location || "",
      ]);

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
          fillColor: [0, 102, 204],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: { textColor: [51, 51, 51] },
        alternateRowStyles: { fillColor: [250, 250, 255] },
      });

      // Add logo and created date on every page.
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
      return;
    }

    // ---------------------------
    // Existing PDF generation logic for "weight" and "power"
    // ---------------------------
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
        row.quantity || "",
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
          doc.text(
            `Additional Hoist Power Required for ${table.name}: CEE32A 3P+N+G`,
            14,
            yPosition
          );
          yPosition += 10;
          doc.setFont(undefined, "normal");
        }
      }

      if (yPosition > pageHeight - 40 && index < tables.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Summary page (only for non-tour exports)
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

    yPosition = 70;

    if (tables[0]?.toolType === "consumos") {
      doc.setFontSize(16);
      doc.setTextColor(125, 1, 1);
      doc.text("Summary", 14, yPosition);
      yPosition += 10;

      tables.forEach((table) => {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        let pduText = table.customPduType ? table.customPduType : table.pduType;
        let line = `${table.name} - PDU: ${pduText || "N/A"}`;
        doc.text(line, 14, yPosition);
        yPosition += 7;
        if (table.includesHoist) {
          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text(
            `Additional Hoist Power Required for ${table.name}: CEE32A 3P+N+G`,
            14,
            yPosition
          );
          yPosition += 7;
        }
        yPosition += 5;
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(16);
          doc.setTextColor(125, 1, 1);
          doc.text("Summary (cont'd)", 14, yPosition);
          yPosition += 10;
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
        doc.text(`CEE16A 1P+N+G required at followspot position #${i}`, 14, yPosition);
        yPosition += 7;
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
          doc.setFontSize(16);
          doc.setTextColor(125, 1, 1);
          doc.text("Summary (cont'd)", 14, yPosition);
          yPosition += 10;
        }
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("16A Schuko Power required at FoH position", 14, yPosition);
      yPosition += 7;
    } else if (summaryRows && summaryRows.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(125, 1, 1);
      doc.text("Summary", 14, yPosition);
      yPosition += 6;

      const summaryData = summaryRows.map((row) => [
        row.clusterName,
        row.riggingPoints,
        row.clusterWeight.toFixed(2),
      ]);

      autoTable(doc, {
        head: [["Cluster Name", "Rigging Points", "Cluster Weight"]],
        body: summaryData,
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
    }

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