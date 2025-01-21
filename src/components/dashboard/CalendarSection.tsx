import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, Users, Music2, Lightbulb, Video } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface CalendarSectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  jobs?: any[];
  department?: string;
}

export const CalendarSection = ({ date = new Date(), onDateSelect, jobs = [], department }: CalendarSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  const getJobsForDate = (date: Date) => {
    if (!jobs) return [];
    
    // If we're in a department-specific view, filter for that department
    if (department) {
      return jobs.filter(job => {
        const jobDate = new Date(job.start_time);
        return isSameDay(jobDate, date) && 
               job.job_departments.some((dept: any) => dept.department === department);
      });
    }
    
    // For dashboard view, show all jobs for the date
    return jobs.filter(job => {
      const jobDate = new Date(job.start_time);
      return isSameDay(jobDate, date);
    });
  };

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'sound':
        return <Music2 className="h-3 w-3" />;
      case 'lights':
        return <Lightbulb className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateSelect(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateSelect(newDate);
  };

  const handleTodayClick = () => {
    onDateSelect(new Date());
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
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
                      {dayJobs.map((job: any) => (
                        <TooltipProvider key={job.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="p-2 rounded text-sm truncate hover:bg-accent/50 transition-colors"
                                style={{
                                  backgroundColor: `${job.color}20`,
                                  color: job.color,
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(job.start_time), "HH:mm")}</span>
                                </div>
                                <div className="truncate">{job.title}</div>
                                {!department && (
                                  <div className="flex gap-1 mt-1">
                                    {job.job_departments.map((dept: any) => (
                                      <div key={dept.department} className="text-xs">
                                        {getDepartmentIcon(dept.department)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="w-64 p-2">
                              <div className="space-y-2">
                                <h4 className="font-semibold">{job.title}</h4>
                                {job.description && (
                                  <p className="text-sm text-muted-foreground">{job.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {format(new Date(job.start_time), "HH:mm")} - 
                                    {format(new Date(job.end_time), "HH:mm")}
                                  </span>
                                </div>
                                {job.location && job.location.name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4" />
                                    <span>{job.location.name}</span>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">Departments:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {job.job_departments.map((dept: any) => (
                                      <Badge key={dept.department} variant="secondary" className="flex items-center gap-1">
                                        {getDepartmentIcon(dept.department)}
                                        <span className="capitalize">{dept.department}</span>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4" />
                                  <span>
                                    {job.job_assignments?.length || 0} assigned
                                  </span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};