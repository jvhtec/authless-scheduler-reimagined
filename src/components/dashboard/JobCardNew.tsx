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
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocuments } from "./JobDocuments";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import createFolderIcon from "@/assets/icons/icon.png";
import { Department } from "@/types/department";

// FLEX API Info
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

/**
 * The resource/definition IDs for your Flex environment.
 * 
 * IMPORTANT CHANGE:
 * - “Documentación Técnica” is "3787806c-af2d-11df-b8d5-00e08175e43e"
 * - “Presupuestos Recibidos” now ALSO points to the SAME ID.
 */
const FLEX_FOLDER_IDS = {
  // Top-level "main folder" definition (no parentElementId)
  mainFolder: "e281e71c-2c42-49cd-9834-0eb68135e9ac",

  // Department folder definition
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",

  // Possibly used for plannedStartDate / plannedEndDate
  location: "2f49c62c-b139-11df-b8d5-00e08175e43e",

  // Optional “main responsible” for the top folder
  mainResponsible: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb",

  // Documentación Técnica
  documentacionTecnica: "3787806c-af2d-11df-b8d5-00e08175e43e",
  // Presupuestos Recibidos => Using the SAME definition ID
  presupuestosRecibidos: "3787806c-af2d-11df-b8d5-00e08175e43e",

  // Hoja de Gastos
  hojaGastos: "566d32e0-1a1e-11e0-a472-00e08175e43e"
};

// Department references
const DEPARTMENT_IDS = {
  sound: "cdd5e372-d124-11e1-bba1-00e08175e43e",
  lights: "d5af7892-d124-11e1-bba1-00e08175e43e",
  video: "a89d124d-7a95-4384-943e-49f5c0f46b23",
  production: "890811c3-fe3f-45d7-af6b-7ca4a807e84d",
  personnel: "b972d682-598d-4802-a390-82e28dc4480e"
};

// Responsible person IDs
const RESPONSIBLE_PERSON_IDS = {
  sound: "4b0d98e0-e700-11ea-97d0-2a0a4490a7fb",
  lights: "4b559e60-e700-11ea-97d0-2a0a4490a7fb",
  video: "bb9690ac-f22e-4bc4-94a2-6d341ca0138d",
  production: "4ce97ce3-5159-401a-9cf8-542d3e479ade",
  personnel: "4b618540-e700-11ea-97d0-2a0a4490a7fb"
};

// Department suffixes for docNumbers
const DEPARTMENT_SUFFIXES = {
  sound: "S",
  lights: "L",
  video: "V",
  production: "P",
  personnel: "HR"
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

/**
 * Simple helper to create a folder in Flex. 
 * Returns the new folder object (with .elementId).
 */
async function createFlexFolder(payload: Record<string, any>) {
  console.log("Creating Flex folder with payload:", payload);
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Flex folder creation error:", errorData);
    throw new Error(errorData.exceptionMessage || "Failed to create folder in Flex");
  }

  const data = await response.json();
  console.log("Created Flex folder:", data);
  return data; // => { elementId: "uuid", ... }
}

/**
 * Create the entire hierarchy:
 * - Top-level folder (definition = mainFolder, no parentElementId)
 * - Sibling “Documentación Técnica”
 * - Department folders: Sound, Lights, Video, Production, Personnel
 * - Subfolders under each department (except Personnel):
 *   “Documentación Técnica,” “Presupuestos Recibidos,” “Hoja de Gastos”
 * 
 * “Presupuestos Recibidos” uses the SAME definition ID as “Documentación Técnica,” 
 * just a different name, since they’re the same doc type in Flex.
 */
