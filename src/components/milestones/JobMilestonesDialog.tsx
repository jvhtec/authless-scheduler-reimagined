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
  // Fetch milestone definitions
  const { data: definitions } = useQuery({
    queryKey: ["milestone-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestone_definitions")
        .select("*")
        .order("default_offset");

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing job milestones
  const { data: milestones, isLoading } = useQuery({
    queryKey: ["job-milestones", jobId],
    queryFn: async () => {
      console.log("Fetching milestones for job:", jobId);
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
      console.log("Fetched milestones:", data);
      return data;
    },
  });

  // If no milestones exist and we have definitions, create them
  const { data: dateTypes } = useQuery({
    queryKey: ["job-date-types", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_date_types")
        .select("*")
        .eq("job_id", jobId)
        .eq("type", "show")
        .order("date")
        .limit(1);

      if (error) throw error;
      return data;
    },
    enabled: !milestones?.length && !!definitions?.length,
  });

  // Create initial milestones if none exist
  const createInitialMilestones = async () => {
    if (!definitions || !dateTypes?.[0]) return;

    const showDate = new Date(dateTypes[0].date);
    const milestonesToCreate = definitions.map((def) => ({
      job_id: jobId,
      definition_id: def.id,
      name: def.name,
      offset_days: def.default_offset,
      due_date: addDays(showDate, def.default_offset),
    }));

    console.log("Creating initial milestones:", milestonesToCreate);

    const { error } = await supabase
      .from("job_milestones")
      .insert(milestonesToCreate);

    if (error) {
      console.error("Error creating milestones:", error);
    }
  };

  // Create initial milestones if needed
  React.useEffect(() => {
    if (definitions?.length && !milestones?.length && dateTypes?.length) {
      createInitialMilestones();
    }
  }, [definitions, milestones, dateTypes]);

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