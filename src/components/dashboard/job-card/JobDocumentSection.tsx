import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export interface JobDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

interface JobDocumentSectionProps {
  jobId: string;
  department?: string;
  documents: JobDocument[];
  showUpload?: boolean;
  jobType: string;
}

export function JobDocumentSection({
  jobId,
  department,
  documents,
  showUpload = false,
  jobType
}: JobDocumentSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file || !department) return;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${department}/${jobId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("job_documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("job_documents")
        .insert({
          job_id: jobId,
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
      console.log("Attempting to view document:", doc);
      const { data, error } = await supabase.storage
        .from("job_documents")
        .createSignedUrl(doc.file_path, 60);

      if (error) {
        console.error("Error creating signed URL:", error);
        throw error;
      }

      console.log("Signed URL created:", data.signedUrl);
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      console.error("Error in handleViewDocument:", err);
      toast({
        title: "Error viewing document",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (doc: JobDocument) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      console.log("Starting document deletion:", doc);
      const { error: storageError } = await supabase.storage
        .from("job_documents")
        .remove([doc.file_path]);
      
      if (storageError) {
        console.error("Storage deletion error:", storageError);
        throw storageError;
      }

      const { error: dbError } = await supabase
        .from("job_documents")
        .delete()
        .eq("id", doc.id);
      
      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted."
      });
    } catch (err: any) {
      console.error("Error in handleDeleteDocument:", err);
      toast({
        title: "Error deleting document",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  if (jobType === "dryhire") return null;

  return (
    <>
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
      {showUpload && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <input
            type="file"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button variant="ghost" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}