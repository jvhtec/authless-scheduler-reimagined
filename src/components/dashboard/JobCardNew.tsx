import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocument } from "@/types/job";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import createFolderIcon from "@/assets/icons/icon.png";
import { Department } from "@/types/department";
import { ArtistManagementDialog } from "../festival/ArtistManagementDialog";

interface JobCardNewProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  department?: Department;
  onDeleteDocument?: (jobId: string, document: JobDocument) => void;
  showUpload?: boolean;
  userRole?: string | null;
  isProjectManagementPage?: boolean;
}

export function JobCardNew({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  onDeleteDocument,
  showUpload = false,
  userRole,
  isProjectManagementPage = false
}: JobCardNewProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [artistManagementOpen, setArtistManagementOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sound tasks query
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
    enabled: department === "sound"
  });

  // Lights tasks query
  const { data: lightsTasks } = useQuery({
    queryKey: ["lights-tasks", job.id],
    queryFn: async () => {
      if (department !== "lights") return null;
      const { data, error } = await supabase
        .from("lights_job_tasks")
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
    enabled: department === "lights"
  });

  // Video tasks query
  const { data: videoTasks } = useQuery({
    queryKey: ["video-tasks", job.id],
    queryFn: async () => {
      if (department !== "video") return null;
      const { data, error } = await supabase
        .from("video_job_tasks")
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
    enabled: department === "video"
  });

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
    if (!window.confirm("Are you sure you want to delete this job?")) return;
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
        .eq("job_id", job.id);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${job.id}/${crypto.randomUUID()}.${fileExt}`;
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
        title: "Document uploaded",
        description: "The document has been successfully uploaded."
      });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleViewDocument = async (doc: JobDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("job_documents")
        .createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast({
        title: "Error",
        description: "Failed to view document",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (doc: JobDocument) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const { error: storageError } = await supabase.storage
        .from("job_documents")
        .remove([doc.file_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase
        .from("job_documents")
        .delete()
        .eq("id", doc.id);
      if (dbError) throw dbError;
      if (onDeleteDocument) {
        onDeleteDocument(job.id, doc);
      }
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted."
      });
    } catch (err: any) {
      console.error("Error deleting document:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const canEdit = userRole !== "logistics";

  const assignedTechnicians = job.job_assignments?.map((assignment: any) => {
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
        role = assignment.sound_role || assignment.lights_role || assignment.video_role;
    }
    if (!role) return null;
    return {
      id: assignment.technician_id,
      name: `${assignment.profiles?.first_name || ""} ${assignment.profiles?.last_name || ""}`.trim(),
      role
    };
  }).filter(Boolean);

  const refreshData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    await queryClient.invalidateQueries({ queryKey: ["sound-tasks", job.id] });
    await queryClient.invalidateQueries({ queryKey: ["sound-personnel", job.id] });
    toast({
      title: "Data refreshed",
      description: "The job information has been updated."
    });
  };

  const getBadgeForJobType = (jobType: string) => {
    switch (jobType) {
      case "tour":
        return <Badge variant="secondary" className="ml-2">Tour</Badge>;
      case "single":
        return <Badge variant="secondary" className="ml-2">Single</Badge>;
      case "festival":
        return <Badge variant="secondary" className="ml-2">Festival</Badge>;
      case "tourdate":
        return <Badge variant="secondary" className="ml-2">Tour Date</Badge>;
      case "dryhire":
        return <Badge variant="secondary" className="ml-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Dry Hire</Badge>;
      default:
        return null;
    }
  };

  const handleJobClick = () => {
    if (job.job_type === "dryhire") return;
    onJobClick(job.id);
  };

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "mb-4 hover:shadow-md transition-shadow",
          job.job_type === "dryhire" ? "cursor-default" : "cursor-pointer"
        )}
        onClick={handleJobClick}
        style={{
          borderColor: `${job.color}30` || "#7E69AB30",
          backgroundColor: `${job.color}05` || "#7E69AB05"
        }}
      >
        <CardHeader className="pb-2 flex justify-between items-center">
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
                {assignedTechnicians?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {assignedTechnicians.map((tech: any) => (
                        <Badge key={tech.id} variant="secondary" className="text-xs">
                          {tech.name} {tech.role && `(${tech.role})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {job.job_documents?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium">Documents</div>
                    <div className="space-y-2">
                      {job.job_documents.map((doc: JobDocument) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 rounded-md bg-accent/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{doc.file_name}</span>
                            <span className="text-xs text-muted-foreground">
                              Uploaded {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDocument(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!collapsed && job.job_type !== "dryhire" && (
            <>
              {/* Tasks Section: only for non-dryhire jobs */}
              <div className="mt-6 border p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Tasks</h2>
                {department === "sound" && soundTasks && soundTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Sound Tasks</h3>
                    {soundTasks.map((task: any) => (
                      <div key={task.id} className="border p-2 rounded">
                        <p><strong>Task:</strong> {task.title || "Untitled Task"}</p>
                        <p><strong>Status:</strong> {task.status}</p>
                        <p><strong>Progress:</strong> {task.progress}%</p>
                      </div>
                    ))}
                  </div>
                )}
                {department === "lights" && lightsTasks && lightsTasks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-lg font-medium">Lights Tasks</h3>
                    {lightsTasks.map((task: any) => (
                      <div key={task.id} className="border p-2 rounded">
                        <p><strong>Task:</strong> {task.title || "Untitled Task"}</p>
                        <p><strong>Status:</strong> {task.status}</p>
                        <p><strong>Progress:</strong> {task.progress}%</p>
                      </div>
                    ))}
                  </div>
                )}
                {department === "video" && videoTasks && videoTasks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-lg font-medium">Video Tasks</h3>
                    {videoTasks.map((task: any) => (
                      <div key={task.id} className="border p-2 rounded">
                        <p><strong>Task:</strong> {task.title || "Untitled Task"}</p>
                        <p><strong>Status:</strong> {task.status}</p>
                        <p><strong>Progress:</strong> {task.progress}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Render Artist Management Dialog for festival jobs */}
      {artistManagementOpen && (
        <ArtistManagementDialog
          open={artistManagementOpen}
          onOpenChange={setArtistManagementOpen}
          jobId={job.id}
          start_time={job.start_time}
          end_time={job.end_time}
        />
      )}
    </div>
  );
}