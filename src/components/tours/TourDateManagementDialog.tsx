import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, MapPin, Plus, Trash2, FolderPlus } from "lucide-react";

// Flex API constants
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

const FLEX_FOLDER_IDS = {
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",
  location: "2f49c62c-b139-11df-b8d5-00e08175e43e",
};

const DEPARTMENT_IDS = {
  sound: "cdd5e372-d124-11e1-bba1-00e08175e43e",
  lights: "d5af7892-d124-11e1-bba1-00e08175e43e",
  video: "a89d124d-7a95-4384-943e-49f5c0f46b23",
  production: "890811c3-fe3f-45d7-af6b-7ca4a807e84d",
  personnel: "b972d682-598d-4802-a390-82e28dc4480e"
};

const RESPONSIBLE_PERSON_IDS = {
  sound: "4b0d98e0-e700-11ea-97d0-2a0a4490a7fb",
  lights: "4b559e60-e700-11ea-97d0-2a0a4490a7fb",
  video: "bb9690ac-f22e-4bc4-94a2-6d341ca0138d",
  production: "4ce97ce3-5159-401a-9cf8-542d3e479ade",
  personnel: "4b618540-e700-11ea-97d0-2a0a4490a7fb"
};

const DEPARTMENT_SUFFIXES = {
  sound: "S",
  lights: "L",
  video: "V",
  production: "P",
  personnel: "HR"
};

interface TourDateManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string | null;
  tourDates: any[];
}

