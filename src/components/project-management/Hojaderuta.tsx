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

interface TravelArrangement {
  transportation_type: 'van' | 'sleeper_bus' | 'train' | 'plane';
  pickup_address?: string;
  pickup_time?: string;
  flight_train_number?: string;
  departure_time?: string;
  arrival_time?: string;
  notes?: string;
}

interface RoomAssignment {
  room_type: 'single' | 'double';
  room_number?: string;
  staff_member1_id?: string;
  staff_member2_id?: string;
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

  // Add new state for power requirements
  const [powerRequirements, setPowerRequirements] = useState<string>('');

  // Add function to fetch power requirements
  const fetchPowerRequirements = async (jobId: string) => {
    try {
      const { data: requirements, error } = await supabase
        .from('power_requirement_tables')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;

      if (requirements && requirements.length > 0) {
        // Format power requirements into readable text
        const formattedRequirements = requirements.map(req => {
          return `${req.department.toUpperCase()} - ${req.table_name}:\n` +
                 `Total Power: ${req.total_watts}W\n` +
                 `Current per Phase: ${req.current_per_phase}A\n` +
                 `Recommended PDU: ${req.pdu_type}\n`;
        }).join('\n');

        setPowerRequirements(formattedRequirements);
        setEventData(prev => ({
          ...prev,
          powerRequirements: formattedRequirements
        }));
      }
    } catch (error: any) {
      console.error('Error fetching power requirements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch power requirements",
        variant: "destructive"
      });
    }
  };

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

        // Fetch power requirements
        fetchPowerRequirements(selectedJob.id);

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

  const [travelArrangements, setTravelArrangements] = useState<TravelArrangement[]>([{
    transportation_type: 'van'
  }]);

  const [roomAssignments, setRoomAssignments] = useState<RoomAssignment[]>([{
    room_type: 'single'
  }]);

  const addTravelArrangement = () => {
    setTravelArrangements([...travelArrangements, { transportation_type: 'van' }]);
  };

  const removeTravelArrangement = (index: number) => {
    const newArrangements = [...travelArrangements];
    newArrangements.splice(index, 1);
    setTravelArrangements(newArrangements);
  };

  const updateTravelArrangement = (index: number, field: keyof TravelArrangement, value: string) => {
    const newArrangements = [...travelArrangements];
    newArrangements[index] = { 
      ...newArrangements[index], 
      [field]: value 
    };
    setTravelArrangements(newArrangements);
  };

  const addRoomAssignment = () => {
    setRoomAssignments([...roomAssignments, { room_type: 'single' }]);
  };

  const removeRoomAssignment = (index: number) => {
    const newAssignments = [...roomAssignments];
    newAssignments.splice(index, 1);
    setRoomAssignments(newAssignments);
  };

  const updateRoomAssignment = (index: number, field: keyof RoomAssignment, value: string) => {
    const newAssignments = [...roomAssignments];
    newAssignments[index] = { 
      ...newAssignments[index], 
      [field]: value 
    };
    setRoomAssignments(newAssignments);
  };

  interface ImageUploadSectionProps {
    type: keyof typeof images;
    label: string;
  }

  const ImageUploadSection = ({ type, label }: ImageUploadSectionProps) => {
    return (
      <div className="space-y-4">
        <Label>{label}</Label>
        <div className="grid grid-cols-3 gap-4">
          {imagePreviews[type]?.map((preview, index) => (
            <div key={index} className="relative">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => removeImage(type, index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleImageUpload(type, e.target.files)}
        />
      </div>
    );
  };

  const generateDocument = async () => {
    try {
      const doc = new jsPDF() as AutoTableJsPDF;
      
      // Title
      doc.setFontSize(20);
      doc.text("Hoja de Ruta", 105, 15, { align: "center" });
      
      // Event Details
      doc.setFontSize(12);
      autoTable(doc, {
        body: [
          ["Event Name:", eventData.eventName],
          ["Event Dates:", eventData.eventDates],
          ["Venue:", `${eventData.venue.name}\n${eventData.venue.address}`]
        ],
        theme: 'plain',
        startY: 25
      });

      // Contacts
      if (eventData.contacts.length > 0) {
        autoTable(doc, {
          head: [["Contact Name", "Role", "Phone"]],
          body: eventData.contacts.map(contact => [
            contact.name,
            contact.role,
            contact.phone
          ]),
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Staff List
      if (eventData.staff.length > 0) {
        autoTable(doc, {
          head: [["Name", "Surname", "Position"]],
          body: eventData.staff.map(member => [
            member.name,
            `${member.surname1} ${member.surname2 || ''}`,
            member.position
          ]),
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Travel Arrangements
      if (travelArrangements.length > 0) {
        autoTable(doc, {
          head: [["Transport", "Pickup", "Departure", "Arrival", "Notes"]],
          body: travelArrangements.map(arr => [
            arr.transportation_type,
            `${arr.pickup_address || ''}\n${arr.pickup_time || ''}`,
            arr.departure_time || '',
            arr.arrival_time || '',
            arr.notes || ''
          ]),
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Room Assignments
      if (roomAssignments.length > 0) {
        autoTable(doc, {
          head: [["Room Type", "Room Number", "Staff Member 1", "Staff Member 2"]],
          body: roomAssignments.map(room => [
            room.room_type,
            room.room_number || '',
            room.staff_member1_id || '',
            room.staff_member2_id || ''
          ]),
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Schedule
      if (eventData.schedule) {
        autoTable(doc, {
          head: [["Schedule"]],
          body: [[eventData.schedule]],
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Power Requirements
      if (eventData.powerRequirements) {
        autoTable(doc, {
          head: [["Power Requirements"]],
          body: [[eventData.powerRequirements]],
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Auxiliary Needs
      if (eventData.auxiliaryNeeds) {
        autoTable(doc, {
          head: [["Auxiliary Needs"]],
          body: [[eventData.auxiliaryNeeds]],
          startY: (doc.lastAutoTable?.finalY || 0) + 10
        });
      }

      // Save the PDF
      doc.save(`hoja_de_ruta_${eventData.eventName.replace(/\s+/g, '_')}.pdf`);

      toast({
        title: "Success",
        description: "Hoja de Ruta has been generated successfully",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: "Failed to generate Hoja de Ruta",
        variant: "destructive"
      });
    }
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

          {/* Travel Arrangements Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Edit Travel Arrangements</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Travel Arrangements</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {travelArrangements.map((arrangement, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Travel Arrangement {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTravelArrangement(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Select
                      value={arrangement.transportation_type}
                      onValueChange={(value) => updateTravelArrangement(index, 'transportation_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="sleeper_bus">Sleeper Bus</SelectItem>
                        <SelectItem value="train">Train</SelectItem>
                        <SelectItem value="plane">Plane</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Pickup Address</Label>
                        <Input
                          value={arrangement.pickup_address || ''}
                          onChange={(e) => updateTravelArrangement(index, 'pickup_address', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Pickup Time</Label>
                        <Input
                          type="datetime-local"
                          value={arrangement.pickup_time || ''}
                          onChange={(e) => updateTravelArrangement(index, 'pickup_time', e.target.value)}
                        />
                      </div>
                    </div>

                    {(arrangement.transportation_type === 'train' || arrangement.transportation_type === 'plane') && (
                      <div>
                        <Label>Flight/Train Number</Label>
                        <Input
                          value={arrangement.flight_train_number || ''}
                          onChange={(e) => updateTravelArrangement(index, 'flight_train_number', e.target.value)}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Departure Time</Label>
                        <Input
                          type="datetime-local"
                          value={arrangement.departure_time || ''}
                          onChange={(e) => updateTravelArrangement(index, 'departure_time', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Arrival Time</Label>
                        <Input
                          type="datetime-local"
                          value={arrangement.arrival_time || ''}
                          onChange={(e) => updateTravelArrangement(index, 'arrival_time', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={arrangement.notes || ''}
                        onChange={(e) => updateTravelArrangement(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <Button onClick={addTravelArrangement} variant="outline">Add Travel Arrangement</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Room Assignments Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Edit Room Assignments</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Room Assignments</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {roomAssignments.map((assignment, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium">Room Assignment {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoomAssignment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Select
                      value={assignment.room_type}
                      onValueChange={(value) => updateRoomAssignment(index, 'room_type', value as 'single' | 'double')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="double">Double</SelectItem>
                      </SelectContent>
                    </Select>

                    <div>
                      <Label>Room Number</Label>
                      <Input
                        value={assignment.room_number || ''}
                        onChange={(e) => updateRoomAssignment(index, 'room_number', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Staff Member 1</Label>
                      <Select
                        value={assignment.staff_member1_id || ''}
                        onValueChange={(value) => updateRoomAssignment(index, 'staff_member1_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventData.staff.map((member) => (
                            <SelectItem key={member.name} value={member.name}>
                              {`${member.name} ${member.surname1 || ''}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {assignment.room_type === 'double' && (
                      <div>
                        <Label>Staff Member 2</Label>
                        <Select
                          value={assignment.staff_member2_id || ''}
                          onValueChange={(value) => updateRoomAssignment(index, 'staff_member2_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {eventData.staff.map((member) => (
                              <SelectItem key={member.name} value={member.name}>
                                {`${member.name} ${member.surname1 || ''}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={addRoomAssignment} variant="outline">Add Room Assignment</Button>
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
              placeholder="Power requirements will be automatically populated when available..."
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
