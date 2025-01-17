import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Pencil, Trash2, MapPin, Calendar, ChevronDown, ChevronUp, Download, Eye } from "lucide-react";
import { Department } from "@/types/department";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface JobCardProps {
  job: any;
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  department?: Department;
  userRole?: string | null;
  showAssignments?: boolean;
}

export const JobCard = ({
  job,
  onEditClick,
  onDeleteClick,
  onJobClick,
  department,
  userRole,
  showAssignments = true
}: JobCardProps) => {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(true);
  const [assignments] = useState(job.job_assignments || []);

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

  const handleDownloadDocument = async (document: JobDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('job_documents')
        .download(document.file_path);

      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Downloading ${document.file_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canEdit = userRole !== 'logistics';
  const isTourJob = job.job_type === 'tour' || !!job.tour_date_id;

  // Summarize assigned technicians' names
  const assignedTechnicians = assignments
    .map((assignment: any) => {
      let role = null;
      if (department === 'sound') role = assignment.sound_role;
      else if (department === 'lights') role = assignment.lights_role;
      else if (department === 'video') role = assignment.video_role;
      else role = assignment.sound_role || assignment.lights_role || assignment.video_role;
      if (!role) return null;
      return `${assignment.profiles?.first_name || ''} ${assignment.profiles?.last_name || ''}`.trim();
    })
    .filter((name: string | null) => name && name !== '');

  return (
    <div 
      className="flex flex-col border rounded cursor-pointer hover:bg-accent/50 transition-colors group overflow-hidden"
      style={{ 
        borderColor: job.color || '#7E69AB',
        backgroundColor: `${job.color}15` || '#7E69AB15'
      }}
      onClick={() => canEdit && onJobClick(job.id)}
    >
      {/* Header Area with Always Visible Toggle Button */}
      <div 
        className={`flex justify-between items-center p-2 ${isTourJob ? 'bg-accent/20' : ''}`}
        style={{ 
          borderBottom: `1px solid ${job.color || '#7E69AB'}30`
        }}
      >
        <div className="flex items-center flex-1">
          <p className="font-medium">{job.title}</p>
          {isTourJob && (
            <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full ml-2">
              {job.tour_date_id ? 'Tour Date' : 'Tour'}
            </span>
          )}
        </div>
        {/* Toggle Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleCollapse}
          className="ml-2"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        {canEdit && !collapsed && (
          <div 
            className="flex gap-1 ml-2"
            onClick={e => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" onClick={handleEditClick}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Always Visible Summary */}
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(job.start_time), 'MMM d, yyyy')}
            {job.start_time !== job.end_time && 
              ` - ${format(new Date(job.end_time), 'MMM d, yyyy')}`
            }
          </span>
        </div>
        
        {job.location?.name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.location.name}</span>
          </div>
        )}

        {showAssignments && assignedTechnicians.length > 0 && (
          <div className="flex flex-col text-sm text-muted-foreground">
            <div>Assigned Personnel:</div>
            <div>{assignedTechnicians.join(', ')}</div>
          </div>
        )}
      </div>

      {/* Documents Section */}
      {!collapsed && job.job_documents && job.job_documents.length > 0 && (
        <div className="p-2 border-t">
          <h3 className="text-sm font-medium mb-2">Documents</h3>
          <div className="space-y-2">
            {job.job_documents.map((doc: JobDocument) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-2 rounded bg-accent/10"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-sm truncate flex-1">{doc.file_name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDocument(doc)}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownloadDocument(doc)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};