export const TourDateManagementDialog = ({
  open,
  onOpenChange,
  tourId,
  tourDates = [],
}: TourDateManagementDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFoldersForDate = async (date: any) => {
    try {
      console.log('Creating folders for date:', date);

      // Fetch the parent tour information
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select(`
          name,
          flex_main_folder_id,
          flex_sound_folder_id,
          flex_lights_folder_id,
          flex_video_folder_id,
          flex_production_folder_id,
          flex_personnel_folder_id
        `)
        .eq('id', tourId)
        .single();

      if (tourError) {
        console.error('Error fetching tour:', tourError);
        throw tourError;
      }

      if (!tourData || !tourData.flex_main_folder_id) {
        throw new Error('Parent tour folders not found. Please create tour folders first.');
      }

      const formattedStartDate = new Date(date.date).toISOString().split('.')[0] + '.000Z';
      const formattedEndDate = new Date(date.date).toISOString().split('.')[0] + '.000Z';
      const documentNumber = new Date(date.date).toISOString().slice(2, 10).replace(/-/g, '');

      // Create subfolders under each department folder
      const departments = ['sound', 'lights', 'video', 'production', 'personnel'] as const;
      
      for (const dept of departments) {
        const parentFolderId = tourData[`flex_${dept}_folder_id`];
        
        if (!parentFolderId) {
          console.warn(`No parent folder ID found for ${dept} department`);
          continue;
        }

        const formattedDate = format(new Date(date.date), 'MMM d');

        const subFolderPayload = {
          definitionId: FLEX_FOLDER_IDS.subFolder,
          parentElementId: parentFolderId,
          open: true,
          locked: false,
          name: `${tourData.name} - ${formattedDate} - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
          plannedStartDate: formattedStartDate,
          plannedEndDate: formattedEndDate,
          locationId: FLEX_FOLDER_IDS.location,
          departmentId: DEPARTMENT_IDS[dept],
          notes: `Tour date subfolder for ${dept}`,
          documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}`,
          personResponsibleId: RESPONSIBLE_PERSON_IDS[dept]
        };

        console.log(`Creating subfolder for ${dept} with payload:`, subFolderPayload);

        const subResponse = await fetch(BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': API_KEY
          },
          body: JSON.stringify(subFolderPayload)
        });

        if (!subResponse.ok) {
          const errorData = await subResponse.json();
          console.error(`Error creating ${dept} subfolder:`, errorData);
          continue;
        }

        const subFolder = await subResponse.json();
        console.log(`${dept} subfolder created:`, subFolder);
      }

      toast({
        title: "Success",
        description: `Folders created for ${format(new Date(date.date), 'MMM d, yyyy')}`,
      });

    } catch (error: any) {
      console.error('Error creating folders:', error);
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddDate = async (date: string, location: string) => {
    try {
      console.log("Adding new tour date:", { date, location });

      // First get tour details to get the color and departments
      const { data: tourData, error: tourError } = await supabase
        .from("tours")
        .select(`
          name,
          color,
          tour_dates (
            jobs (
              color,
              job_departments (
                department
              )
            )
          )
        `)
        .eq('id', tourId)
        .single();

      if (tourError) {
        console.error('Error fetching tour:', tourError);
        throw tourError;
      }

      // Get or create location
      let locationId = null;
      if (location) {
        const { data: existingLocation } = await supabase
          .from("locations")
          .select("id")
          .eq("name", location)
          .maybeSingle();

        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          const { data: newLocation, error: locationError } = await supabase
            .from("locations")
            .insert({ name: location })
            .select()
            .single();

          if (locationError) throw locationError;
          locationId = newLocation.id;
        }
      }

      // Create tour date
      const { data: newTourDate, error: tourDateError } = await supabase
        .from("tour_dates")
        .insert({
          tour_id: tourId,
          date,
          location_id: locationId,
        })
        .select()
        .single();

      if (tourDateError) {
        console.error('Error creating tour date:', tourDateError);
        throw tourDateError;
      }

      console.log('Tour date created:', newTourDate);

      // Get departments from existing tour jobs
      const departments = tourData.tour_dates?.[0]?.jobs?.[0]?.job_departments?.map(
        (dept: any) => dept.department
      ) || ['sound', 'lights', 'video']; // Default departments if none found

      // Create job for this tour date
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: `${tourData.name} (Tour Date)`,
          start_time: `${date}T00:00:00`,
          end_time: `${date}T23:59:59`,
          location_id: locationId,
          tour_date_id: newTourDate.id,
          color: tourData.color || '#7E69AB',
          job_type: 'single'
        })
        .select()
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        throw jobError;
      }

      console.log('Job created:', newJob);

      // Create job departments
      const jobDepartments = departments.map(department => ({
        job_id: newJob.id,
        department
      }));

      const { error: deptError } = await supabase
        .from("job_departments")
        .insert(jobDepartments);

      if (deptError) {
        console.error('Error creating job departments:', deptError);
        throw deptError;
      }

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      toast({ 
        title: "Success", 
        description: "Tour date and job created successfully" 
      });
    } catch (error: any) {
      console.error("Error adding date:", error);
      toast({
        title: "Error adding date",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    try {
      console.log("Starting deletion of tour date:", dateId);

      // First, get the jobs associated with this tour date
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("tour_date_id", dateId);

      if (jobsError) throw jobsError;

      if (jobs && jobs.length > 0) {
        // Delete job assignments
        const { error: assignmentsError } = await supabase
          .from("job_assignments")
          .delete()
          .in("job_id", jobs.map(j => j.id));

        if (assignmentsError) throw assignmentsError;

        // Delete job departments
        const { error: departmentsError } = await supabase
          .from("job_departments")
          .delete()
          .in("job_id", jobs.map(j => j.id));

        if (departmentsError) throw departmentsError;

        // Delete the jobs
        const { error: jobsDeleteError } = await supabase
          .from("jobs")
          .delete()
          .in("id", jobs.map(j => j.id));

        if (jobsDeleteError) throw jobsDeleteError;
      }

      // Finally delete the tour date
      const { error: dateError } = await supabase
        .from("tour_dates")
        .delete()
        .eq("id", dateId);

      if (dateError) throw dateError;

      await queryClient.invalidateQueries({ queryKey: ["tours-with-dates"] });
      toast({ title: "Date deleted successfully" });
    } catch (error) {
      console.error("Error deleting date:", error);
      toast({
        title: "Error deleting date",
        variant: "destructive",
      });
    }
  };

  const createAllFolders = async () => {
    try {
      for (const date of tourDates) {
        await createFoldersForDate(date);
      }
      
      toast({
        title: "Success",
        description: "Folders created for all dates",
      });
    } catch (error: any) {
      console.error('Error creating folders for all dates:', error);
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tour Dates</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {tourDates.length > 0 && (
            <Button 
              onClick={createAllFolders}
              className="w-full"
              variant="outline"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folders for All Dates
            </Button>
          )}

          <div className="space-y-4">
            {tourDates?.map((date) => (
              <div
                key={date.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(date.date), "MMM d, yyyy")}</span>
                  </div>
                  {date.location?.name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{date.location.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => createFoldersForDate(date)}
                    title="Create Flex folders"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDate(date.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddDate(
                formData.get("date") as string,
                formData.get("location") as string
              );
              (e.target as HTMLFormElement).reset();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                name="date"
                required
              />
              <Input
                type="text"
                name="location"
                placeholder="Location"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Date
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
