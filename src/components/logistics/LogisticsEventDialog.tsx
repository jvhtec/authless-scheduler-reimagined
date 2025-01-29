import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Department } from "@/types/department";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import LocationInput from "@/components/ui/location-input";
import { upsertLocation } from "@/lib/supabase";
import { Location } from "@/types/location";

interface LogisticsEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedEvent?: {
    id: string;
    event_type: "load" | "unload";
    transport_type: string;
    event_time: string;
    event_date: string;
    loading_bay: string | null;
    job_id: string | null;
    license_plate: string | null;
    title?: string;
    departments: { department: Department }[];
  };
}

export const LogisticsEventDialog = ({
  open,
  onOpenChange,
  selectedDate,
  selectedEvent,
}: LogisticsEventDialogProps) => {
  const [eventType, setEventType] = useState<"load" | "unload">("load");
  const [transportType, setTransportType] = useState<string>("trailer");
  const [time, setTime] = useState("09:00");
  const [date, setDate] = useState(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
  const [loadingBay, setLoadingBay] = useState("");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [location, setLocation] = useState<Location>({
    google_place_id: "",
    formatted_address: "",
    latitude: 0,
    longitude: 0,
    photo_reference: "",
    name: "" // Initialize with empty name
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const departments: Department[] = ["sound", "lights", "video"];

  useEffect(() => {
    if (selectedEvent) {
      setEventType(selectedEvent.event_type);
      setTransportType(selectedEvent.transport_type);
      setTime(selectedEvent.event_time);
      setDate(
        selectedEvent.event_date
          ? format(new Date(selectedEvent.event_date), "yyyy-MM-dd")
          : ""
      );
      setLoadingBay(selectedEvent.loading_bay || "");
      setSelectedJob(selectedEvent.job_id || null);
      setCustomTitle(selectedEvent.title || "");
      setLicensePlate(selectedEvent.license_plate || "");
      setSelectedDepartments(selectedEvent.departments.map((d) => d.department));
    } else {
      setEventType("load");
      setTransportType("trailer");
      setTime("09:00");
      setDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
      setLoadingBay("");
      setSelectedJob(null);
      setCustomTitle("");
      setLicensePlate("");
      setSelectedDepartments([]);
    }
  }, [selectedEvent, selectedDate]);

  useEffect(() => {
    if (selectedEvent?.job_id) {
      supabase
        .from("locations")
        .select("*")
        .eq("id", selectedEvent.job_id)
        .single()
        .then(({ data, error }) => {
          if (data) {
            setLocation({
              google_place_id: data.google_place_id || "",
              formatted_address: data.formatted_address || "",
              latitude: data.latitude || 0,
              longitude: data.longitude || 0,
              photo_reference: data.photo_reference || "",
              name: data.name || data.formatted_address || "" // Use formatted_address as fallback
            });
          }
        });
    }
  }, [selectedEvent]);

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("id, title");
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    try {
      if (!selectedEvent) return;

      const { error: deptError } = await supabase
        .from("logistics_event_departments")
        .delete()
        .eq("event_id", selectedEvent.id);

      if (deptError) throw deptError;

      const { error: eventError } = await supabase
        .from("logistics_events")
        .delete()
        .eq("id", selectedEvent.id);

      if (eventError) throw eventError;

      toast({
        title: "Success",
        description: "Logistics event deleted successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["logistics-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-logistics"] });

      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || (!selectedJob && !customTitle)) {
      toast({
        title: "Error",
        description: "Date, time, and title (if no job) are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      let locationId = null;

      if (location.google_place_id) {
        const savedLocation = await upsertLocation(location);
        if (savedLocation) {
          locationId = savedLocation.id;
        }
      }

      if (selectedEvent) {
        const { error: updateError } = await supabase
          .from("logistics_events")
          .update({
            event_type: eventType,
            transport_type: transportType,
            event_date: date,
            event_time: time,
            loading_bay: loadingBay || null,
            job_id: selectedJob || null,
            location_id: locationId,
            title: customTitle || null,
            license_plate: licensePlate || null,
          })
          .eq("id", selectedEvent.id);

        if (updateError) throw updateError;

        await supabase
          .from("logistics_event_departments")
          .delete()
          .eq("event_id", selectedEvent.id);

        if (selectedDepartments.length > 0) {
          const { error: deptError } = await supabase
            .from("logistics_event_departments")
            .insert(
              selectedDepartments.map((dept) => ({
                event_id: selectedEvent.id,
                department: dept,
              }))
            );
          if (deptError) throw deptError;
        }

        toast({
          title: "Success",
          description: "Logistics event updated successfully.",
        });
      } else {
        const { data: newEvent, error } = await supabase
          .from("logistics_events")
          .insert({
            event_type: eventType,
            transport_type: transportType,
            event_date: date,
            event_time: time,
            loading_bay: loadingBay || null,
            job_id: selectedJob || null,
            location_id: locationId,
            title: customTitle || null,
            license_plate: licensePlate || null,
          })
          .select()
          .single();

        if (error) throw error;

        if (selectedDepartments.length > 0) {
          const { error: deptError } = await supabase
            .from("logistics_event_departments")
            .insert(
              selectedDepartments.map((dept) => ({
                event_id: newEvent.id,
                department: dept,
              }))
            );
          if (deptError) throw deptError;
        }

        toast({
          title: "Success",
          description: "Logistics event created successfully.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["logistics-events"] });
      queryClient.invalidateQueries({ queryKey: ["today-logistics"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? "Edit Logistics Event" : "Create Logistics Event"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Job</Label>
              <Select
                value={selectedJob || "no-job"}
                onValueChange={(value) => {
                  setSelectedJob(value === "no-job" ? null : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-job">No Job</SelectItem>
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <LocationInput 
                onSelectLocation={(loc: Location) => setLocation(loc)} 
              />
              {location.formatted_address && (
                <p className="text-sm text-muted-foreground">
                  Selected: {location.formatted_address}
                </p>
              )}
            </div>

            {selectedJob === null && (
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter event title"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select
                value={eventType}
                onValueChange={(value: "load" | "unload") => setEventType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="load">Load</SelectItem>
                  <SelectItem value="unload">Unload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Transport Type</Label>
              <Select value={transportType} onValueChange={setTransportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trailer">Trailer</SelectItem>
                  <SelectItem value="9m">9m</SelectItem>
                  <SelectItem value="8m">8m</SelectItem>
                  <SelectItem value="6m">6m</SelectItem>
                  <SelectItem value="4m">4m</SelectItem>
                  <SelectItem value="furgoneta">Furgoneta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Plate</Label>
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="Enter license plate"
              />
            </div>

            <div className="space-y-2">
              <Label>Departments</Label>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <Button
                    key={dept}
                    type="button"
                    variant={selectedDepartments.includes(dept) ? "default" : "outline"}
                    onClick={() => {
                      setSelectedDepartments((prev) =>
                        prev.includes(dept)
                          ? prev.filter((d) => d !== dept)
                          : [...prev, dept]
                      );
                    }}
                  >
                    {dept}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Loading Bay</Label>
              <Input
                value={loadingBay}
                onChange={(e) => setLoadingBay(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              {selectedEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button type="submit">
                {selectedEvent ? "Update" : "Create"} Event
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete This Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
