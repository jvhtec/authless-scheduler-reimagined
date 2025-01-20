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

/**
 * Flex API base URL and token
 */
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

/**
 * The real definition/resource IDs from your file:
 */
const FLEX_FOLDER_IDS = {
  // Used as definitionId for the TOP-LEVEL folder (no parent).
  mainFolder: "e281e71c-2c42-49cd-9834-0eb68135e9ac",

  // Used as definitionId for each Department folder. 
  // (If these are “subFolder,” that’s what Flex calls them.)
  subFolder: "358f312c-b051-11df-b8d5-00e08175e43e",

  // Possibly used for plannedStartDate / plannedEndDate location references
  location: "2f49c62c-b139-11df-b8d5-00e08175e43e",

  // (Not strictly needed if we’re not applying a single “mainResponsible” to the top folder,
  // but left here if you want to use it.)
  mainResponsible: "4bc2df20-e700-11ea-97d0-2a0a4490a7fb",

  // Subfolder definitions for doc, budgets, etc.
  documentacionTecnica: "3787806c-af2d-11df-b8d5-00e08175e43e",
  presupuestosRecibidos: "378f1234-af2d-11df-b8d5-00e08175e43e",
  hojaGastos: "566d32e0-1a1e-11e0-a472-00e08175e43e"
};

/**
 * Department ID references (if you’re assigning them in Flex):
 */
const DEPARTMENT_IDS = {
  sound: "cdd5e372-d124-11e1-bba1-00e08175e43e",
  lights: "d5af7892-d124-11e1-bba1-00e08175e43e",
  video: "a89d124d-7a95-4384-943e-49f5c0f46b23",
  production: "890811c3-fe3f-45d7-af6b-7ca4a807e84d",
  personnel: "b972d682-598d-4802-a390-82e28dc4480e"
};

/**
 * Optionally linking a “responsible person” if Flex requires it:
 */
const RESPONSIBLE_PERSON_IDS = {
  sound: "4b0d98e0-e700-11ea-97d0-2a0a4490a7fb",
  lights: "4b559e60-e700-11ea-97d0-2a0a4490a7fb",
  video: "bb9690ac-f22e-4bc4-94a2-6d341ca0138d",
  production: "4ce97ce3-5159-401a-9cf8-542d3e479ade",
  personnel: "4b618540-e700-11ea-97d0-2a0a4490a7fb"
};

/**
 * For generating documentNumber suffixes, if you want them in Flex:
 */
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
 * Helper: POST a single folder-creation payload to the Flex API
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
  return data; // data.elementId is the new folder's ID
}

/**
 * Creates the entire top-level folder + the sibling “Documentación Técnica” +
 * each Department folder + that department’s 3 subfolders.
 *
 * High-level structure:
 *
 *  (Top-level job folder)   [definitionId = FLEX_FOLDER_IDS.mainFolder, no parentElementId]
 *   ├─ Documentación Técnica
 *   ├─ Sound
 *   │   ├─ Documentación Técnica
 *   │   ├─ Presupuestos Recibidos
 *   │   └─ Hoja de Gastos
 *   ├─ Lights
 *   │   ├─ Documentación Técnica
 *   │   ├─ Presupuestos Recibidos
 *   │   └─ Hoja de Gastos
 *   ├─ Video
 *   │   ├─ Documentación Técnica
 *   │   ├─ Presupuestos Recibidos
 *   │   └─ Hoja de Gastos
 *   ├─ Production
 *   │   ├─ Documentación Técnica
 *   │   ├─ Presupuestos Recibidos
 *   │   └─ Hoja de Gastos
 *   └─ Personnel
 *       (no subfolders)
 */
