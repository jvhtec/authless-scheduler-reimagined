import { format, isAfter, isBefore, addDays, differenceInDays, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Department } from "@/types/department";
import { useEffect, useRef, useState } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const lastMilestoneDate = milestones.reduce((latest, milestone) => {
    const date = new Date(milestone.due_date);
    return date > latest ? date : latest;
  }, startDate);

  const endDate = addDays(lastMilestoneDate, 14);
  const totalDays = differenceInDays(endDate, startDate);
  const totalWidth = Math.max(1200, (totalDays + 1) * 96);

  const departments: Department[] = ["sound", "lights", "video", "production", "logistics", "administrative"];

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
      case 'production': return 'bg-green-100 text-green-800';
      case 'logistics': return 'bg-orange-100 text-orange-800';
      case 'administrative': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMilestonesByDepartment = (department: Department) => {
    return milestones.filter(milestone => 
      milestone.definition?.department === department || milestone.definition?.department === null
    );
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('job_milestones')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', milestoneId);

      if (error) throw error;

      toast({
        title: "Milestone completed",
        description: "The milestone has been marked as completed.",
      });
    } catch (error) {
      console.error('Error completing milestone:', error);
      toast({
        title: "Error",
        description: "Failed to complete the milestone. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getShowDays = () => {
    return milestones.reduce((days: Date[], milestone) => {
      const date = new Date(milestone.due_date);
      if (milestone.definition?.category === 'production') {
        days.push(date);
      }
      return days;
    }, []);
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const today = new Date();
      const daysFromStart = differenceInDays(today, startDate);
      const scrollPosition = daysFromStart * 96;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition - 300);
    }
  }, [startDate]);

  const showDays = getShowDays();

  return (
    <ScrollArea className="w-full border rounded-lg" ref={scrollContainerRef}>
      <div style={{ width: `${totalWidth}px`, minWidth: '100%' }} className="relative">
        <div className="flex border-b sticky top-0 bg-background z-20">
          <div className="w-48 shrink-0 p-2 font-medium border-r sticky left-0 bg-background z-30">Department</div>
          <div className="flex-1 flex">
            {Array.from({ length: totalDays + 1 }).map((_, index) => {
              const date = addDays(startDate, index);
              return (
                <div 
                  key={index} 
                  className="w-24 shrink-0 text-center text-xs p-2 border-r last:border-r-0"
                >
                  <div className="font-medium">{format(date, 'd')}</div>
                  <div className="text-muted-foreground">{format(date, 'MMM')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current date marker */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10"
          style={{ 
            left: `${(differenceInDays(new Date(), startDate) * 96) + 192}px`,
            height: `${departments.length * 100 + 40}px`
          }}
        />

        {/* Show day markers */}
        {showDays.map((showDate, index) => (
          <div 
            key={index}
            className="absolute top-0 bottom-0 w-[2px] bg-green-500 opacity-50 z-5"
            style={{ 
              left: `${(differenceInDays(showDate, startDate) * 96) + 192}px`,
              height: `${departments.length * 100 + 40}px`
            }}
          />
        ))}

        <div>
          {departments.map((department) => {
            const departmentMilestones = getMilestonesByDepartment(department);

            return (
              <div key={department} className="border-b last:border-b-0">
                <div className="flex">
                  <div className="w-48 shrink-0 p-4 border-r sticky left-0 bg-background z-10">
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs capitalize",
                        getDepartmentBadgeColor(department)
                      )}
                    >
                      {department}
                    </Badge>
                  </div>
                  <div className="flex-1 relative min-h-[100px]">
                    {departmentMilestones.map((milestone) => {
                      const dueDate = new Date(milestone.due_date);
                      const dayOffset = differenceInDays(dueDate, startDate);
                      const position = (dayOffset * 96) + 48;

                      return (
                        <ContextMenu key={milestone.id}>
                          <ContextMenuTrigger>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2",
                                      "h-6 w-6 rounded-full",
                                      getCategoryColor(milestone.definition?.category || ''),
                                      "border-2 border-white cursor-pointer transition-all hover:scale-110",
                                      "flex items-center justify-center",
                                      milestone.completed ? "opacity-50" : "opacity-100"
                                    )}
                                    style={{ left: `${position}px` }}
                                  >
                                    {milestone.completed && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-2">
                                    <div className="font-medium">{milestone.name}</div>
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
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => handleCompleteMilestone(milestone.id)}
                              disabled={milestone.completed}
                            >
                              Mark as Complete
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}