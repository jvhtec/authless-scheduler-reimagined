import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface ProjectFormData {
  projectName: string;
  client: string;
  startDate: string;
  endDate: string;
  location: string;
  budget: string;
  description: string;
  projectType: string;
  status: string;
}

export const ProjectForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProjectFormData>({
    projectName: "",
    client: "",
    startDate: "",
    endDate: "",
    location: "",
    budget: "",
    description: "",
    projectType: "event",
    status: "pending"
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Add header
    doc.setFontSize(20);
    doc.text("Project Management Report", pageWidth / 2, 20, { align: "center" });

    // Add project details
    const data = [
      ["Project Name", formData.projectName],
      ["Client", formData.client],
      ["Start Date", formData.startDate],
      ["End Date", formData.endDate],
      ["Location", formData.location],
      ["Budget", formData.budget],
      ["Project Type", formData.projectType],
      ["Status", formData.status],
      ["Description", formData.description],
    ];

    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: data,
      theme: "striped",
      headStyles: { fillColor: [66, 66, 66] },
    });

    // Save the PDF
    doc.save(`${formData.projectName.replace(/\s+/g, "_")}_report.pdf`);
    
    toast({
      title: "Success",
      description: "PDF report has been generated successfully",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input
              id="client"
              name="client"
              value={formData.client}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              name="budget"
              type="number"
              value={formData.budget}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="projectType">Project Type</Label>
            <Select
              value={formData.projectType}
              onValueChange={(value) => handleSelectChange("projectType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="tour">Tour</SelectItem>
                <SelectItem value="installation">Installation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
          />
        </div>

        <Button onClick={generatePDF} className="w-full">
          Generate PDF Report
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectForm;