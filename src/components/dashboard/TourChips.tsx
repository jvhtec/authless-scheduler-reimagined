// Add these interfaces at the top of the file
interface TourFolders {
  flex_main_folder_id: string | null;
  flex_sound_folder_id: string | null;
  flex_lights_folder_id: string | null;
  flex_video_folder_id: string | null;
  flex_production_folder_id: string | null;
  flex_personnel_folder_id: string | null;
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TourDateManagementDialog } from "../tours/TourDateManagementDialog";
import { TourCard } from "../tours/TourCard";
import CreateTourDialog from "../tours/CreateTourDialog";
import { useToast } from "@/hooks/use-toast";

// Add these constants after the imports
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

const FLEX_FOLDER_IDS = {
  mainFolder: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",
  location: "2f49c62b-b139-11df-b8d5-00e08175e43e",
  mainResponsible: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb"
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

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [isDatesDialogOpen, setIsDatesDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      console.log("Fetching tours...");
      const { data: toursData, error: toursError } = await supabase
        .from("tours")
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          color,
          flex_folders_created,
          tour_dates (
            id,
            date,
            location:locations (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (toursError) {
        console.error("Error fetching tours:", toursError);
        throw toursError;
      }

      console.log("Tours fetched successfully");
      return toursData;
    }
  });

  const handleManageDates = (tourId: string) => {
    setSelectedTourId(tourId);
    setIsDatesDialogOpen(true);
  };

  const handleCreateFlexFolders = async (tourId: string) => {
    try {
      console.log("Creating Flex folders for tour:", tourId);
      const tour = tours.find(t => t.id === tourId);
      
      if (!tour) {
        throw new Error("Tour not found");
      }

      if (tour.flex_folders_created) {
        toast({
          title: "Folders already created",
          description: "Flex folders have already been created for this tour.",
          variant: "destructive"
        });
        return;
      }

      const startDate = new Date(tour.start_date);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, '');
      
      const formattedStartDate = new Date(tour.start_date).toISOString().split('.')[0] + '.000Z';
      const formattedEndDate = new Date(tour.end_date).toISOString().split('.')[0] + '.000Z';

      console.log('Formatted dates:', { formattedStartDate, formattedEndDate });

      // Create main folder
      const mainFolderPayload = {
        definitionId: FLEX_FOLDER_IDS.mainFolder,
        parentElementId: null,
        open: true,
        locked: false,
        name: tour.name,
        plannedStartDate: formattedStartDate,
        plannedEndDate: formattedEndDate,
        locationId: FLEX_FOLDER_IDS.location,
        notes: "Automated folder creation from Web App",
        documentNumber,
        personResponsibleId: FLEX_FOLDER_IDS.mainResponsible
      };

      console.log('Creating main folder with payload:', mainFolderPayload);

      const mainResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': API_KEY
        },
        body: JSON.stringify(mainFolderPayload)
      });

      if (!mainResponse.ok) {
        const errorData = await mainResponse.json();
        console.error('Flex API error creating main folder:', errorData);
        throw new Error(errorData.exceptionMessage || 'Failed to create main folder');
      }

      const mainFolder = await mainResponse.json();
      console.log('Main folder created:', mainFolder);

      // Store the main folder information
      const folderUpdates: any = {
        flex_main_folder_id: mainFolder.elementId,
        flex_main_folder_number: mainFolder.elementNumber
      };

      // Create department subfolders
      const departments = ['sound', 'lights', 'video', 'production', 'personnel'] as const;
      
      for (const dept of departments) {
        const subFolderPayload = {
          definitionId: FLEX_FOLDER_IDS.subFolder,
          parentElementId: mainFolder.elementId,
          open: true,
          locked: false,
          name: `${tour.name} - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
          plannedStartDate: formattedStartDate,
          plannedEndDate: formattedEndDate,
          locationId: FLEX_FOLDER_IDS.location,
          departmentId: DEPARTMENT_IDS[dept],
          notes: `Automated subfolder creation for ${dept}`,
          documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}`,
          personResponsibleId: RESPONSIBLE_PERSON_IDS[dept]
        };

        console.log(`Creating subfolder for ${dept} with payload:`, subFolderPayload);

        try {
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

          folderUpdates[`flex_${dept}_folder_id`] = subFolder.elementId;
          folderUpdates[`flex_${dept}_folder_number`] = subFolder.elementNumber;
        } catch (error) {
          console.error(`Error creating ${dept} subfolder:`, error);
        }
      }

      // Update tour with all folder IDs
      const { error: updateError } = await supabase
        .from('tours')
        .update({
          ...folderUpdates,
          flex_folders_created: true
        })
        .eq('id', tourId);

      if (updateError) {
        console.error('Error updating tour with folder info:', updateError);
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Flex folders have been created successfully.",
      });

    } catch (error: any) {
      console.error('Error creating Flex folders:', error);
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tours</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tour
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tours.map((tour) => (
          <TourCard
            key={tour.id}
            tour={tour}
            onTourClick={() => onTourClick(tour.id)}
            onManageDates={() => handleManageDates(tour.id)}
            onCreateFlexFolders={() => handleCreateFlexFolders(tour.id)}
          />
        ))}
      </div>

      <TourDateManagementDialog
        tourId={selectedTourId}
        open={isDatesDialogOpen}
        onOpenChange={setIsDatesDialogOpen}
        tourDates={tours.find(t => t.id === selectedTourId)?.tour_dates || []}
      />

      <CreateTourDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        currentDepartment="sound"
      />
    </div>
  );
};