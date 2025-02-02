import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import { useFolderManagement } from "@/hooks/useFolderManagement";
import { Job } from "@/types/job";

interface JobFolderSectionProps {
  job: Job;
  canEdit: boolean;
}

export const JobFolderSection = ({ job, canEdit }: JobFolderSectionProps) => {
  const { createAllFoldersForJob } = useFolderManagement();

  const handleCreateFolders = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createAllFoldersForJob(job);
  };

  if (!canEdit) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-2"
      onClick={handleCreateFolders}
      disabled={job.flex_folders_created}
    >
      <FolderPlus className="h-4 w-4 mr-2" />
      Create Flex Folders
    </Button>
  );
};