async function createAllFoldersForJob(
  job: any,
  formattedStartDate: string,
  formattedEndDate: string,
  documentNumber: string
) {
  // 1) Top-level folder
  const topPayload = {
    definitionId: FLEX_FOLDER_IDS.mainFolder, // “no parent” => top-level
    open: true,
    locked: false,
    name: job.title,
    plannedStartDate: formattedStartDate,
    plannedEndDate: formattedEndDate,
    locationId: FLEX_FOLDER_IDS.location,
    personResponsibleId: FLEX_FOLDER_IDS.mainResponsible,
    documentNumber
  };
  const topFolder = await createFlexFolder(topPayload);
  const topFolderId = topFolder.elementId;

  // 2) Sibling folder: "Documentación Técnica" under top
  const docTecPayload = {
    definitionId: FLEX_FOLDER_IDS.documentacionTecnica,
    parentElementId: topFolderId,
    open: true,
    locked: false,
    name: "Documentación Técnica",
    plannedStartDate: formattedStartDate,
    plannedEndDate: formattedEndDate,
    locationId: FLEX_FOLDER_IDS.location
  };
  await createFlexFolder(docTecPayload);

  // 3) Department folders
  const departments = ["sound", "lights", "video", "production", "personnel"] as const;

  for (const dept of departments) {
    const deptPayload = {
      definitionId: FLEX_FOLDER_IDS.subFolder,
      parentElementId: topFolderId,
      open: true,
      locked: false,
      name: dept.charAt(0).toUpperCase() + dept.slice(1),
      plannedStartDate: formattedStartDate,
      plannedEndDate: formattedEndDate,
      locationId: FLEX_FOLDER_IDS.location,
      departmentId: DEPARTMENT_IDS[dept],
      documentNumber,
      personResponsibleId: RESPONSIBLE_PERSON_IDS[dept]
    };
    const deptFolder = await createFlexFolder(deptPayload);
    const deptFolderId = deptFolder.elementId;

    // Personnel has no subfolders
    if (dept === "personnel") continue;

    // 3 subfolders for the other depts:
    //   Documentación Técnica (same ID as above),
    //   Presupuestos Recibidos (SAME ID, different name),
    //   Hoja de Gastos
    const subfolders = [
      {
        definitionId: FLEX_FOLDER_IDS.documentacionTecnica,
        name: "Documentación Técnica",
        suffix: "DT"
      },
      {
        definitionId: FLEX_FOLDER_IDS.presupuestosRecibidos, // same ID
        name: "Presupuestos Recibidos",
        suffix: "PR"
      },
      {
        definitionId: FLEX_FOLDER_IDS.hojaGastos,
        name: "Hoja de Gastos",
        suffix: "HG"
      }
    ];

    for (const sf of subfolders) {
      const subPayload = {
        definitionId: sf.definitionId,
        parentElementId: deptFolderId,
        open: true,
        locked: false,
        name: sf.name,
        plannedStartDate: formattedStartDate,
        plannedEndDate: formattedEndDate,
        locationId: FLEX_FOLDER_IDS.location,
        departmentId: DEPARTMENT_IDS[dept],
        // e.g. "YYMMDDS-PR"
        documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}${sf.suffix}`,
        personResponsibleId: RESPONSIBLE_PERSON_IDS[dept]
      };
      await createFlexFolder(subPayload);
    }
  }
}

export const JobCardNew = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department = "sound",
  userRole,
  onDeleteDocument,
  showUpload = false
}: JobCardNewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(true);
  const [assignments, setAssignments] = useState(job.job_assignments || []);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);

  // Example: Sound tasks
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

  // Example: Sound personnel
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

  // Mark job as having flex_folders_created
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

  // Main function to create all folders
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
      // For docNumber, e.g. "YYMMDD"
      const startDate = new Date(job.start_time);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, "");

      const formattedStartDate =
        new Date(job.start_time).toISOString().split(".")[0] + ".000Z";
      const formattedEndDate =
        new Date(job.end_time).toISOString().split(".")[0] + ".000Z";

      // Create the entire structure
      await createAllFoldersForJob(job, formattedStartDate, formattedEndDate, documentNumber);

      // Mark in DB
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

  // Helpers for progress
  const calculateTotalProgress = () => {
    if (!soundTasks?.length) return 0;
    const totalProgress = soundTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
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

  // Edit
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  // Delete logic
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

      // 1) gather tasks
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

      // 2) delete task docs
      if (soundTaskIds?.length) {
        const { error: soundDocsError } = await supabase
          .from("task_documents")
          .delete()
          .in(
            "sound_task_id",
            soundTaskIds.map((t) => t.id)
          );
        if (soundDocsError) throw soundDocsError;
      }
      if (lightsTaskIds?.length) {
        const { error: lightsDocsError } = await supabase
          .from("task_documents")
          .delete()
          .in(
            "lights_task_id",
            lightsTaskIds.map((t) => t.id)
          );
        if (lightsDocsError) throw lightsDocsError;
      }
      if (videoTaskIds?.length) {
        const { error: videoDocsError } = await supabase
          .from("task_documents")
          .delete()
          .in(
            "video_task_id",
            videoTaskIds.map((t) => t.id)
          );
        if (videoDocsError) throw videoDocsError;
      }

      // 3) delete tasks
      await Promise.all([
        supabase.from("sound_job_tasks").delete().eq("job_id", job.id),
        supabase.from("lights_job_tasks").delete().eq("job_id", job.id),
        supabase.from("video_job_tasks").delete().eq("job_id", job.id)
      ]);

      // 4) delete dept personnel
      await Promise.all([
        supabase.from("sound_job_personnel").delete().eq("job_id", job.id),
        supabase.from("lights_job_personnel").delete().eq("job_id", job.id),
        supabase.from("video_job_personnel").delete().eq("job_id", job.id)
      ]);

      // 5) delete job docs from storage
      if (job.job_documents?.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("job_documents")
          .remove(job.job_documents.map((doc: JobDocument) => doc.file_path));
        if (storageError) throw storageError;
      }

      // 6) delete job docs from DB
      const { error: jobDocsError } = await supabase
        .from("job_documents")
        .delete()
        .eq("job_id", job.id);
      if (jobDocsError) throw jobDocsError;

      // 7) delete job assignments
      const { error: assignmentsError } = await supabase
        .from("job_assignments")
        .delete()
        .eq("job_id", job.id);
      if (assignmentsError) throw assignmentsError;

      // 8) delete job_departments
      const { error: departmentsError } = await supabase
        .from("job_departments")
        .delete()
        .eq("job_id", job.id);
      if (departmentsError) throw departmentsError;

      // 9) finally delete job
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

  // Collapsing UI
  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  // File upload => Supabase
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !department) return;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${department}/${job.id}/${crypto.randomUUID()}.${fileExt}`;

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

  // View doc => signed URL
  const handleViewDocument = async (doc: JobDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("job_documents")
        .createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast({
        title: "Error viewing document",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Delete doc => Supabase
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

      setDocuments(documents.filter((d) => d.id !== doc.id));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted."
      });
    } catch (err: any) {
      toast({
        title: "Error deleting document",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // If userRole="logistics", no edit
  const canEdit = userRole !== "logistics";

  // Convert assignments => [ {id, name, role} ]
  const assignedTechnicians = assignments
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
          role = assignment.sound_role || assignment.lights_role || assignment.video_role;
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
    .filter(Boolean);

  // Force refresh
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

  return (
    <Card
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => userRole !== "logistics" && onJobClick(job.id)}
      style={{
        borderColor: `${job.color}30` || "#7E69AB30",
        backgroundColor: `${job.color}05` || "#7E69AB05"
      }}
    >
      <CardHeader className="pb-2 flex justify-between items-center">
        <div className="flex items-center flex-grow">
          <div className="font-medium">
            {job.title}
            {job.job_type === "tour" && (
              <Badge variant="secondary" className="ml-2">
                Tour
              </Badge>
            )}
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
          <Button variant="ghost" size="icon" onClick={refreshData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={createFlexFolders}
            disabled={job.flex_folders_created}
            title={job.flex_folders_created ? "Folders already created" : "Create Flex folders"}
          >
            <img src={createFolderIcon} alt="Create Flex folders" className="h-4 w-4" />
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
          {showUpload && (
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
          {assignedTechnicians.length > 0 && (
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
          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">Documents</div>
              <div className="space-y-2">
                {documents.map((doc) => (
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
        </div>

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
      </CardContent>
    </Card>
  );
};

export default JobCardNew;