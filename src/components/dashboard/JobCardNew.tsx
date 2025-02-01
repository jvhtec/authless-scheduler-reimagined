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

// ----------------------
// Constants used in Flex folder creation
// ----------------------
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
// Function: createFlexFolder
// ----------------------------------------------------------------
async function createFlexFolder(payload: Record<string, any>) {
  console.log("Creating Flex folder with payload:", payload);
  const response = await fetch("https://sectorpro.flexrentalsolutions.com/f5/api/element", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E"
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
  return data;
}

// ----------------------------------------------------------------
// Function: createAllFoldersForJob
// ----------------------------------------------------------------
async function createAllFoldersForJob(
  job: any,
  formattedStartDate: string,
  formattedEndDate: string,
  documentNumber: string
) {
  // Handle dryhire job type first
  if (job.job_type === "dryhire") {
    console.log("Dryhire job type detected. Creating dryhire folder...");
    const department = job.job_departments[0]?.department;
    if (!department || !["sound", "lights"].includes(department)) {
      throw new Error("Invalid department for dryhire job");
    }
    const startDate = new Date(job.start_time);
    const monthKey = startDate.toISOString().slice(5, 7); // "MM"
    const parentFolderId = DRYHIRE_PARENT_IDS[department][monthKey];
    if (!parentFolderId) {
      throw new Error(`No parent folder found for month ${monthKey}`);
    }
    const dryHireFolderPayload = {
      definitionId: FLEX_FOLDER_IDS.subFolder,
      parentElementId: parentFolderId,
      open: true,
      locked: false,
      name: `Dry Hire - ${job.title}`,
      plannedStartDate: formattedStartDate,
      plannedEndDate: formattedEndDate,
      locationId: FLEX_FOLDER_IDS.location,
      departmentId: DEPARTMENT_IDS[department],
      documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[department]}`,
      personResponsibleId: RESPONSIBLE_PERSON_IDS[department],
    };
    console.log("Creating dryhire folder with payload:", dryHireFolderPayload);
    const dryHireFolder = await createFlexFolder(dryHireFolderPayload);
    await supabase
      .from("flex_folders")
      .insert({
        job_id: job.id,
        parent_id: parentFolderId,
        element_id: dryHireFolder.elementId,
        department: department,
        folder_type: "dryhire",
      });
    return;
  }

  // Handle tourdate job type
  if (job.job_type === "tourdate") {
    console.log("Tourdate job type detected. Validating tour data...");
    if (!job.tour_id) {
      throw new Error("Tour ID is missing for tourdate job");
    }
    const { data: tourData, error: tourError } = await supabase
      .from("tours")
      .select(`
        id,
        name,
        flex_main_folder_id,
        flex_sound_folder_id,
        flex_lights_folder_id,
        flex_video_folder_id,
        flex_production_folder_id,
        flex_personnel_folder_id
      `)
      .eq("id", job.tour_id)
      .single();
    if (tourError || !tourData) {
      console.error("Error fetching tour data:", tourError);
      throw new Error(`Tour not found for tour_id: ${job.tour_id}`);
    }
    if (!tourData.flex_main_folder_id) {
      throw new Error("Tour folders have not been created yet. Please create tour folders first.");
    }
    console.log("Using tour folders:", tourData);
    const departments = ["sound", "lights", "video", "production", "personnel"];
    const locationName = job.location?.name || "No Location";
    const formattedDate = format(new Date(job.start_time), "MMM d, yyyy");
    for (const dept of departments) {
      const parentFolderId = tourData[`flex_${dept}_folder_id`];
      if (!parentFolderId) {
        console.warn(`No parent folder ID found for ${dept} department`);
        continue;
      }
      const { data: [parentRow], error: parentErr } = await supabase
        .from("flex_folders")
        .select("*")
        .eq("element_id", parentFolderId)
        .limit(1);
      if (parentErr) {
        console.error("Error fetching parent row:", parentErr);
        continue;
      }
      if (!parentRow) {
        console.warn(`No local DB row found for parent element_id=${parentFolderId}`);
        continue;
      }
      const tourDateFolderPayload = {
        definitionId: FLEX_FOLDER_IDS.subFolder,
        parentElementId: parentFolderId,
        open: true,
        locked: false,
        name: `${locationName} - ${formattedDate} - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
        plannedStartDate: formattedStartDate,
        plannedEndDate: formattedEndDate,
        locationId: FLEX_FOLDER_IDS.location,
        departmentId: DEPARTMENT_IDS[dept],
        documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}`,
        personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
      };
      console.log(`Creating tour date folder for ${dept}:`, tourDateFolderPayload);
      const tourDateFolder = await createFlexFolder(tourDateFolderPayload);
      const { data: [childRow], error: childErr } = await supabase
        .from("flex_folders")
        .insert({
          job_id: job.id,
          parent_id: parentRow.id,
          element_id: tourDateFolder.elementId,
          department: dept,
          folder_type: "tourdate",
        })
        .select("*");
      if (childErr) {
        console.error("Error inserting child folder row:", childErr);
        continue;
      }
      if (dept !== "personnel") {
        const subfolders = [
          {
            definitionId: FLEX_FOLDER_IDS.documentacionTecnica,
            name: `Documentación Técnica - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
            suffix: "DT",
          },
          {
            definitionId: FLEX_FOLDER_IDS.presupuestosRecibidos,
            name: `Presupuestos Recibidos - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
            suffix: "PR",
          },
          {
            definitionId: FLEX_FOLDER_IDS.hojaGastos,
            name: `Hoja de Gastos - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
            suffix: "HG",
          },
        ];
        for (const sf of subfolders) {
          const subPayload = {
            definitionId: sf.definitionId,
            parentElementId: childRow.element_id,
            open: true,
            locked: false,
            name: sf.name,
            plannedStartDate: formattedStartDate,
            plannedEndDate: formattedEndDate,
            locationId: FLEX_FOLDER_IDS.location,
            departmentId: DEPARTMENT_IDS[dept],
            documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}${sf.suffix}`,
            personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
          };
          await createFlexFolder(subPayload);
        }
      }
      if (dept === "sound") {
        const pullSheetPayload = {
          definitionId: FLEX_FOLDER_IDS.pullSheet,
          parentElementId: tourDateFolder.elementId,
          open: true,
          locked: false,
          name: `Pull Sheet - ${locationName}`,
          plannedStartDate: formattedStartDate,
          plannedEndDate: formattedEndDate,
          locationId: FLEX_FOLDER_IDS.location,
          departmentId: DEPARTMENT_IDS[dept],
          documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}PS`,
          personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
        };
        const pullSheetFolder = await createFlexFolder(pullSheetPayload);
        await supabase.from("flex_folders").insert({
          job_id: job.id,
          parent_id: childRow.id,
          element_id: pullSheetFolder.elementId,
          department: dept,
          folder_type: "pull_sheet",
        });
      }
      if (dept === "personnel") {
        const personnelSubfolders = [
          { name: `Crew Call Sonido - ${job.title}`, suffix: "CCS" },
          { name: `Crew Call Luces - ${job.title}`, suffix: "CCL" },
          { name: `Gastos de Personal - ${job.title}`, suffix: "GP" },
        ];
        for (const sf of personnelSubfolders) {
          const subPayload = {
            definitionId: FLEX_FOLDER_IDS.subFolder,
            parentElementId: childRow.element_id,
            open: true,
            locked: false,
            name: sf.name,
            plannedStartDate: formattedStartDate,
            plannedEndDate: formattedEndDate,
            locationId: FLEX_FOLDER_IDS.location,
            documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}${sf.suffix}`,
            departmentId: DEPARTMENT_IDS[dept],
            personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
          };
          await createFlexFolder(subPayload);
        }
      }
    }
    return;
  }

  // Default Logic: Full Folder Structure for non-dryhire/non-tourdate jobs
  console.log("Default job type detected. Creating full folder structure.");
  const topPayload = {
    definitionId: FLEX_FOLDER_IDS.mainFolder,
    open: true,
    locked: false,
    name: job.title,
    plannedStartDate: formattedStartDate,
    plannedEndDate: formattedEndDate,
    locationId: FLEX_FOLDER_IDS.location,
    personResponsibleId: FLEX_FOLDER_IDS.mainResponsible,
    documentNumber,
  };
  const topFolder = await createFlexFolder(topPayload);
  const topFolderId = topFolder.elementId;
  await supabase
    .from("flex_folders")
    .insert({
      job_id: job.id,
      element_id: topFolderId,
      folder_type: "main_event",
    });
  const departments = ["sound", "lights", "video", "production", "personnel"];
  for (const dept of departments) {
    const deptPayload = {
      definitionId: FLEX_FOLDER_IDS.subFolder,
      parentElementId: topFolderId,
      open: true,
      locked: false,
      name: `${job.title} - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
      plannedStartDate: formattedStartDate,
      plannedEndDate: formattedEndDate,
      locationId: FLEX_FOLDER_IDS.location,
      departmentId: DEPARTMENT_IDS[dept],
      documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}`,
      personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
    };
    const deptFolder = await createFlexFolder(deptPayload);
    const deptFolderId = deptFolder.elementId;
    await supabase
      .from("flex_folders")
      .insert({
        job_id: job.id,
        parent_id: topFolderId,
        element_id: deptFolderId,
        department: dept,
        folder_type: "department",
      });
    if (dept !== "personnel") {
      const subfolders = [
        {
          definitionId: FLEX_FOLDER_IDS.documentacionTecnica,
          name: `Documentación Técnica - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
          suffix: "DT",
        },
        {
          definitionId: FLEX_FOLDER_IDS.presupuestosRecibidos,
          name: `Presupuestos Recibidos - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
          suffix: "PR",
        },
        {
          definitionId: FLEX_FOLDER_IDS.hojaGastos,
          name: `Hoja de Gastos - ${dept.charAt(0).toUpperCase() + dept.slice(1)}`,
          suffix: "HG",
        },
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
          documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}${sf.suffix}`,
          personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
        };
        await createFlexFolder(subPayload);
      }
    }
    if (dept === "personnel") {
      const personnelSubfolders = [
        { name: `Crew Call Sonido - ${job.title}`, suffix: "CCS" },
        { name: `Crew Call Luces - ${job.title}`, suffix: "CCL" },
        { name: `Gastos de Personal - ${job.title}`, suffix: "GP" },
      ];
      for (const sf of personnelSubfolders) {
        const subPayload = {
          definitionId: FLEX_FOLDER_IDS.subFolder,
          parentElementId: deptFolderId,
          open: true,
          locked: false,
          name: sf.name,
          plannedStartDate: formattedStartDate,
          plannedEndDate: formattedEndDate,
          locationId: FLEX_FOLDER_IDS.location,
          documentNumber: `${documentNumber}${DEPARTMENT_SUFFIXES[dept]}${sf.suffix}`,
          departmentId: DEPARTMENT_IDS[dept],
          personResponsibleId: RESPONSIBLE_PERSON_IDS[dept],
        };
        await createFlexFolder(subPayload);
      }
    }
  }

  // ----------------------
  // JobCardNew Component
  // ----------------------
  const [collapsed, setCollapsed] = useState(true);
  const [assignments, setAssignments] = useState(job.job_assignments || []);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);
  const [artistManagementOpen, setArtistManagementOpen] = useState(false);

  // Tasks queries (custom hooks)
  function useSoundTasks(jobId: string, department: string) {
    return useQuery({
      queryKey: ["sound-tasks", jobId],
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
          .eq("job_id", jobId);
        if (error) throw error;
        return data;
      },
      enabled: department === "sound",
      retry: 3,
      retryDelay: 1000
    });
  }

  function useLightsTasks(jobId: string, department: string) {
    return useQuery({
      queryKey: ["lights-tasks", jobId],
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
          .eq("job_id", jobId);
        if (error) throw error;
        return data;
      },
      enabled: department === "lights",
      retry: 3,
      retryDelay: 1000
    });
  }

  function useVideoTasks(jobId: string, department: string) {
    return useQuery({
      queryKey: ["video-tasks", jobId],
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
          .eq("job_id", jobId);
        if (error) throw error;
        return data;
      },
      enabled: department === "video",
      retry: 3,
      retryDelay: 1000
    });
  }

  const { data: soundTasks } = useSoundTasks(job.id, department);
  const { data: lightsTasks } = useLightsTasks(job.id, department);
  const { data: videoTasks } = useVideoTasks(job.id, department);

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
      setDocuments(documents.filter((d) => d.id !== doc.id));
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
        name: `${assignment.profiles?.first_name || ""} ${assignment.profiles?.last_name || ""}`.trim(),
        role
      };
    })
    .filter(Boolean);

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
            <Button
              variant="ghost"
              size="icon"
              onClick={createFlexFolders}
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

export default JobCardNew;
