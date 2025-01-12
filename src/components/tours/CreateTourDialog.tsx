Based on your provided snippet and instructions, here is a CreateTourDialog component that incorporates a Flex folder creation button and uses similar logic to your example. This component assumes you pass a job object and other necessary props. It uses the Flex API constants, payload structure, and folder creation logic similar to your snippet, and integrates folder creation into a dialog form for creating tours.

Note:
	•	Replace placeholder values (like API endpoint URLs, job properties, etc.) with actual values if they differ.
	•	Ensure that the required constants (Flex API IDs, keys, etc.) are correct and that you handle sensitive information appropriately.
	•	This component now includes a button to trigger Flex folder creation based on the example provided.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Department } from "@/types/department";
import { TourFormFields } from "./TourFormFields";
import { useTourCreation } from "./useTourCreation";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Flex API constants
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

const FLEX_FOLDER_IDS = {
  mainFolder: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",
  location: "2f49c62c-b139-11df-b8d5-00e08175e43e",
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

interface CreateTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDepartment: Department;
  job: any;  // Assuming job object is passed in with necessary details
}

export const CreateTourDialog = ({
  open,
  onOpenChange,
  currentDepartment,
  job,
}: CreateTourDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const availableDepartments: Department[] = ["sound", "lights", "video"];

  const {
    title,
    setTitle,
    description,
    setDescription,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    color,
    setColor,
    departments,
    handleDepartmentChange,
    handleSubmit,
  } = useTourCreation(currentDepartment, () => onOpenChange(false));

  const [folderIds, setFolderIds] = useState<string[]>([]);

  const createFlexFolders = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (job.flex_folders_created) {
      toast({
        title: "Folders already created",
        description: "Flex folders have already been created for this job.",
        variant: "destructive"
      });
      return;
    }

    try {
      const startDateObj = new Date(job.start_time);
      const documentNumber = startDateObj.toISOString().slice(2, 10).replace(/-/g, '');
      
      // Format dates correctly for the API
      const formattedStartDate = new Date(job.start_time).toISOString().split('.')[0] + '.000Z';
      const formattedEndDate = new Date(job.end_time).toISOString().split('.')[0] + '.000Z';

      // Create main folder payload
      const mainFolderPayload = {
        definitionId: FLEX_FOLDER_IDS.mainFolder,
        parentElementId: null,
        open: true,
        locked: false,
        name: job.title,
        plannedStartDate: formattedStartDate,
        plannedEndDate: formattedEndDate,
        locationId: FLEX_FOLDER_IDS.location,
        notes: "Automated folder creation from Web App",
        documentNumber,
        personResponsibleId: FLEX_FOLDER_IDS.mainResponsible
      };

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
        throw new Error(errorData.exceptionMessage || 'Failed to create main folder');
      }

      const mainFolder = await mainResponse.json();

      const departments = ['sound', 'lights', 'video', 'production', 'personnel'];
      for (const dept of departments) {
        const subFolderPayload = {
          definitionId: FLEX_FOLDER_IDS.subFolder,
          parentElementId: mainFolder.elementId,
          open: true,
          locked: false,
          name: `${job.title} - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
          plannedStartDate: formattedStartDate,
          plannedEndDate: formattedEndDate,
          locationId: FLEX_FOLDER_IDS.location,
          departmentId: DEPARTMENT_IDS[dept as keyof typeof DEPARTMENT_IDS],
          notes: `Automated subfolder creation for ${dept}`,
          documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept as keyof typeof DEPARTMENT_SUFFIXES]}`,
          personResponsibleId: RESPONSIBLE_PERSON_IDS[dept as keyof typeof RESPONSIBLE_PERSON_IDS]
        };

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
        } catch (error) {
          console.error(`Error creating ${dept} subfolder:`, error);
          // Continue with other folders even if one fails
        }
      }

      // Update job status locally after folder creation
      // You might call an API or update state here to mark folders as created.
      job.flex_folders_created = true;
      updateFolderStatus.mutate();  // Assuming a mutation to update folder status in the backend

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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
          <DialogDescription>Add a new tour with a start and end date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TourFormFields
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            color={color}
            setColor={setColor}
            departments={departments}
            availableDepartments={availableDepartments}
            currentDepartment={currentDepartment}
            onDepartmentChange={handleDepartmentChange}
          />

          <Button type="button" onClick={createFlexFolders} className="w-full">
            Create Flex Folder
          </Button>

          <Button type="submit" className="w-full">
            Create Tour
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

Explanation:
	•	The component uses similar Flex API constants, payload formatting, and folder creation logic as in your snippet.
	•	createFlexFolders checks if folders were already created for the job. If not, it formats dates, constructs the payload for the main folder, and sends a POST request to create it. Then it loops through departments to create subfolders.
	•	After successful creation, it updates the job’s folder creation status (both locally and via a mutation call) and shows a success toast.
	•	The Flex API key and endpoint URL are hardcoded for demonstration, following your snippet’s approach. In a real scenario, store sensitive keys securely (e.g., in environment variables or secure storage).
	•	The rest of the dialog remains focused on creating tours, with the additional Flex folder creation button integrated.

Adjust this code as necessary to fit your application’s architecture, data structures, and security practices.