async function createAllFoldersForJob(
  job: any,
  formattedStartDate: string,
  formattedEndDate: string,
  documentNumber: string
) {
  // 1) Create top-level folder (no parentElementId)
  const topLevelPayload = {
    definitionId: FLEX_FOLDER_IDS.mainFolder, // e.g. “Tour Folder”
    open: true,
    locked: false,
    name: job.title,
    plannedStartDate: formattedStartDate,
    plannedEndDate: formattedEndDate,
    locationId: FLEX_FOLDER_IDS.location,
    // If you want a single “responsible” person for the top folder:
    personResponsibleId: FLEX_FOLDER_IDS.mainResponsible,
    // For example doc numbers:
    documentNumber
    // parentElementId is omitted, so it becomes top-level
  };
  const topFolder = await createFlexFolder(topLevelPayload);
  const topFolderId = topFolder.elementId;

  // 2) Create a sibling “Documentación Técnica” folder under topFolder
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
  await createFlexFolder(docTecPayload); // no further subfolders

  // 3) Departments: Sound, Lights, Video, Production, Personnel
  const departments = ["sound", "lights", "video", "production", "personnel"] as const;

  for (const dept of departments) {
    // Create the department folder under topFolder
    const deptPayload = {
      definitionId: FLEX_FOLDER_IDS.subFolder,
      parentElementId: topFolderId,
      open: true,
      locked: false,
      name: dept.charAt(0).toUpperCase() + dept.slice(1), // e.g. “Sound”
      plannedStartDate: formattedStartDate,
      plannedEndDate: formattedEndDate,
      locationId: FLEX_FOLDER_IDS.location,
      departmentId: DEPARTMENT_IDS[dept],
      documentNumber: documentNumber,
      personResponsibleId:
        RESPONSIBLE_PERSON_IDS[dept as keyof typeof RESPONSIBLE_PERSON_IDS]
    };
    const deptFolder = await createFlexFolder(deptPayload);
    const deptFolderId = deptFolder.elementId;

    // “Personnel” gets no subfolders, so skip subfolders for that
    if (dept === "personnel") {
      continue;
    }

    // Otherwise create 3 subfolders: Documentación Técnica, Presupuestos Recibidos, Hoja de Gastos
    // We'll attach a suffix in documentNumber to differentiate them:
    const subfolders = [
      {
        definitionId: FLEX_FOLDER_IDS.documentacionTecnica,
        name: "Documentación Técnica",
        docNumberSuffix: "DT"
      },
      {
        definitionId: FLEX_FOLDER_IDS.presupuestosRecibidos,
        name: "Presupuestos Recibidos",
        docNumberSuffix: "PR"
      },
      {
        definitionId: FLEX_FOLDER_IDS.hojaGastos,
        name: "Hoja de Gastos",
        docNumberSuffix: "HG"
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
        // e.g. "YYMMDDS-DT" or something:
        documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}${sf.docNumberSuffix}`,
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

  // Example: Fetch tasks for sound
  const { data: soundTasks } = useQuery({
    queryKey: ["sound-tasks", job.id],
    queryFn: async () => {
      if (department !== "sound") return null;
      try {
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
      } catch (error) {
        console.error("Failed to fetch sound tasks:", error);
        throw error;
      }
    },
    enabled: department === "sound",
    retry: 3,
    retryDelay: 1000
  });

  // Example: Fetch “sound_job_personnel”
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

  // Mark job as “flex_folders_created” in your own DB
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

  /**
   * Actually creates the entire folder structure in Flex
   */
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
      // We’ll base a “documentNumber” on the job’s start date (like "YYMMDD"):
      const startDate = new Date(job.start_time);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, "");

      // Format times for Flex
      const formattedStartDate =
        new Date(job.start_time).toISOString().split(".")[0] + ".000Z";
      const formattedEndDate =
        new Date(job.end_time).toISOString().split(".")[0] + ".000Z";

      // Create the entire structure
      await createAllFoldersForJob(
        job,
        formattedStartDate,
        formattedEndDate,
        documentNumber
      );

      // Then mark job as having created folders
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

  /**
   * Example: Summaries for tasks, progress
   */
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

  /**
   * Edit job
   */
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  /**
   * Delete job from DB (and related tasks/docs).
   */
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
      console.log("Starting job deletion for:", job.id);

      // 1. Gather all department tasks, remove their documents
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

      // Remove task_documents referencing those IDs
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

      // 2. Delete department tasks
      await Promise.all([
        supabase.from("sound_job_tasks").delete().eq("job_id", job.id),
        supabase.from("lights_job_tasks").delete().eq("job_id", job.id),
        supabase.from("video_job_tasks").delete().eq("job_id", job.id)
      ]);

      // 3. Delete department personnel
      await Promise.all([
        supabase.from("sound_job_personnel").delete().eq("job_id", job.id),
        supabase.from("lights_job_personnel").delete().eq("job_id", job.id),
        supabase.from("video_job_personnel").delete().eq("job_id", job.id)
      ]);

      // 4. Delete job docs from storage
      if (job.job_documents?.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("job_documents")
          .remove(job.job_documents.map((doc: JobDocument) => doc.file_path));
        if (storageError) throw storageError;
      }

      // 5. Delete job docs from DB
      const { error: jobDocsError } = await supabase
        .from("job_documents")
        .delete()
        .eq("job_id", job.id);
      if (jobDocsError) throw jobDocsError;

      // 6. Delete job assignments
      const { error: assignmentsError } = await supabase
        .from("job_assignments")
        .delete()
        .eq("job_id", job.id);
      if (assignmentsError) throw assignmentsError;

      // 7. Delete job_departments
      const { error: departmentsError } = await supabase
        .from("job_departments")
        .delete()
        .eq("job_id", job.id);
      if (departmentsError) throw departmentsError;

      // 8. Finally, delete the job itself
      const { error: jobError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", job.id);
      if (jobError) throw jobError;

      console.log("Job deletion successful:", job.id);
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

  /**
   * Toggle collapsed/expanded in UI
   */
  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  /**
   * File upload -> Supabase storage
   */
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
          file_size: file.size
        });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded."
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  /**
   * View a file in a new tab via signed URL
   */
  const handleViewDocument = async (document: JobDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("job_documents")
        .createSignedUrl(document.file_path, 60);
      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast({
        title: "Error viewing document",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  /**
   * Delete a single document from Supabase
   */
  const handleDeleteDocument = async (document: JobDocument) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("job_documents")
        .remove([document.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("job_documents")
        .delete()
        .eq("id", document.id);
      if (dbError) throw dbError;

      setDocuments(documents.filter((doc) => doc.id !== document.id));
      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // If userRole is "logistics," restrict editing
  const canEdit = userRole !== "logistics";

  /**
   * Convert job assignments into a list of {id, name, role} to display
   */
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
    .filter((tech: any) => tech !== null && tech.name !== "");

  /**
   * Simple refresh of React Query data
   */
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
                {assignedTechnicians.map((tech) => (
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