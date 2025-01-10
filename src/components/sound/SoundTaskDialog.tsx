import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import createFolderIcon from "@/assets/icons/icon.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, Trash2, Table } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SoundTaskDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TASK_TYPES = ["QT", "Rigging Plot", "Prediccion", "Pesos", "Consumos", "PS"];

const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Add query for job details
  const { data: jobDetails } = useQuery({
    queryKey: ['job-details', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('name, start_date, end_date, flex_folders_created')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!jobId
  });

  // Create mutation for updating flex_folders_created status
  const updateFolderStatus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('jobs')
        .update({ flex_folders_created: true })
        .eq('id', jobId);
      
      if (error) throw error;
    }
  });

  // Function to create Flex folders
  const createFlexFolders = async () => {
    if (!jobDetails || jobDetails.flex_folders_created) {
      toast({
        title: "Folders already created",
        description: "Flex folders have already been created for this job.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Format document number from start date (YYMMDD)
      const startDate = new Date(jobDetails.start_date);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, '');

      const params = {
        projectName: jobDetails.name,
        plannedStartDate: jobDetails.start_date,
        plannedEndDate: jobDetails.end_date,
        documentNumber
      };

      // Create main folder
      const mainFolderPayload = {
        definitionId: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
        parentElementId: null,
        open: true,
        locked: false,
        name: params.projectName,
        plannedStartDate: params.plannedStartDate,
        plannedEndDate: params.plannedEndDate,
        locationId: "2f49c62c-b139-11df-b8d5-00e08175e43e",
        notes: "Automated folder creation from Web App",
        documentNumber,
        personResponsibleId: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb"
      };

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': API_KEY
        },
        body: JSON.stringify(mainFolderPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const mainFolderResult = await response.json();

      // Update folder creation status in database
      await updateFolderStatus.mutateAsync();

      toast({
        title: "Success",
        description: "Flex folders have been created successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Rest of your existing component code...
  // [Previous queries and state remain the same]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <span>Sound Department Tasks</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={createFlexFolders}
              disabled={!jobDetails || jobDetails.flex_folders_created}
              title={jobDetails?.flex_folders_created ? "Folders already created" : "Create Flex Folders"}
            >
              <img
                src={createFolderIcon}
                alt="Create Flex Folders"
                className="h-6 w-6"
              />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personnel section with grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>FOH Engineers Required</Label>
              <Input
                type="number"
                min="0"
                value={personnel?.foh_engineers || 0}
                onChange={(e) => updatePersonnel('foh_engineers', parseInt(e.target.value))}
              />
            </div>
            {/* Rest of your personnel inputs... */}
          </div>

          {/* Tasks section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-medium">Total Progress:</span>
              <div className="flex-1">
                <Progress 
                  value={calculateTotalProgress()} 
                  className="h-2"
                />
              </div>
              <span className="text-sm">{calculateTotalProgress()}%</span>
            </div>

            {/* Table with horizontal scroll */}
            <div className="overflow-x-auto">
              <UITable>
                {/* Your existing table content... */}
              </UITable>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
