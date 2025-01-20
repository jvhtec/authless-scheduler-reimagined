import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PDFGeneratorProps {
  jobData: any;
  formData: {
    logistics: {
      transport: string;
      loadingDetails: string;
      unloadingDetails: string;
    };
    schedule: string;
    powerRequirements: string;
    auxiliaryNeeds: string;
  };
  venueImages: string[];
}

export const generateHojaDeRutaPDF = async ({
  jobData,
  formData,
  venueImages
}: PDFGeneratorProps): Promise<Blob> => {
  return new Promise((resolve) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header
    doc.setFillColor(125, 1, 1);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Hoja de Ruta", pageWidth / 2, 20, { align: 'center' });

    // Job Title
    doc.setFontSize(16);
    doc.text(jobData.title, pageWidth / 2, 30, { align: 'center' });

    let yPosition = 50;

    // Date and Time
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${format(new Date(jobData.start_time), 'dd/MM/yyyy')}`, 14, yPosition);
    doc.text(`Time: ${format(new Date(jobData.start_time), 'HH:mm')}`, 14, yPosition + 10);
    yPosition += 30;

    // Staff List
    doc.setFontSize(14);
    doc.text("Staff List", 14, yPosition);
    yPosition += 10;

    const staffRows = jobData.job_assignments.map((assignment: any) => [
      `${assignment.profiles.first_name} ${assignment.profiles.last_name}`,
      assignment.sound_role || assignment.lights_role || assignment.video_role
    ]);

    autoTable(doc, {
      head: [['Name', 'Role']],
      body: staffRows,
      startY: yPosition,
      theme: 'grid'
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Logistics Section
    doc.setFontSize(14);
    doc.text("Logistics", 14, yPosition);
    yPosition += 10;

    const logisticsContent = [
      ['Transport', formData.logistics.transport],
      ['Loading Details', formData.logistics.loadingDetails],
      ['Unloading Details', formData.logistics.unloadingDetails]
    ];

    autoTable(doc, {
      body: logisticsContent,
      startY: yPosition,
      theme: 'plain'
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Schedule
    if (formData.schedule) {
      doc.setFontSize(14);
      doc.text("Schedule", 14, yPosition);
      yPosition += 10;
      
      const scheduleLines = formData.schedule.split('\n');
      scheduleLines.forEach(line => {
        doc.setFontSize(12);
        doc.text(line, 14, yPosition);
        yPosition += 7;
      });
      
      yPosition += 10;
    }

    // Power Requirements
    if (formData.powerRequirements) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Power Requirements", 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.text(formData.powerRequirements, 14, yPosition);
      yPosition += 30;
    }

    // Auxiliary Needs
    if (formData.auxiliaryNeeds) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Auxiliary Needs", 14, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.text(formData.auxiliaryNeeds, 14, yPosition);
    }

    // Add venue images if any
    if (venueImages.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Venue Location Images", 14, 20);
      
      let imgY = 40;
      venueImages.forEach((imgUrl, index) => {
        if (index > 0 && imgY > pageHeight - 100) {
          doc.addPage();
          imgY = 20;
        }
        
        try {
          doc.addImage(imgUrl, 'JPEG', 14, imgY, 180, 100);
          imgY += 120;
        } catch (error) {
          console.error(`Error adding image ${index}:`, error);
        }
      });
    }

    // Add logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = '/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png';
    logo.onload = () => {
      doc.setPage(doc.getNumberOfPages());
      const logoWidth = 50;
      const logoHeight = logoWidth * (logo.height / logo.width);
      const xPosition = (pageWidth - logoWidth) / 2;
      const yPosition = pageHeight - 20;
      try {
        doc.addImage(logo, 'PNG', xPosition, yPosition, logoWidth, logoHeight);
        const blob = doc.output('blob');
        resolve(blob);
      } catch (error) {
        console.error('Error adding logo:', error);
        const blob = doc.output('blob');
        resolve(blob);
      }
    };

    logo.onerror = () => {
      console.error('Failed to load logo');
      const blob = doc.output('blob');
      resolve(blob);
    };
  });
};