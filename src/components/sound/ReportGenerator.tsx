import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { useJobSelection, JobSelection } from "@/hooks/useJobSelection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

const reportSections = [
  {
    pageNumber: 1,
    title: "EQUIPAMIENTO",
    type: "text"
  },
  {
    pageNumber: 2,
    title: "SPL(A) Broadband",
    hasIsoView: true
  },
  {
    pageNumber: 3,
    title: "SPL(Z) 250-16k",
    hasIsoView: true
  },
  {
    pageNumber: 4,
    title: "SUBS SPL(Z) 32-80Hz",
    hasIsoView: false
  }
];

export const ReportGenerator = () => {
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [equipamiento, setEquipamiento] = useState("");
  const [images, setImages] = useState<{ [key: string]: File | null }>({});
  const [isoViewEnabled, setIsoViewEnabled] = useState<{ [key: string]: boolean }>({});

  const handleImageChange = (section: string, view: string, file: File | null) => {
    const key = `${section}-${view}`;
    setImages(prev => ({ ...prev, [key]: file }));
  };

  const toggleIsoView = (section: string) => {
    setIsoViewEnabled(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const uploadPdfToJob = async (pdfBlob: Blob, jobId: string, jobTitle: string) => {
    try {
      const fileName = `SoundVision_Report_${jobTitle.replace(/\s+/g, "_")}.pdf`;
      const filePath = `sound/${jobId}/${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('job_documents')
        .upload(filePath, pdfBlob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('job_documents')
        .insert({
          job_id: jobId,
          file_name: fileName,
          file_path: filePath,
          file_type: 'application/pdf',
          file_size: pdfBlob.size
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Report has been generated and uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to upload the report.",
        variant: "destructive",
      });
    }
  };

  const generatePDF = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job before generating the report.",
        variant: "destructive",
      });
      return;
    }

    const selectedJob = jobs?.find((job: JobSelection) => job.id === selectedJobId);
    const jobTitle = selectedJob?.title || "Unnamed_Job";

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (2 * margin);

    const addPageHeader = (pageNumber: number) => {
      pdf.setFontSize(14);
      pdf.text("SOUNDVISION REPORT", margin, margin);
      pdf.text(pageNumber.toString(), pageWidth - margin, margin, { align: "right" });
    };

    // Page 1: Equipment
    addPageHeader(1);
    pdf.setFontSize(11);
    pdf.text("EQUIPAMIENTO:", margin, margin + 15);
    const equipLines = equipamiento.split('\n').filter(line => line.trim());
    let yPos = margin + 25;
    
    equipLines.forEach(line => {
      pdf.text(line.trim(), margin, yPos);
      yPos += 7;
    });

    pdf.setFontSize(9);
    pdf.text("ALL PLOTS CALCULATED FOR 15º C / 70% REL HUMIDITY @ 0dbU INPUT LEVEL", margin, yPos + 10);

    // Image pages
    for (let i = 1; i < reportSections.length; i++) {
      const section = reportSections[i];
      pdf.addPage();
      addPageHeader(section.pageNumber);
      
      const topViewKey = `${section.title}-Top View`;
      if (images[topViewKey]) {
        await addImageToPDF(pdf, images[topViewKey], "Top View", margin, 40, contentWidth);
      }

      if (section.hasIsoView && isoViewEnabled[section.title]) {
        const isoViewKey = `${section.title}-ISO View`;
        if (images[isoViewKey]) {
          await addImageToPDF(pdf, images[isoViewKey], "ISO View", margin, 140, contentWidth);
        }
      }
    }

    const blob = pdf.output('blob');
    await uploadPdfToJob(blob, selectedJobId, jobTitle);
  };

  const addImageToPDF = async (pdf: jsPDF, file: File, viewType: string, x: number, y: number, width: number) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgData = e.target?.result as string;
        const height = width * 0.6; // Maintain aspect ratio
        pdf.addImage(imgData, "JPEG", x, y, width, height);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">SoundVision Report Generator</CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="jobSelect">Job</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map((job: JobSelection) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="equipamiento">Equipment List</Label>
            <Textarea
              id="equipamiento"
              value={equipamiento}
              onChange={(e) => setEquipamiento(e.target.value)}
              placeholder="24 L'ACOUSTICS K1 (MAIN ARRAYS)&#10;06 L'ACOUSTICS KARA (DOWNFILLS)"
              className="min-h-[96px] bg-background text-foreground"
            />
          </div>

          {reportSections.slice(1).map((section) => (
            <div key={section.title} className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{section.title}</Label>
                {section.hasIsoView && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`iso-${section.title}`}
                      checked={isoViewEnabled[section.title]}
                      onCheckedChange={() => toggleIsoView(section.title)}
                    />
                    <Label htmlFor={`iso-${section.title}`} className="text-xs">
                      Include ISO
                    </Label>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Top View</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(section.title, "Top View", e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                </div>

                {section.hasIsoView && isoViewEnabled[section.title] && (
                  <div className="space-y-1">
                    <Label className="text-xs">ISO View</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(section.title, "ISO View", e.target.files?.[0] || null)}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <Button onClick={generatePDF} className="w-full mt-4">
            Generate Report
          </Button>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default ReportGenerator;
