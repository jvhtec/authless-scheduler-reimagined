import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Department } from "@/types/department";
import { JobDocument } from "@/types/job";
import { useCallback } from "react";

export const useJobManagement = (
  selectedDepartment: Department,
  startDate: Date,
  endDate: Date
) => {
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    console.log("Fetching jobs for department:", selectedDepartment);
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        location:locations(name),
        job_departments!inner(department),
        job_assignments(
          technician_id,
          sound_role,
          lights_role,
          video_role,
          profiles(
            first_name,
            last_name
          )
        ),
        job_documents(
          id,
          file_name,
          file_path,
          uploaded_at
        )
      `)
      .eq('job_departments.department', selectedDepartment)
      .eq('job_type', 'single')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;
    
    const jobsWithFilteredDocs = data.map(job => ({
      ...job,
      job_documents: job.job_documents.filter((doc: any) => {
        console.log("Checking document path:", doc.file_path, "for department:", selectedDepartment);
        return doc.file_path.startsWith(`${selectedDepartment}/`);
      })
    }));
    
    console.log("Jobs fetched with filtered documents:", jobsWithFilteredDocs);
    return jobsWithFilteredDocs;
  }, [selectedDepartment, startDate, endDate]);

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', selectedDepartment, startDate, endDate],
    queryFn: fetchJobs,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const handleDeleteDocument = async (jobId: string, document: JobDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('job_documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('job_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document: " + error.message,
        variant: "destructive",
      });
    }
  };

  return {
    jobs,
    jobsLoading,
    handleDeleteDocument
  };
};