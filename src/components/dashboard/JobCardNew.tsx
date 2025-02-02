import { SoundTaskDialog } from "@/components/sound/SoundTaskDialog";
import { LightsTaskDialog } from "@/components/lights/LightsTaskDialog";
import { VideoTaskDialog } from "@/components/video/VideoTaskDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import createFolderIcon from "@/assets/icons/icon.png";
import { Department } from "@/types/department";
import { ArtistManagementDialog } from "../festival/ArtistManagementDialog";
import { JobDocumentSection } from "./job-card/JobDocumentSection";
import { createAllFoldersForJob } from "@/utils/flexFolders";

export interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

export interface JobCardNewProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  showAssignments?: boolean;
  department?: Department;
  userRole?: string | null;
  onDeleteDocument?: (jobId: string, document: JobDocument) => void;
  showUpload?: boolean;
  showManageArtists?: boolean;
  isProjectManagementPage?: boolean;
}

// Constants used in folder creation
const FLEX_FOLDER_IDS = {
  mainFolder: "e281e71c-2c42-49cd-9834-0eb68135e9ac",
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",
  location: "2f49c62c-b139-11df-b8d5-00e08175e43e",
  mainResponsible: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb",
  documentacionTecnica: "3787806c-af2d-11df-b8d5-00e08175e43e",
  presupuestosRecibidos: "3787806c-af2d-11df-b8d5-00e08175e43e",
  hojaGastos: "566d32e0-1a1e-11e0-a472-00e08175e43e",
  crewCall: "253878cc-af31-11df-b8d5-00e08175e43e",
  pullSheet: "a220432c-af33-11df-b8d5-00e08175e43e"
};

