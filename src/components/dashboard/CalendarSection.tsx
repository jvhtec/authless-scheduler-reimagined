import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, Users } from "lucide-react";
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

interface CalendarSectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  jobs?: any[];
}

export const CalendarSection = ({ date = new Date(), onDateSelect, jobs = [] }: CalendarSectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentMonth = date || new Date();
  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDay = firstDayOfMonth.getDay();
  
  // Calculate padding days for the start of the month
  const paddingDays = startDay === 0 ? 6 : startDay - 1;
  
  // Create array for padding days
  const prefixDays = Array.from({ length: paddingDays }).map((_, i) => {
    const day = new Date(firstDayOfMonth);
    day.setDate(day.getDate() - (paddingDays - i));
    return day;
  });

  // Calculate padding days for the end of the month to complete the grid
  const totalDaysNeeded = 42; // 6 rows × 7 days
  const suffixDays = Array.from({ length: totalDaysNeeded - (prefixDays.length + daysInMonth.length) }).map((_, i) => {
    const day = new Date(lastDayOfMonth);
    day.setDate(day.getDate() + (i + 1));
    return day;
  });

  // Combine all days
  const allDays = [...prefixDays, ...daysInMonth, ...suffixDays];

  const getJobsForDate = (date: Date) => {
    return jobs?.filter(job => {
      const jobDate = new Date(job.start_time);
      return isSameDay(jobDate, date);
    }) || [];
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
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTodayClick}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
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
                                {job.location && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4" />
                                    <span>{job.location}</span>
                                  </div>
                                )}
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