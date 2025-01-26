import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Department } from "@/types/department";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface LogisticsEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedEvent?: {
    id: string;
    event_type: 'load' | 'unload';
    transport_type: string;
    event_time: string;
    loading_bay: string | null;
    job_id: string | null;
    license_plate: string | null;
    departments: { department: Department }[];
  };
}

export const LogisticsEventDialog = ({
  open,
  onOpenChange,
  selectedDate,
  selectedEvent,
}: LogisticsEventDialogProps) => {
  const [eventType, setEventType] = useState<'load' | 'unload'>('load');
  const [transportType, setTransportType] = useState<string>('trailer');
  const [time, setTime] = useState('09:00');
  const [date, setDate] = useState(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''); // New date field
  const [loadingBay, setLoadingBay] = useState('');
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const departments: Department[] = ["sound", "lights", "video"];

  useEffect(() => {
    if (selectedEvent) {
      setEventType(selectedEvent.event_type);
      setTransportType(selectedEvent.transport_type);
      setTime(selectedEvent.event_time);
      setDate(selectedEvent.event_date ? format(new Date(selectedEvent.event_date), 'yyyy-MM-dd') : ''); // Populate date
      setLoadingBay(selectedEvent.loading_bay || '');
      setSelectedJob(selectedEvent.job_id || '');
      setLicensePlate(selectedEvent.license_plate || '');
      setSelectedDepartments(selectedEvent.departments.map((d) => d.department));
    } else {
      // Reset form for new events
      setEventType('load');
      setTransportType('trailer');
      setTime('09:00');
      setDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''); // Reset date
      setLoadingBay('');
      setSelectedJob('');
      setLicensePlate('');
      setSelectedDepartments([]);
    }
  }, [selectedEvent, selectedDate]);

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('id, title');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast({
        title: "Error",
        description: "Date and time are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedEvent) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('logistics_events')
          .update({
            event_type: eventType,
            transport_type: transportType,
            event_date: date, // Include the updated date
            event_time: time,
            loading_bay: loadingBay || null,
            job_id: selectedJob || null,
            license_plate: licensePlate || null,
          })
          .eq('id', selectedEvent.id);

        if (updateError) throw updateError;

        // Update departments
        await supabase.from('logistics_event_departments').delete().eq('event_id', selectedEvent.id);

        if (selectedDepartments.length > 0) {
          const { error: deptError } = await supabase
            .from('logistics_event_departments')
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
        // Create new event
        const { data: newEvent, error } = await supabase
          .from('logistics_events')
          .insert({
            event_type: eventType,
            transport_type: transportType,
            event_date: date, // Include the selected date
            event_time: time,
            loading_bay: loadingBay || null,
            job_id: selectedJob || null,
            license_plate: licensePlate || null,
          })
          .select()
          .single();

        if (error) throw error;

        if (selectedDepartments.length > 0) {
          const { error: deptError } = await supabase
            .from('logistics_event_departments')
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

      queryClient.invalidateQueries({ queryKey: ['logistics-events'] });
      queryClient.invalidateQueries({ queryKey: ['today-logistics'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      // Delete departments first due to foreign key constraint
      await supabase.from('logistics_event_departments').delete().eq('event_id', selectedEvent.id);

      const { error } = await supabase.from('logistics_events').delete().eq('id', selectedEvent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logistics event deleted successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['logistics-events'] });
      queryClient.invalidateQueries({ queryKey: ['today-logistics'] });
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
            <DialogTitle>{selectedEvent ? 'Edit Logistics Event' : 'Create Logistics Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Job</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
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
                    variant={selectedDepartments.includes(dept) ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedDepartments((prev) =>
                        prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
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

            <div className="flex justify-between">
              {selectedEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button type="submit" className={selectedEvent ? 'ml-auto' : 'w-full'}>
                {selectedEvent ? 'Update' : 'Create'} Event
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the logistics event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
