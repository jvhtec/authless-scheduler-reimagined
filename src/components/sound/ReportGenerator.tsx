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

  const generatePDF = async () => {
    if (!selectedJobId) {
      toast({
        title: "Job not selected",
        description: "Please select a job before generating the report.",
        variant: "destructive",
      });
      return;
    }

    const selectedJob = jobs?.find((job: JobSelection) => job.id === selectedJobId);
    const jobTitle = selectedJob?.title || "Unnamed_Job";

    const pdf = new jsPDF();
    let currentPage = 1;

    const addPageHeader = (pageNumber: number) => {
      pdf.setFontSize(16);
      pdf.text("SOUNDVISION REPORT", 105, 20, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(pageNumber.toString(), 195, 20, { align: "right" });
    };

    // Page 1: Equipment
    addPageHeader(1);
    pdf.setFontSize(12);
    pdf.text("EQUIPAMIENTO:", 20, 40);
    const equipLines = equipamiento.split('\n');
    let yPos = 50;
    equipLines.forEach(line => {
      pdf.text(line.trim(), 20, yPos);
      yPos += 10;
    });
    pdf.text("ALL PLOTS CALCULATED FOR 15º C / 70% REL HUMIDITY @ 0dbU INPUT LEVEL", 20, yPos + 10);

    // Subsequent pages with views
    for (let i = 1; i < reportSections.length; i++) {
      const section = reportSections[i];
      pdf.addPage();
      currentPage++;
      addPageHeader(currentPage);
      
      let yOffset = 40;
      
      // Add Top View
      const topViewKey = `${section.title}-Top View`;
      if (images[topViewKey]) {
        pdf.text(`${section.title} Top View`, 20, yOffset);
        yOffset += 10;
        const imgData = images[topViewKey];
        if (imgData) {
          pdf.addImage(
            URL.createObjectURL(imgData),
            "JPEG",
            20,
            yOffset,
            170,
            100
          );
          yOffset += 110;
        }
      }

      // Add ISO View if enabled and available
      if (section.hasIsoView && isoViewEnabled[section.title]) {
        const isoViewKey = `${section.title}-ISO View`;
        if (images[isoViewKey]) {
          pdf.text(`${section.title} ISO View`, 20, yOffset);
          yOffset += 10;
          const imgData = images[isoViewKey];
          if (imgData) {
            pdf.addImage(
              URL.createObjectURL(imgData),
              "JPEG",
              20,
              yOffset,
              170,
              100
            );
          }
        }
      }
    }

    const filename = `SoundVision_Report_${jobTitle.replace(/\s+/g, "_")}.pdf`;
    pdf.save(filename);
    toast({
      title: "PDF Generated",
      description: `Report generated as "${filename}".`,
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">SoundVision Report Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label htmlFor="jobSelect" className="block font-medium">Select Job</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
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
            <Label htmlFor="equipamiento" className="block font-medium mb-2">
              Equipment List (one item per line)
            </Label>
            <textarea
              id="equipamiento"
              value={equipamiento}
              onChange={(e) => setEquipamiento(e.target.value)}
              placeholder="24 L'ACOUSTICS K1 (MAIN ARRAYS)&#10;06 L'ACOUSTICS KARA (DOWNFILLS)&#10;..."
              className="w-full h-32 p-2 border rounded"
            />
          </div>

          {reportSections.slice(1).map((section) => (
            <div key={section.title} className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{section.title}</h3>
                {section.hasIsoView && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`iso-${section.title}`}
                      checked={isoViewEnabled[section.title]}
                      onCheckedChange={() => toggleIsoView(section.title)}
                    />
                    <Label htmlFor={`iso-${section.title}`} className="text-sm">
                      Include ISO View
                    </Label>
                  </div>
                )}
              </div>
              
              <div>
                <Label className="block text-sm mb-1">Top View</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(section.title, "Top View", e.target.files?.[0] || null)}
                  className="w-full"
                />
              </div>

              {section.hasIsoView && isoViewEnabled[section.title] && (
                <div>
                  <Label className="block text-sm mb-1">ISO View</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(section.title, "ISO View", e.target.files?.[0] || null)}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ))}

          <Button onClick={generatePDF} className="w-full bg-blue-500 text-white">
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;