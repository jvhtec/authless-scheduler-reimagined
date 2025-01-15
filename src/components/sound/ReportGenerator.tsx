import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { useJobSelection, JobSelection } from "@/hooks/useJobSelection";

const labels = [
  "Equipment View",
  "SPL A Broadband Top View",
  "SPL A Broadband ISO View",
  "SPL(Z) 250-16k Top View",
  "SPL(Z) 250-16k ISO View",
  "SUBS SPL(Z) 32-80 Top View",
];

export const ReportGenerator = () => {
  const { toast } = useToast();
  const { data: jobs } = useJobSelection(); // Fetch available jobs
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [equipamiento, setEquipamiento] = useState("");
  const [images, setImages] = useState<{ [key: string]: File | null }>(
    labels.reduce((acc, label) => ({ ...acc, [label]: null }), {})
  );

  const handleImageChange = (label: string, file: File | null) => {
    setImages({ ...images, [label]: file });
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
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    let yOffset = 20;

    // Title
    pdf.setFontSize(18);
    pdf.text("SOUNDVISION REPORT", pageWidth / 2, yOffset, { align: "center" });
    yOffset += 10;

    // Job Title
    pdf.setFontSize(14);
    pdf.text(`Job: ${jobTitle}`, margin, yOffset);
    yOffset += 10;

    // Equipamiento Section
    pdf.setFontSize(12);
    pdf.text("EQUIPAMIENTO:", margin, yOffset);
    yOffset += 10;
    const equipText = equipamiento || "No equipment provided.";
    pdf.text(equipText, margin, yOffset);
    yOffset += 20;

    // Images with Labels
    for (const label of labels) {
      if (images[label]) {
        const imgData = await toBase64(images[label]);
        pdf.text(label, margin, yOffset);
        yOffset += 10;
        pdf.addImage(imgData, "JPEG", margin, yOffset, contentWidth, 50); // Resize as needed
        yOffset += 60;

        if (yOffset > pdf.internal.pageSize.getHeight() - 50) {
          pdf.addPage();
          yOffset = margin;
        }
      }
    }

    // Save PDF
    const filename = `SoundVision_Report_${jobTitle.replace(/\s+/g, "_")}.pdf`;
    pdf.save(filename);
    toast({
      title: "PDF Generated",
      description: `The PDF has been generated and downloaded as "${filename}".`,
    });
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Generate Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Job Selection */}
          <div>
            <Label htmlFor="jobSelect" className="block font-medium">Select Job</Label>
            <Select
              value={selectedJobId}
              onValueChange={setSelectedJobId}
            >
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

          {/* Equipamiento Section */}
          <div>
            <Label htmlFor="equipamiento" className="block font-medium">Equipamiento</Label>
            <Input
              id="equipamiento"
              value={equipamiento}
              onChange={(e) => setEquipamiento(e.target.value)}
              placeholder="Enter equipment details..."
              className="w-full"
            />
          </div>

          {/* File Uploads */}
          {labels.map((label) => (
            <div key={label}>
              <Label className="block font-medium">{label}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(label, e.target.files?.[0] || null)}
                className="block w-full"
              />
            </div>
          ))}

          {/* Generate Button */}
          <Button onClick={generatePDF} className="w-full bg-blue-500 text-white">
            Generate PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};