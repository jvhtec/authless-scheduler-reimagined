import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Calendar } from "lucide-react";
import { useJobSelection } from "@/hooks/useJobSelection";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Add type declaration for jsPDF with autotable
interface AutoTableJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

const HojaDeRutaGenerator = () => {
  const { toast } = useToast();
  const { data: jobs, isLoading: isLoadingJobs } = useJobSelection();
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  
  const [eventData, setEventData] = useState({
    eventName: "",
    eventDates: "",
    venue: {
      name: "",
      address: "",
    },
    contacts: [{ name: "", role: "", phone: "" }],
    logistics: {
      transport: "",
      loadingDetails: "",
      unloadingDetails: "",
    },
    staff: [{ name: "", surname1: "", surname2: "", position: "" }],
    schedule: "",
    powerRequirements: "",
    auxiliaryNeeds: "",
  });

  const [images, setImages] = useState({
    venue: [],
  });

  const [imagePreviews, setImagePreviews] = useState({
    venue: [],
  });

  useEffect(() => {
    if (selectedJobId && jobs) {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (selectedJob) {
        console.log("Selected job:", selectedJob);
        
        // Format dates
        const formattedDates = `${format(new Date(selectedJob.start_time), 'dd/MM/yyyy HH:mm')} - ${format(new Date(selectedJob.end_time), 'dd/MM/yyyy HH:mm')}`;
        
        setEventData(prev => ({
          ...prev,
          eventName: selectedJob.title,
          eventDates: formattedDates,
        }));

        // Fetch assigned staff
        fetchAssignedStaff(selectedJob.id);

        toast({
          title: "Job Selected",
          description: "Form has been updated with job details",
        });
      }
    }
  }, [selectedJobId, jobs]);

  const fetchAssignedStaff = async (jobId: string) => {
    try {
      const { data: assignments, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          profiles:technician_id (
            first_name,
            last_name
          )
        `)
        .eq('job_id', jobId);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const staffList = assignments.map(assignment => ({
          name: assignment.profiles.first_name,
          surname1: assignment.profiles.last_name,
          surname2: "",
          position: assignment.sound_role || assignment.lights_role || assignment.video_role || "Technician"
        }));

        setEventData(prev => ({
          ...prev,
          staff: staffList
        }));
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assigned staff",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = (type: keyof typeof images, files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const newImages = [...(images[type] || []), ...fileArray];
    setImages({ ...images, [type]: newImages });

    const previews = fileArray.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), ...previews],
    }));
  };

  const removeImage = (type: keyof typeof images, index: number) => {
    const newImages = [...images[type]];
    const newPreviews = [...imagePreviews[type]];
    URL.revokeObjectURL(newPreviews[index]);
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages({ ...images, [type]: newImages });
    setImagePreviews({ ...imagePreviews, [type]: newPreviews });
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    const newContacts = [...eventData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setEventData({ ...eventData, contacts: newContacts });
  };

  const handleStaffChange = (index: number, field: string, value: string) => {
    const newStaff = [...eventData.staff];
    newStaff[index] = { ...newStaff[index], [field]: value };
    setEventData({ ...eventData, staff: newStaff });
  };

  const addContact = () => {
    setEventData({
      ...eventData,
      contacts: [...eventData.contacts, { name: "", role: "", phone: "" }],
    });
  };

  const addStaffMember = () => {
    setEventData({
      ...eventData,
      staff: [...eventData.staff, { name: "", surname1: "", surname2: "", position: "" }],
    });
  };

  const ImageUploadSection = ({ type, label, multiple = true }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`${type}-upload`}>{label}</Label>
        <Input
          id={`${type}-upload`}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleImageUpload(type, e.target.files)}
          className="mt-1"
        />
      </div>
      
      {imagePreviews[type]?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {imagePreviews[type].map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`${type} preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(type, index)}
                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const generateDocument = async () => {
    const doc = new jsPDF() as AutoTableJsPDF;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add header
    doc.setFillColor(125, 1, 1);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Hoja de Ruta", pageWidth / 2, 20, { align: 'center' });

    // Event Name
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(eventData.eventName, pageWidth / 2, 30, { align: 'center' });

    let yPosition = 50;

    // Event Details
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`Dates: ${eventData.eventDates}`, 20, yPosition);
    yPosition += 15;

    // Venue Information
    doc.setFontSize(14);
    doc.setTextColor(125, 1, 1);
    doc.text("Venue Information", 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.text(`Name: ${eventData.venue.name}`, 30, yPosition);
    yPosition += 7;
    doc.text(`Address: ${eventData.venue.address}`, 30, yPosition);
    yPosition += 15;

    // Contacts Section
    if (eventData.contacts.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Contacts", 20, yPosition);
      yPosition += 10;

      const contactsTableData = eventData.contacts.map(contact => [
        contact.name,
        contact.role,
        contact.phone
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Name", "Role", "Phone"]],
        body: contactsTableData,
        theme: 'grid',
        styles: { fontSize: 10 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Logistics Section
    doc.setFontSize(14);
    doc.setTextColor(125, 1, 1);
    doc.text("Logistics", 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);

    const logisticsText = [
      { label: "Transport:", value: eventData.logistics.transport },
      { label: "Loading Details:", value: eventData.logistics.loadingDetails },
      { label: "Unloading Details:", value: eventData.logistics.unloadingDetails }
    ];

    logisticsText.forEach(item => {
      if (item.value) {
        doc.text(item.label, 30, yPosition);
        const lines = doc.splitTextToSize(item.value, pageWidth - 60);
        doc.text(lines, 30, yPosition + 7);
        yPosition += (lines.length * 7) + 15;
      }
    });

    // Staff Section
    if (eventData.staff.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Staff List", 20, yPosition);
      yPosition += 10;

      const staffTableData = eventData.staff.map(person => [
        person.name,
        person.surname1,
        person.surname2,
        person.position
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Name", "First Surname", "Second Surname", "Position"]],
        body: staffTableData,
        theme: 'grid',
        styles: { fontSize: 10 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Schedule Section
    if (eventData.schedule) {
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Schedule", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const scheduleLines = doc.splitTextToSize(eventData.schedule, pageWidth - 40);
      doc.text(scheduleLines, 20, yPosition);
      yPosition += (scheduleLines.length * 7) + 15;
    }

    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Power Requirements Section
    if (eventData.powerRequirements) {
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Power Requirements", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const powerLines = doc.splitTextToSize(eventData.powerRequirements, pageWidth - 40);
      doc.text(powerLines, 20, yPosition);
      yPosition += (powerLines.length * 7) + 15;
    }

    // Auxiliary Needs Section
    if (eventData.auxiliaryNeeds) {
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Auxiliary Needs", 20, yPosition);
      yPosition += 10;
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      const auxLines = doc.splitTextToSize(eventData.auxiliaryNeeds, pageWidth - 40);
      doc.text(auxLines, 20, yPosition);
      yPosition += (auxLines.length * 7) + 15;
    }

    // Add venue images if they exist
    if (imagePreviews.venue.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(125, 1, 1);
      doc.text("Venue Images", 20, 20);

      let imageY = 40;
      const imageWidth = 80;
      const imagesPerRow = 2;
      let currentX = 20;

      for (let i = 0; i < imagePreviews.venue.length; i++) {
        try {
          doc.addImage(
            imagePreviews.venue[i],
            'JPEG',
            currentX,
            imageY,
            imageWidth,
            60
          );

          if ((i + 1) % imagesPerRow === 0) {
            imageY += 70;
            currentX = 20;
          } else {
            currentX += imageWidth + 10;
          }

          if (imageY > pageHeight - 80 && i < imagePreviews.venue.length - 1) {
            doc.addPage();
            imageY = 40;
            currentX = 20;
          }
        } catch (error) {
          console.error('Error adding image:', error);
          continue;
        }
      }
    }

    // Add logo at the end
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
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hoja_de_ruta_${eventData.eventName.replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Hoja de Ruta has been generated and downloaded",
        });
      } catch (error) {
        console.error('Error adding logo:', error);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hoja_de_ruta_${eventData.eventName.replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    };

    // If the image fails to load, still generate the PDF
    logo.onerror = () => {
      console.error('Failed to load logo');
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hoja_de_ruta_${eventData.eventName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    };
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Hoja de Ruta Generator</CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <CardContent className="space-y-6">
          {showAlert && (
            <Alert className="mb-4">
              <AlertDescription>{alertMessage}</AlertDescription>
            </Alert>
          )}

          {/* Job Selection */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="jobSelect">Select Job</Label>
              <Select
                value={selectedJobId}
                onValueChange={setSelectedJobId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingJobs ? (
                    <SelectItem value="loading" disabled>
                      Loading jobs...
                    </SelectItem>
                  ) : (
                    jobs?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={eventData.eventName}
                onChange={(e) => setEventData({ ...eventData, eventName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="eventDates">Event Dates</Label>
              <div className="relative">
                <Input
                  id="eventDates"
                  value={eventData.eventDates}
                  onChange={(e) => setEventData({ ...eventData, eventDates: e.target.value })}
                />
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-6">
            <ImageUploadSection
              type="venue"
              label="Venue Images"
            />
          </div>

          {/* Venue Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Edit Venue Details</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Venue Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="venueName">Venue Name</Label>
                  <Input
                    id="venueName"
                    value={eventData.venue.name}
                    onChange={(e) => setEventData({
                      ...eventData,
                      venue: { ...eventData.venue, name: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="venueAddress">Address</Label>
                  <Textarea
                    id="venueAddress"
                    value={eventData.venue.address}
                    onChange={(e) => setEventData({
                      ...eventData,
                      venue: { ...eventData.venue, address: e.target.value }
                    })}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Contacts Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Edit Contacts</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Contact Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {eventData.contacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => handleContactChange(index, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Role"
                      value={contact.role}
                      onChange={(e) => handleContactChange(index, "role", e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, "phone", e.target.value)}
                    />
                  </div>
                ))}
                <Button onClick={addContact} variant="outline">Add Contact</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Staff Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Edit Staff List</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Staff List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {eventData.staff.map((member, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => handleStaffChange(index, "name", e.target.value)}
                    />
                    <Input
                      placeholder="First Surname"
                      value={member.surname1}
                      onChange={(e) => handleStaffChange(index, "surname1", e.target.value)}
                    />
                    <Input
                      placeholder="Second Surname"
                      value={member.surname2}
                      onChange={(e) => handleStaffChange(index, "surname2", e.target.value)}
                    />
                    <Input
                      placeholder="Position"
                      value={member.position}
                      onChange={(e) => handleStaffChange(index, "position", e.target.value)}
                    />
                  </div>
                ))}
                <Button onClick={addStaffMember} variant="outline">Add Staff Member</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Logistics Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Edit Logistics</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Logistics Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Transport Details</Label>
                  <Textarea
                    value={eventData.logistics.transport}
                    onChange={(e) => setEventData({
                      ...eventData,
                      logistics: { ...eventData.logistics, transport: e.target.value }
                    })}
                    placeholder="Number and type of vehicles, transport company details..."
                  />
                </div>
                <div>
                  <Label>Loading Details</Label>
                  <Textarea
                    value={eventData.logistics.loadingDetails}
                    onChange={(e) => setEventData({
                      ...eventData,
                      logistics: { ...eventData.logistics, loadingDetails: e.target.value }
                    })}
                    placeholder="Loading location, date, time..."
                  />
                </div>
                <div>
                  <Label>Unloading Details</Label>
                  <Textarea
                    value={eventData.logistics.unloadingDetails}
                    onChange={(e) => setEventData({
                      ...eventData,
                      logistics: { ...eventData.logistics, unloadingDetails: e.target.value }
                    })}
                    placeholder="Unloading location, date, time..."
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Schedule */}
          <div>
            <Label htmlFor="schedule">Schedule</Label>
            <Textarea
              id="schedule"
              value={eventData.schedule}
              onChange={(e) => setEventData({ ...eventData, schedule: e.target.value })}
              className="min-h-[200px]"
              placeholder="Load in: 08:00&#10;Soundcheck: 14:00&#10;Doors: 19:00&#10;Show: 20:00..."
            />
          </div>

          {/* Power Requirements */}
          <div>
            <Label htmlFor="powerRequirements">Power Requirements</Label>
            <Textarea
              id="powerRequirements"
              value={eventData.powerRequirements}
              onChange={(e) => setEventData({ ...eventData, powerRequirements: e.target.value })}
              className="min-h-[150px]"
              placeholder="Specify power needs for sound, lighting, etc..."
            />
          </div>

          {/* Auxiliary Needs */}
          <div>
            <Label htmlFor="auxiliaryNeeds">Auxiliary Needs</Label>
            <Textarea
              id="auxiliaryNeeds"
              value={eventData.auxiliaryNeeds}
              onChange={(e) => setEventData({ ...eventData, auxiliaryNeeds: e.target.value })}
              className="min-h-[150px]"
              placeholder="Loading crew requirements, equipment needs..."
            />
          </div>

          <Button onClick={generateDocument} className="w-full">
            Generate Hoja de Ruta
          </Button>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default HojaDeRutaGenerator;
