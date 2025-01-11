import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, Users, Edit, Trash2, Upload, RefreshCw, ChevronDown, ChevronUp, Eye, FolderPlus } from "lucide-react";
import { format } from "date-fns";
import { Department } from "@/types/department";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocuments } from "./JobDocuments";
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
  department?: Department;
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

  const updateFolderStatus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("jobs")
        .update({ flex_folders_created: true })
        .eq("id", job.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const refreshData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    await queryClient.invalidateQueries({ queryKey: ["sound-tasks", job.id] });
    await queryClient.invalidateQueries({ queryKey: ["sound-personnel", job.id] });

    toast({
      title: "Data refreshed",
      description: "The job information has been updated.",
    });
  };

  const createFlexFolders = async (e: React.MouseEvent) => {
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
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, "");

      const formattedStartDate = new Date(job.start_time).toISOString().split(".")[0] + ".000Z";
      const formattedEndDate = new Date(job.end_time).toISOString().split(".")[0] + ".000Z";

      const mainFolderPayload = {
        definitionId: FLEX_FOLDER_IDS.mainFolder,
        name: job.title,
        plannedStartDate: formattedStartDate,
        plannedEndDate: formattedEndDate,
        locationId: FLEX_FOLDER_IDS.location,
        notes: "Automated folder creation from Web App",
        documentNumber,
        personResponsibleId: FLEX_FOLDER_IDS.mainResponsible,
      };

      const mainResponse = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": API_KEY,
        },
        body: JSON.stringify(mainFolderPayload),
      });

      if (!mainResponse.ok) throw new Error("Failed to create main folder");

      await updateFolderStatus.mutateAsync();

      toast({
        title: "Success",
        description: "Flex folders have been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  return (
    <Card
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => userRole !== "logistics" && onJobClick(job.id)}
      style={{
        borderColor: `${job.color}30` || "#7E69AB30",
        backgroundColor: `${job.color}05` || "#7E69AB05",
      }}
    >
      <CardHeader className="pb-2 flex justify-between items-center">
        <div className="flex items-center flex-grow">
          <div className="font-medium">
            {job.title}
            {job.job_type === "tour" && <Badge variant="secondary" className="ml-2">Tour</Badge>}
          </div>
          <Button variant="ghost" size="icon" onClick={toggleCollapse} className="ml-2">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={refreshData} title="Refresh Data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={createFlexFolders}
            disabled={job.flex_folders_created}
            title={job.flex_folders_created ? "Folders already created" : "Create Flex folders"}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(new Date(job.start_time), "HH:mm")}
          </div>
          {job.location?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {job.location.name}
            </div>
          )}
          {!collapsed && (
            <>
              {department === "sound" && personnel && (
                <div className="mt-2 p-2 bg-accent/20 rounded-md">
                  <div className="text-xs font-medium mb-1">
                    Required Personnel: {getTotalPersonnel()}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>FOH Engineers: {personnel.foh_engineers || 0}</div>
                    <div>MON Engineers: {personnel.mon_engineers || 0}</div>
                    <div>PA Techs: {personnel.pa_techs || 0}</div>
                    <div>RF Techs: {personnel.rf_techs || 0}</div>
                  </div>
                </div>
              )}
              {department === "sound" && soundTasks?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Task Progress ({getCompletedTasks()}/{soundTasks.length} completed)
                    </span>
                    <span>{calculateTotalProgress()}%</span>
                  </div>
                  <Progress value={calculateTotalProgress()} className="h-1" />
                  <div className="space-y-1">
                    {soundTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between text-xs">
                        <span>{task.task_type}</span>
                        <div className="flex items-center gap-2">
                          {task.assigned_to && (
                            <span className="text-muted-foreground">
                              {task.assigned_to.first_name} {task.assigned_to.last_name}
                            </span>
                          )}
                          <Badge
                            variant={task.status === "completed" ? "default" : "secondary"}
                          >
                            {task.status === "not_started"
                              ? "Not Started"
                              : task.status === "in_progress"
                              ? "In Progress"
                              : "Completed"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {job.job_documents && onDeleteDocument && (
                <JobDocuments
                  jobId={job.id}
                  documents={job.job_documents}
                  department={department}
                  onDeleteDocument={onDeleteDocument}
                />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
