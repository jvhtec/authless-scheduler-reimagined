import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, addDays } from "date-fns";
import { Settings } from "lucide-react";
import { MilestoneGanttChart } from "./MilestoneGanttChart";

interface JobMilestonesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobStartDate: Date;
}

export function JobMilestonesDialog({
  open,
  onOpenChange,
  jobId,
  jobStartDate,
}: JobMilestonesDialogProps) {
  const { data: milestones, isLoading } = useQuery({
    queryKey: ["job-milestones", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_milestones")
        .select(`
          *,
          definition:milestone_definitions(
            name,
            category,
            department
          ),
          completed_by:profiles(
            first_name,
            last_name
          )
        `)
        .eq("job_id", jobId)
        .order("due_date");

      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Job Milestones</DialogTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Manage Milestones
            </Button>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            Loading milestones...
          </div>
        ) : (
          <MilestoneGanttChart 
            milestones={milestones || []} 
            startDate={jobStartDate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}