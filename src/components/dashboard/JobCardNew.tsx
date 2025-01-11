import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, Users, Edit, Trash2, Upload, RefreshCw, ChevronDown, ChevronUp, Eye, FolderPlus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocuments } from "./JobDocuments";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// Flex API constants - Remove port specification from URL
const BASE_URL = "https://sectorpro.flexrentalsolutions.com/f5/api/element";
const API_KEY = "82b5m0OKgethSzL1YbrWMUFvxdNkNMjRf82E";

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
  showUpload = false
}: JobCardNewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(true);
  const [assignments, setAssignments] = useState(job.job_assignments || []);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);

  const { data: soundTasks } = useQuery({
    queryKey: ['sound-tasks', job.id],
    queryFn: async () => {
      if (department !== 'sound') return null;

      const { data, error } = await supabase
        .from('sound_job_tasks')
        .select(`
          *,
          assigned_to (
            first_name,
            last_name
          ),
          task_documents(*)
        `)
        .eq('job_id', job.id);

      if (error) throw error;
      return data;
    },
    enabled: department === 'sound'
  });

  const { data: personnel } = useQuery({
    queryKey: ['sound-personnel', job.id],
    queryFn: async () => {
      if (department !== 'sound') return null;

      const { data: existingData, error: fetchError } = await supabase
        .from('sound_job_personnel')
        .select('*')
        .eq('job_id', job.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!existingData) {
        const { data: newData, error: insertError } = await supabase
          .from('sound_job_personnel')
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
    enabled: department === 'sound'
  });

  const updateFolderStatus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('jobs')
        .update({ flex_folders_created: true })
        .eq('id', job.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  // Flex Folder and Department constants
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
      const startDate = new Date(job.start_time);
      const documentNumber = startDate.toISOString().slice(2, 10).replace(/-/g, '');
      
      const formattedStartDate = new Date(job.start_time).toISOString().split('.')[0] + '.000Z';
      const formattedEndDate = new Date(job.end_time).toISOString().split('.')[0] + '.000Z';

      console.log('Creating folders with dates:', { formattedStartDate, formattedEndDate });

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

      console.log('Creating main folder with payload:', mainFolderPayload);

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
        console.error('Flex API error:', errorData);
        throw new Error(errorData.exceptionMessage || 'Failed to create main folder');
      }

      const mainFolder = await mainResponse.json();
      console.log('Main folder created:', mainFolder);

      // Create subfolders for each department
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
        }
      }

      await updateFolderStatus.mutateAsync();

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

  const calculateTotalProgress = () => {
    if (!soundTasks?.length) return 0;
    const totalProgress = soundTasks.reduce((acc, task) => acc + (task.progress || 0), 0);
    return Math.round(totalProgress / soundTasks.length);
  };

  const getCompletedTasks = () => {
    if (!soundTasks?.length) return 0;
    return soundTasks.filter(task => task.status === 'completed').length;
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !department) return;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${department}/${job.id}/${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('job_documents')
        .insert({
          job_id: job.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['jobs'] });

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

  const handleViewDocument = async (document: JobDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('job_documents')
        .createSignedUrl(document.file_path, 60);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "Error viewing document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (document: JobDocument) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('job_documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('job_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      setDocuments(documents.filter(doc => doc.id !== document.id));
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canEdit = userRole !== 'logistics';

  const assignedTechnicians = assignments.map((assignment: any) => {
    let role = null;

    switch (department) {
      case 'sound':
        role = assignment.sound_role;
        break;
      case 'lights':
        role = assignment.lights_role;
        break;
      case 'video':
        role = assignment.video_role;
        break;
      default:
        role = assignment.sound_role || assignment.lights_role || assignment.video_role;
    }

    if (!role) return null;

    return {
      id: assignment.technician_id,
      name: `${assignment.profiles?.first_name || ''} ${assignment.profiles?.last_name || ''}`.trim(),
      role: role
    };
  }).filter((tech: any) => tech !== null && tech.name !== '');

  const refreshData = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    await queryClient.invalidateQueries({ queryKey: ['sound-tasks', job.id] });
    await queryClient.invalidateQueries({ queryKey: ['sound-personnel', job.id] });
    
    toast({
      title: "Data refreshed",
      description: "The job information has been updated.",
    });
  };

  return (
    <Card 
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => userRole !== 'logistics' && onJobClick(job.id)}
      style={{ 
        borderColor: `${job.color}30` || '#7E69AB30',
        backgroundColor: `${job.color}05` || '#7E69AB05'
      }}
    >
      <CardHeader className="pb-2 flex justify-between items-center">
        <div className="flex items-center flex-grow">
          <div className="font-medium">
            {job.title}
            {job.job_type === 'tour' && (
              <Badge variant="secondary" className="ml-2">Tour</Badge>
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
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={refreshData} 
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
<<<<<<< HEAD
         <Button
  variant="ghost"
  size="icon"
  onClick={createFlexFolders}
  disabled={job.flex_folders_created}
  title={job.flex_folders_created ? "Folders already created" : "Create Flex folders"}
>
  <img
    src="/public/icon.png"
    alt="Create Flex folders"
    className="h-4 w-4"
  />
</Button>
=======
          <Button
            variant="ghost"
            size="icon"
            onClick={createFlexFolders}
            disabled={job.flex_folders_created}
            title={job.flex_folders_created ? "Folders already created" : "Create Flex folders"}
          >
            <img
              src="/src/assets/icons/icon.png"
              alt="Create Flex folders"
              className="h-4 w-4"
            />
          </Button>
>>>>>>> 20041e13fd8e4f7109c29f033a8f5e8929b846d0
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" onClick={handleEditClick}>
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
                onClick={(e) => e.stopPropagation()}
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
            {format(new Date(job.start_time), 'HH:mm')}
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
                  <Badge 
                    key={tech.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tech.name} {tech.role && `(${tech.role})`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {/* Documents Section */}
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
                        Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
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

        {/* Only show additional details when expanded */}
        {!collapsed && (
          <>
            {department === 'sound' && personnel && (
              <div className="mt-2 p-2 bg-accent/20 rounded-md">
                <div className="text-xs font-medium mb-1">Required Personnel: {getTotalPersonnel()}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>FOH Engineers: {personnel.foh_engineers || 0}</div>
                  <div>MON Engineers: {personnel.mon_engineers || 0}</div>
                  <div>PA Techs: {personnel.pa_techs || 0}</div>
                  <div>RF Techs: {personnel.rf_techs || 0}</div>
                </div>
              </div>
            )}
            {department === 'sound' && soundTasks?.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Task Progress ({getCompletedTasks()}/{soundTasks.length} completed)</span>
                  <span>{calculateTotalProgress()}%</span>
                </div>
                <Progress 
                  value={calculateTotalProgress()} 
                  className="h-1"
                />
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
                        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                          {task.status === 'not_started' ? 'Not Started' : 
                           task.status === 'in_progress' ? 'In Progress' : 
                           'Completed'}
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
