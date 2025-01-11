import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Department } from "@/types/department";
import { useState } from "react";

interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface JobCardNewProps {
  job: any;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onJobClick: () => void;
  department?: Department;
  userRole?: string | null;
  showAssignments?: boolean;
}

export const JobCardNew = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  userRole,
  showAssignments = true
}: JobCardNewProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<JobDocument[]>(job.job_documents || []);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      console.log('Starting file upload for job:', job.id);
      
      const filePath = `${department}/${job.id}/${crypto.randomUUID()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('job_documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { error: dbError } = await supabase
        .from('job_documents')
        .insert({
          job_id: job.id,
          file_name: file.name,
          file_path: filePath,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      // Refresh documents list
      const { data: newDocuments } = await supabase
        .from('job_documents')
        .select('*')
        .eq('job_id', job.id);

      setDocuments(newDocuments || []);

      toast({
        title: "File uploaded successfully",
        description: "Your document has been uploaded.",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: JobDocument) => {
    try {
      console.log('Starting download for document:', document.file_name);
      
      const { data, error } = await supabase.storage
        .from('job_documents')
        .download(document.file_path);

      if (error) {
        console.error('Download error:', error);
        throw error;
      }

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your file download has started.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (document: JobDocument) => {
    try {
      console.log('Deleting document:', document.file_name);
      
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

      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const assignedTechnicians = job.job_assignments
    ?.map((assignment: any) => {
      const role = assignment[`${department}_role` as keyof typeof assignment];
      if (role) {
        return `${assignment.profiles.first_name} ${assignment.profiles.last_name} (${role})`;
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div 
      className="relative bg-card rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onJobClick(job.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium">{job.title}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(job.start_time), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        {job.location && (
          <Badge variant="outline" className="ml-2">
            {job.location.name}
          </Badge>
        )}
      </div>

      {job.description && (
        <p className="text-sm text-muted-foreground mb-2">{job.description}</p>
      )}

      {showAssignments && assignedTechnicians.length > 0 && (
        <div className="flex flex-col text-sm text-muted-foreground">
          <div>Assigned Personnel:</div>
          <div>{assignedTechnicians.join(', ')}</div>
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm font-medium mb-2">Documents</div>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-2 rounded-md bg-accent/20"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm truncate max-w-[200px]">{doc.file_name}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4" />
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

      <div className="absolute top-4 right-4 flex gap-2">
        {(userRole === 'admin' || userRole === 'management') && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick();
              }}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <div className="relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  e.stopPropagation();
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading}
              />
              <Button 
                variant="ghost" 
                size="icon"
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};