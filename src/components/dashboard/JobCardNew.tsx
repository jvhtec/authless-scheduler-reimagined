import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, MapPin, Users, Edit, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { Department } from "@/types/department";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { JobDocuments } from "./JobDocuments";

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
}

export const JobCardNew = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  userRole,
  onDeleteDocument
}: JobCardNewProps) => {
  const { toast } = useToast();

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick(job);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClick(job.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !department) return;

    try {
      console.log('Starting file upload for job:', job.id);
      
      // Generate a unique file path that includes the department
      const fileExt = file.name.split('.').pop();
      const filePath = `${department}/${job.id}/${crypto.randomUUID()}.${fileExt}`;

      console.log('Generated file path:', filePath);

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job_documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Create document record in the database
      const { error: dbError } = await supabase
        .from('job_documents')
        .insert({
          job_id: job.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded.",
      });

    } catch (error: any) {
      console.error('Error in upload process:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canEdit = userRole !== 'logistics';

  // Get assigned technicians from profiles table through job_assignments
  const assignedTechnicians = job.job_assignments?.map((assignment: any) => {
    let role = null;
    
    // Filter based on department
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
        // If no department specified, show any role
        role = assignment.sound_role || assignment.lights_role || assignment.video_role;
    }

    if (!role) return null;

    return {
      id: assignment.technician_id,
      name: `${assignment.profiles?.first_name || ''} ${assignment.profiles?.last_name || ''}`.trim(),
      role: role
    };
  }).filter((tech: any) => tech !== null && tech.name !== '') || [];

  return (
    <Card 
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => canEdit && onJobClick(job.id)}
      style={{ 
        borderColor: `${job.color}30` || '#7E69AB30',
        backgroundColor: `${job.color}05` || '#7E69AB05'
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="font-medium">
            {job.title}
            {job.job_type === 'tour' && (
              <Badge variant="secondary" className="ml-2">Tour</Badge>
            )}
          </div>
          <div className="flex gap-2">
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
          </div>
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
          {job.job_documents && onDeleteDocument && (
            <JobDocuments
              jobId={job.id}
              documents={job.job_documents}
              department={department}
              onDeleteDocument={onDeleteDocument}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};