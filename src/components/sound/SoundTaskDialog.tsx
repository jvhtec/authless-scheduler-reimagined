import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Upload, Download, Trash2, Table, X } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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

interface AssignedUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface TaskDocument {
  id: string;
  file_name: string;
  file_path: string;
}

interface Task {
  id: string;
  task_type: string;
  assigned_to: AssignedUser | null;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  task_documents?: TaskDocument[];
}

const TASK_TYPES = ["QT", "Rigging Plot", "Prediccion", "Pesos", "Consumos", "PS"];

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [personnel, setPersonnel] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch jobDetails from jobs table
  const { data: jobData } = useQuery({
    queryKey: ['job-details', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId
  });

  // Update jobDetails when data changes
  useEffect(() => {
    if (jobData) {
      setJobDetails(jobData);
    }
  }, [jobData]);

  // Function to create flex folders
  const createFlexFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({ flex_folders_created: true })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Flex folders have been created successfully",
      });

      // Refresh job details
      queryClient.invalidateQueries({ queryKey: ['job-details', jobId] });
    } catch (error) {
      console.error('Error creating flex folders:', error);
      toast({
        title: "Error",
        description: "Failed to create flex folders",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-2 flex flex-row items-center justify-between border-b">
          <DialogTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <span>Sound Department Tasks</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={createFlexFolders}
              disabled={!jobDetails || jobDetails.flex_folders_created}
              className="hover:bg-gray-100 group relative"
            >
              <img
                src={createFolderIcon}
                alt="Create Flex Folders"
                className="h-6 w-6"
              />
              <span className="absolute -bottom-8 scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-white group-hover:scale-100 whitespace-nowrap">
                {jobDetails?.flex_folders_created ? "Folders already created" : "Create Flex Folders"}
              </span>
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        {/* ... rest of the DialogContent ... */}
      </DialogContent>
    </Dialog>
  );
};