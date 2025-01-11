import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  FolderPlus,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

const FLEX_FOLDER_IDS = {
  mainFolder: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",
  location: "2f49c62c-b139-11df-b8d5-00e08175e43e",
  mainResponsible: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb",
};

const DEPARTMENT_IDS = {
  sound: "cdd5e372-d124-11e1-bba1-00e08175e43e",
  lights: "d5af7892-d124-11e1-bba1-00e08175e43e",
  video: "a89d124d-7a95-4384-943e-49f5c0f46b23",
  production: "890811c3-fe3f-45d7-af6b-7ca4a807e84d",
  personnel: "b972d682-598d-4802-a390-82e28dc4480e",
};

const RESPONSIBLE_PERSON_IDS = {
  sound: "4b0d98e0-e700-11ea-97d0-2a0a4490a7fb",
  lights: "4b559e60-e700-11ea-97d0-2a0a4490a7fb",
  video: "bb9690ac-f22e-4bc4-94a2-6d341ca0138d",
  production: "4ce97ce3-5159-401a-9cf8-542d3e479ade",
  personnel: "4b618540-e700-11ea-97d0-2a0a4490a7fb",
};

const DEPARTMENT_SUFFIXES = {
  sound: "S",
  lights: "L",
  video: "V",
  production: "P",
  personnel: "HR",
};

interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface JobCardNewProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  showAssignments?: boolean;
  department?: string;
  userRole?: string | null;
  onDeleteDocument?: (jobId: string, document: JobDocument) => void;
  showUpload?: boolean;
}

export const JobCardNew = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  userRole,
  onDeleteDocument,
  showUpload = false,
}: JobCardNewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(true);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);

  const { data: soundTasks } = useQuery({
    queryKey: ["sound-tasks", job.id],
    queryFn: async () => {
      if (department !== "sound") return null;

      const { data, error } = await supabase
        .from("sound_job_tasks")
        .select(`
          *,
          assigned_to (
            first_name,
            last_name
          ),
          task_documents(*)
        `)
        .eq("job_id", job.id);

      if (error) throw error;
      return data;
    },
    enabled: department === "sound",
  });

  const { data: personnel } = useQuery({
    queryKey: ["sound-personnel", job.id],
    queryFn: async () => {
      if (department !== "sound") return null;

      const { data, error } = await supabase
        .from("sound_job_personnel")
        .select("*")
        .eq("job_id", job.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: department === "sound",
  });

  const calculateTotalProgress = () => {
    if (!soundTasks?.length) return 0;
    const totalProgress = soundTasks.reduce((acc, task) => acc + (task.progress || 0), 0);
    return Math.round(totalProgress / soundTasks.length);
  };

  const getCompletedTasks = () => {
    if (!soundTasks?.length) return 0;
    return soundTasks.filter((task) => task.status === "completed").length;
  };

  const getTotalPersonnel = () => {
    if (!personnel) return 0;
    return (
      (personnel.foh_engineers || 0) +
      (personnel.mon_engineers || 0) +
      (personnel.pa_techs || 0) +
      (personnel.rf_techs || 0)
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !department) return;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${department}/${job.id}/${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("job_documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("job_documents")
        .insert({
          job_id: job.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const handleCreateFolders = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.flex_folders_created) {
      toast({
        title: "Folders already created",
        description: "Flex folders have already been created for this job.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startDate = new Date(job.start_time);
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = new Date(job.end_time).toISOString();

      const mainFolderPayload = {
        definitionId: FLEX_FOLDER_IDS.mainFolder,
        name: job.title,
        plannedStartDate: formattedStartDate,
        plannedEndDate: formattedEndDate,
        locationId: FLEX_FOLDER_IDS.location,
        personResponsibleId: FLEX_FOLDER_IDS.mainResponsible,
      };

      const mainResponse = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": API_KEY },
        body: JSON.stringify(mainFolderPayload),
      });

      if (!mainResponse.ok) throw new Error("Main folder creation failed");

      const mainFolder = await mainResponse.json();
      const subFolderPromises = ["sound", "lights", "video"].map(async (dept) => {
        const subFolderPayload = {
          definitionId: FLEX_FOLDER_IDS.subFolder,
          parentElementId: mainFolder.id,
          name: `${job.title} - ${dept}`,
          plannedStartDate: formattedStartDate,
          plannedEndDate: formattedEndDate,
          locationId: FLEX_FOLDER_IDS.location,
          departmentId: DEPARTMENT_IDS[dept as keyof typeof DEPARTMENT_IDS],
        };

        const subResponse = await fetch(BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Auth-Token": API_KEY },
          body: JSON.stringify(subFolderPayload),
        });

        if (!subResponse.ok) throw new Error(`Subfolder creation failed for ${dept}`);
      });

      await Promise.all(subFolderPromises);

      toast({ title: "Success", description: "Flex folders created successfully." });
    } catch (error: any) {
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-2 flex justify-between items-center">
        <div className="flex items-center flex-grow">
          <div className="font-medium">
            {job.title}
            {job.job_type === "tour" && <Badge variant="secondary" className="ml-2">Tour</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={toggleCollapse} className="ml-2">
            {collapsed ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries(["jobs"])}>
            <RefreshCw />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCreateFolders}>
            <FolderPlus />
          </Button>
          {showUpload && (
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="ghost" size="icon">
                <Upload />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDeleteClick(job.id)}>
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <p>Personnel: {getTotalPersonnel()}</p>
              <p>Task Progress: {calculateTotalProgress()}%</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};