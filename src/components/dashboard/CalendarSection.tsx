import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, Users, Music2, Lightbulb, Video, Plane, Wrench, Star, Moon, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { DateTypeContextMenu } from "./DateTypeContextMenu";
import { JobMilestonesDialog } from "@/components/milestones/JobMilestonesDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CalendarSectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  jobs?: any[];
  department?: string;
}

export const CalendarSection = ({ date = new Date(), onDateSelect, jobs = [], department }: CalendarSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateTypes, setDateTypes] = useState<Record<string, any>>({});
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // Calendar configuration
  const currentMonth = date || new Date();
  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startDay = firstDayOfMonth.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;
  
  const prefixDays = Array.from({ length: paddingDays }).map((_, i) => {
    const day = new Date(firstDayOfMonth);
    day.setDate(day.getDate() - (paddingDays - i));
    return day;
  });

  const totalDaysNeeded = 42;
  const suffixDays = Array.from({ length: totalDaysNeeded - (prefixDays.length + daysInMonth.length) }).map((_, i) => {
    const day = new Date(lastDayOfMonth);
    day.setDate(day.getDate() + (i + 1));
    return day;
  });

  const allDays = [...prefixDays, ...daysInMonth, ...suffixDays];

  useEffect(() => {
    const fetchDateTypes = async () => {
      if (!jobs?.length) return;
      
      const { data, error } = await supabase
        .from('job_date_types')
        .select('*')
        .in('job_id', jobs.map((job: any) => job.id));
        
      if (error) return;

      setDateTypes(data.reduce((acc: Record<string, any>, curr) => ({
        ...acc,
        [`${curr.job_id}-${curr.date}`]: curr
      }), {}));
    };

    fetchDateTypes();
  }, [jobs]);

  const getDateTypeIcon = (jobId: string, date: Date) => {
    const key = `${jobId}-${format(date, 'yyyy-MM-dd')}`;
    const dateType = dateTypes[key]?.type;

    switch (dateType) {
      case 'travel': return <Plane className="h-3 w-3 text-blue-500" />;
      case 'setup': return <Wrench className="h-3 w-3 text-yellow-500" />;
      case 'show': return <Star className="h-3 w-3 text-green-500" />;
      case 'off': return <Moon className="h-3 w-3 text-gray-500" />;
      default: return null;
    }
  };

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'sound': return <Music2 className="h-3 w-3" />;
      case 'lights': return <Lightbulb className="h-3 w-3" />;
      case 'video': return <Video className="h-3 w-3" />;
      default: return null;
    }
  };

  const getTotalRequiredPersonnel = (job: any) => {
    let total = 0;
    // Calculate total personnel required for the job
    total += job.job_assignments?.length || 0;
    return total;
  };

  const getJobsForDate = (date: Date) => {
    if (!jobs) return [];
    
    const jobsForDate = jobs.filter(job => {
      const startDate = new Date(job.start_time);
      const endDate = new Date(job.end_time);
      const compareDate = format(date, 'yyyy-MM-dd');
      const jobStartDate = format(startDate, 'yyyy-MM-dd');
      const jobEndDate = format(endDate, 'yyyy-MM-dd');
      const isSingleDayJob = jobStartDate === jobEndDate;
      const isWithinDuration = isSingleDayJob 
        ? compareDate === jobStartDate
        : compareDate >= jobStartDate && compareDate <= jobEndDate;
      
      if (department) {
        return isWithinDuration && 
               job.job_departments.some((dept: any) => dept.department === department);
      }
      
      return isWithinDuration;
    });

    return jobsForDate;
  };

  const renderJobCard = (job: any, date: Date) => {
    return (
      <div className="border p-2 rounded-md">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{job.title}</span>
          <span className="text-sm">{format(new Date(job.start_time), 'HH:mm')}</span>
        </div>
        <div className="flex items-center">
          {getDepartmentIcon(job.job_departments[0]?.department)}
          <span className="ml-2 text-sm">{getTotalRequiredPersonnel(job)} Personnel Required</span>
        </div>
      </div>
    );
  };

  // Navigation handlers
  const handlePreviousMonth = () => onDateSelect(addMonths(currentMonth, -1));
  const handleNextMonth = () => onDateSelect(addMonths(currentMonth, 1));
  const handleTodayClick = () => onDateSelect(new Date());

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Printer className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Print Range</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-4">
                  <Button onClick={() => generatePDF('month')}>
                    Current Month ({format(currentMonth, 'MMMM yyyy')})
                  </Button>
                  <Button onClick={() => generatePDF('quarter')}>
                    Next Quarter
                  </Button>
                  <Button onClick={() => generatePDF('year')}>
                    Whole Year ({format(currentMonth, 'yyyy')})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleTodayClick}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-px bg-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="bg-background p-2 text-center text-sm text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
              {allDays.map((day, i) => {
                const dayJobs = getJobsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "bg-background p-2 min-h-[120px] border-t relative cursor-pointer hover:bg-accent/50 transition-colors",
                      !isCurrentMonth && "text-muted-foreground/50"
                    )}
                    onClick={() => onDateSelect(day)}
                  >
                    <span className="text-sm">{format(day, "d")}</span>
                    <div className="space-y-1 mt-1">
                      {dayJobs.slice(0, 3).map((job: any) => renderJobCard(job, day))}
                      {dayJobs.length > 3 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          + {dayJobs.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {selectedJob && (
          <JobMilestonesDialog
            open={showMilestones}
            onOpenChange={setShowMilestones}
            jobId={selectedJob.id}
            jobStartDate={new Date(selectedJob.start_time)}
          />
        )}
      </CardContent>
    </Card>
  );
};