const DRYHIRE_PARENT_IDS = {
  sound: {
    "01": "43b1f259-420e-4d12-b76d-1675ce6ddbfd",
    "02": "6d21b607-7c3a-43fe-bdb4-75a77a8ac4fa",
    "03": "b8f1c60a-8fa2-44a5-ac83-40012e73f639",
    "04": "68d9ff6c-8313-4ff9-844e-47873d958b9b",
    "05": "a19204e0-4b8c-4f2d-a86b-a07fa189f44c",
    "06": "27229f82-d759-4f7d-800a-1793e8c2b514",
    "07": "73b16d86-db32-4b91-bbe2-f11149db4aa5",
    "08": "8cdb98c5-8c32-4a14-bb3f-8a108cebb283",
    "09": "650960c8-3000-4e4a-8113-ec1cc5acb1c9",
    "10": "40ac2c72-3dbd-4804-998f-e42a6dd7dd33",
    "11": "edaae406-25c2-4154-80ac-662bff9921c2",
    "12": "bc758718-24c8-4045-bc65-6039b46fae0c"
  },
  lights: {
    "01": "967f1612-fb01-4608-ad1d-0dc002ae9f8b",
    "02": "0c42a6b2-03dc-40fe-b30f-6d406329e8b0",
    "03": "9dc0d60b-6d0b-4fc7-be1a-85989d7df6d0",
    "04": "af64eafc-f8e8-442c-84e1-9088f2a939eb",
    "05": "801ee08a-a868-42e1-8cf3-d34d33d881a5",
    "06": "de57a801-7e5a-4831-afdb-0816522082a2",
    "07": "0e8e9cf1-9ec2-4522-a46e-d3f60bc7816a",
    "08": "86cc8f06-6286-4825-bfb8-cfc3cd614c82",
    "09": "4f0297a6-89cd-4654-b8c5-14c20cb9bc44",
    "10": "73a98ac6-6c11-4680-a854-186cc3d6901e",
    "11": "43b1f259-420e-4d12-b76d-1675ce6ddbfd",
    "12": "faa70677-f8de-4161-8b2e-8846caa07ada"
  }
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

// ----------------------------------------------------------------
// JobCardNew Component
// ----------------------------------------------------------------
export function JobCardNew({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department = "sound",
  userRole,
  onDeleteDocument,
  showUpload = false,
  showManageArtists = false,
  isProjectManagementPage = false
}: JobCardNewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(true);
  const [assignments, setAssignments] = useState(job.job_assignments || []);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);
  const [artistManagementOpen, setArtistManagementOpen] = useState(false);
  const [soundTaskDialogOpen, setSoundTaskDialogOpen] = useState(false);
  const [lightsTaskDialogOpen, setLightsTaskDialogOpen] = useState(false);
  const [videoTaskDialogOpen, setVideoTaskDialogOpen] = useState(false);

  const assignedTechnicians =
    job.job_type !== "dryhire"
      ? assignments
          .map((assignment: any) => {
            let role = null;
            switch (department) {
              case "sound":
                role = assignment.sound_role;
                break;
              case "lights":
                role = assignment.lights_role;
                break;
              case "video":
                role = assignment.video_role;
                break;
              default:
                role =
                  assignment.sound_role ||
                  assignment.lights_role ||
                  assignment.video_role;
            }
            if (!role) return null;
            return {
              id: assignment.technician_id,
              name: `${assignment.profiles?.first_name || ""} ${
                assignment.profiles?.last_name || ""
              }`.trim(),
              role
            };
          })
          .filter(Boolean)
      : [];

  const { data: soundTasks } = useQuery({
    queryKey: ["sound-tasks", job.id],
    queryFn: async () => {
      if (department !== "sound") return null;
      const { data, error } = await supabase
        .from("sound_job_tasks")
        .select(
          `
            *,
            assigned_to (
              first_name,
              last_name
            ),
            task_documents(*)
          `
        )
        .eq("job_id", job.id);
      if (error) throw error;
      return data;
    },
    enabled: department === "sound",
    retry: 3,
    retryDelay: 1000
  });

  const { data: personnel } = useQuery({
    queryKey: ["sound-personnel", job.id],
    queryFn: async () => {
      if (department !== "sound") return null;
      const { data: existingData, error: fetchError } = await supabase
        .from("sound_job_personnel")
        .select("*")
        .eq("job_id", job.id)
        .maybeSingle();
      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
      if (!existingData) {
        const { data: newData, error: insertError } = await supabase
          .from("sound_job_personnel")
          .insert({
            job_id: job.id,
            foh_engineers: 0,
            mon_engineers: 0,
            pa_techs: 0,
            rf_techs: 0
          })
          .select()
          .single();
        if (insertError) throw insertError;
        return newData;
      }
      return existingData;
    },
    enabled: department === "sound"
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
    }
  });

  const createFlexFoldersHandler = async (e: React.MouseEvent) => {
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
      const startDate = new Date(job.start_time);
      const documentNumber = startDate
        .toISOString()
        .slice(2, 10)
        .replace(/-/g, "");

      const formattedStartDate =
        new Date(job.start_time).toISOString().split(".")[0] + ".000Z";
      const formattedEndDate =
        new Date(job.end_time).toISOString().split(".")[0] + ".000Z";

      await createAllFoldersForJob(job, formattedStartDate, formattedEndDate, documentNumber);
      await updateFolderStatus.mutateAsync();

      toast({
        title: "Success",
        description: "Flex folders have been created successfully."
      });
    } catch (error: any) {
      console.error("Error creating Flex folders:", error);
      toast({
        title: "Error creating folders",
        description: error.message,
        variant: "destructive"
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
    return soundTasks.filter((task: any) => task.status === "completed").length;
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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!["admin", "management"].includes(userRole || "")) {
      toast({
        title: "Permission denied",
        description: "Only management users can delete jobs",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm("Are you sure you want to delete this job?")) {
      return;
    }

    try {
      console.log("Deleting job:", job.id);

      const { data: soundTaskIds } = await supabase
        .from("sound_job_tasks")
        .select("id")
        .eq("job_id", job.id);
      const { data: lightsTaskIds } = await supabase
        .from("lights_job_tasks")
        .select("id")
        .eq("job_id", job.id);
      const { data: videoTaskIds } = await supabase
        .from("video_job_tasks")
        .select("id")
        .eq("job_id", job.id);

      if (soundTaskIds?.length) {
        const { error: soundDocsError } = await supabase
          .from("task_documents")
          .delete()
          .in("sound_task_id", soundTaskIds.map((t) => t.id));
        if (soundDocsError) throw soundDocsError;
      }
      if (lightsTaskIds?.length) {
        const { error: lightsDocsError } = await supabase
          .from("task_documents")
          .delete()
          .in("lights_task_id", lightsTaskIds.map((t) => t.id));
        if (lightsDocsError) throw lightsDocsError;
      }
      if (videoTaskIds?.length) {
        const { error: videoDocsError } = await supabase
          .from("task_documents")
          .delete()
          .in("video_task_id", videoTaskIds.map((t) => t.id));
        if (videoDocsError) throw videoDocsError;
      }

      await Promise.all([
        supabase.from("sound_job_tasks").delete().eq("job_id", job.id),
        supabase.from("lights_job_tasks").delete().eq("job_id", job.id),
        supabase.from("video_job_tasks").delete().eq("job_id", job.id)
      ]);

      await Promise.all([
        supabase.from("sound_job_personnel").delete().eq("job_id", job.id),
        supabase.from("lights_job_personnel").delete().eq("job_id", job.id),
        supabase.from("video_job_personnel").delete().eq("job_id", job.id)
      ]);

      if (job.job_documents?.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("job_documents")
          .remove(job.job_documents.map((doc: JobDocument) => doc.file_path));
        if (storageError) throw storageError;
      }

      const { error: jobDocsError } = await supabase
        .from("job_documents")
        .delete()
        .eq("job_id", job.id);
      if (jobDocsError) throw jobDocsError;

      const { error: assignmentsError } = await supabase
        .from("job_assignments")
        .delete()
        .eq("job_id", job.id);
      if (assignmentsError) throw assignmentsError;

      const { error: departmentsError } = await supabase
        .from("job_departments")
        .delete()
        .eq("job_id", job.id);
      if (departmentsError) throw departmentsError;

      const { error: jobError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", job.id);
      if (jobError) throw jobError;

      onDeleteClick(job.id);
      toast({
        title: "Success",
        description: "Job deleted successfully"
      });

      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive"
      });
    }
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const getBadgeForJobType = (jobType: string) => {
    switch (jobType) {
      case "festival":
        return <Badge className="ml-2">Festival</Badge>;
      case "dryhire":
        return <Badge variant="outline" className="ml-2">Dry Hire</Badge>;
      case "tourdate":
        return <Badge variant="secondary" className="ml-2">Tour Date</Badge>;
      default:
        return null;
    }
  };

  const refreshData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    toast({
      title: "Refreshed",
      description: "The job data has been refreshed."
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const filePath = `${department}/${job.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
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
          file_size: file.size
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    }
  };

  const canEdit = ["admin", "management"].includes(userRole || "");

  return (
    <>
      <Card
        className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          // If on the project management page, open the tasks dialog for the current department
          if (isProjectManagementPage) {
            if (department === "sound") {
              setSoundTaskDialogOpen(true);
            } else if (department === "lights") {
              setLightsTaskDialogOpen(true);
            } else if (department === "video") {
              setVideoTaskDialogOpen(true);
            } else {
              if (userRole !== "logistics") {
                onJobClick(job.id);
              }
            }
          } else {
            // Not in project management, do the default
            if (userRole !== "logistics") {
              onJobClick(job.id);
            }
          }
        }}
        style={{
          borderColor: `${job.color}30` || "#7E69AB30",
          backgroundColor: `${job.color}05` || "#7E69AB05"
        }}
      >
        <CardHeader> 
          <div className="flex items-center flex-grow">
            <div className="font-medium">
              {job.title}
              {getBadgeForJobType(job.job_type)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              title="Toggle Details"
              className="ml-2"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {job.job_type === "festival" && isProjectManagementPage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArtistManagementOpen(true)}
              >
                Manage Artists
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={refreshData} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                  title="Edit job details, dates, and location"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={createFlexFoldersHandler}
              disabled={job.flex_folders_created}
              title={job.flex_folders_created ? "Folders already created" : "Create Flex folders"}
            >
              <img src={createFolderIcon} alt="Create Flex folders" className="h-4 w-4" />
            </Button>
            {job.job_type !== "dryhire" && showUpload && (
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onClick={(ev) => ev.stopPropagation()}
                />
                <Button variant="ghost" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>
                  {format(new Date(job.start_time), "MMM d, yyyy")} -{" "}
                  {format(new Date(job.end_time), "MMM d, yyyy")}
                </span>
                <span className="text-muted-foreground">
                  {format(new Date(job.start_time), "HH:mm")}
                </span>
              </div>
            </div>
            {job.location?.name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {job.location.name}
              </div>
            )}
            {job.job_type !== "dryhire" && (
              <>
                {assignedTechnicians.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {assignedTechnicians.map((tech) => (
                        <Badge key={tech.id} variant="secondary" className="text-xs">
                          {tech.name} {tech.role && `(${tech.role})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <JobDocumentSection
                  jobId={job.id}
                  department={department}
                  documents={documents}
                  showUpload={showUpload}
                  jobType={job.job_type}
                />
              </>
            )}
          </div>

          {!collapsed && job.job_type !== "dryhire" && (
            <>
              {department === "sound" && personnel && (
                <>
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

                  {soundTasks?.length > 0 && (
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
                              <Badge variant={task.status === "completed" ? "default" : "secondary"}>
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
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Conditionally render the task dialogs based on department */}
      {soundTaskDialogOpen && (
        <SoundTaskDialog
          open={soundTaskDialogOpen}
          onOpenChange={setSoundTaskDialogOpen}
          jobId={job.id}
        />
      )}
      {lightsTaskDialogOpen && (
        <LightsTaskDialog
          open={lightsTaskDialogOpen}
          onOpenChange={setLightsTaskDialogOpen}
          jobId={job.id}
        />
      )}
      {videoTaskDialogOpen && (
        <VideoTaskDialog
          open={videoTaskDialogOpen}
          onOpenChange={setVideoTaskDialogOpen}
          jobId={job.id}
        />
      )}

      {artistManagementOpen && (
        <ArtistManagementDialog
          open={artistManagementOpen}
          onOpenChange={setArtistManagementOpen}
          jobId={job.id}
          start_time={job.start_time}
          end_time={job.end_time}
        />
      )}
    </>
  );
}

export default JobCardNew;
