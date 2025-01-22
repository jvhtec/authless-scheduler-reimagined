import { format, isAfter, isBefore, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: { first_name: string; last_name: string } | null;
  definition: {
    category: string;
    department: string | null;
  } | null;
}

interface MilestoneGanttChartProps {
  milestones: Milestone[];
  startDate: Date;
}

export function MilestoneGanttChart({ milestones, startDate }: MilestoneGanttChartProps) {
  // Calculate the date range for the chart
  const endDate = addDays(startDate, 30); // Show 30 days from start date
  const totalDays = 30;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'planning': return 'bg-blue-500';
      case 'technical': return 'bg-purple-500';
      case 'logistics': return 'bg-orange-500';
      case 'administrative': return 'bg-gray-500';
      case 'production': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const getDepartmentBadgeColor = (department: string | null) => {
    switch (department) {
      case 'sound': return 'bg-blue-100 text-blue-800';
      case 'lights': return 'bg-yellow-100 text-yellow-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Timeline header */}
      <div className="flex border-b">
        <div className="w-1/3" />
        <div className="w-2/3 flex">
          {Array.from({ length: totalDays }).map((_, index) => {
            const date = addDays(startDate, index);
            return (
              <div 
                key={index} 
                className="flex-1 text-center text-xs p-2 border-l"
              >
                {format(date, 'd')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        {milestones.map((milestone) => {
          const dueDate = new Date(milestone.due_date);
          const dayOffset = Math.floor(
            (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return (
            <div key={milestone.id} className="flex items-center">
              <div className="w-1/3 pr-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="space-y-1">
                        <div className="font-medium truncate">{milestone.name}</div>
                        {milestone.definition?.department && (
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              getDepartmentBadgeColor(milestone.definition.department)
                            )}
                          >
                            {milestone.definition.department}
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-2">
                        <div>{milestone.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {format(dueDate, 'MMM d, yyyy')}
                        </div>
                        {milestone.completed && milestone.completed_by && (
                          <div className="text-xs text-muted-foreground">
                            Completed by: {milestone.completed_by.first_name} {milestone.completed_by.last_name}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="w-2/3 flex relative h-8">
                {dayOffset >= 0 && dayOffset < totalDays && (
                  <div 
                    className={cn(
                      "absolute h-6 w-6 rounded-full top-1",
                      getCategoryColor(milestone.definition?.category || ''),
                      milestone.completed ? "opacity-50" : "opacity-100",
                      "border-2 border-white"
                    )}
                    style={{ left: `calc(${(dayOffset / totalDays) * 100}% - 12px)` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}