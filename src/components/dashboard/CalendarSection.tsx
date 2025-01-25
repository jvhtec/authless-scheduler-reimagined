import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, Users, Music2, Lightbulb, Video, Plane, Wrench, Star, Moon, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, isBefore, addDays, addMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { DateTypeContextMenu } from "./DateTypeContextMenu";
import { JobMilestonesDialog } from "@/components/milestones/JobMilestonesDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
        
      if (error) {
        console.error('Error fetching date types:', error);
        return;
      }

      const types = data.reduce((acc: Record<string, any>, curr) => {
        const key = `${curr.job_id}-${curr.date}`;
        acc[key] = curr;
        return acc;
      }, {});

      setDateTypes(types);
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

  const getDateTypeSymbol = (type: string) => {
    switch (type) {
      case 'travel': return '✈️';
      case 'setup': return '🔧';
      case 'show': return '⭐';
      case 'off': return '🌙';
      default: return '';
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
    
    if (job.sound_job_personnel?.length > 0) {
      const sound = job.sound_job_personnel[0];
      total += (sound.foh_engineers || 0) + 
               (sound.mon_engineers || 0) + 
               (sound.pa_techs || 0) + 
               (sound.rf_techs || 0);
    }
    
    if (job.lights_job_personnel?.length > 0) {
      const lights = job.lights_job_personnel[0];
      total += (lights.lighting_designers || 0) + 
               (lights.lighting_techs || 0) + 
               (lights.spot_ops || 0) + 
               (lights.riggers || 0);
    }
    
    if (job.video_job_personnel?.length > 0) {
      const video = job.video_job_personnel[0];
      total += (video.video_directors || 0) + 
               (video.camera_ops || 0) + 
               (video.playback_techs || 0) + 
               (video.video_techs || 0);
    }
    
    return total;
  };

  const getJobsForDate = (date: Date) => {
    if (!jobs) return [];
    
    return jobs.filter(job => {
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
  };

  const generatePDF = async (range: 'month' | 'quarter' | 'year') => {
    const doc = new jsPDF('landscape');
    const currentDate = date || new Date();
    let startDate: Date, endDate: Date;

    switch (range) {
      case 'month':
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
      case 'quarter':
        startDate = startOfQuarter(addMonths(currentDate, 1));
        endDate = endOfQuarter(addMonths(currentDate, 3));
        break;
      case 'year':
        startDate = startOfYear(currentDate);
        endDate = endOfYear(currentDate);
        break;
      default:
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
    }

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const tableData = allDays.map(day => {
      const dayJobs = getJobsForDate(day);
      return {
        date: format(day, 'yyyy-MM-dd'),
        day: format(day, 'EEEE'),
        jobs: dayJobs.map(job => {
          const key = `${job.id}-${format(day, 'yyyy-MM-dd')}`;
          const dateType = dateTypes[key]?.type;
          return {
            title: job.title,
            department: job.job_departments.map((d: any) => d.department).join(', '),
            time: `${format(new Date(job.start_time), 'HH:mm')} - ${format(new Date(job.end_time), 'HH:mm')}`,
            type: dateType
          };
        })
      };
    });

    const pdfData = tableData.map(d => [
      d.date,
      d.day,
      d.jobs.map(j => 
        `${getDateTypeSymbol(j.type)} ${j.title} (${j.department})\n${j.time}`
      ).join('\n\n')
    ]);

    const legend = [
      { symbol: '✈️', meaning: 'Travel Day' },
      { symbol: '🔧', meaning: 'Setup Day' },
      { symbol: '⭐', meaning: 'Show Day' },
      { symbol: '🌙', meaning: 'Day Off' },
    ];

    doc.setFontSize(12);
    doc.text(`Calendar - ${format(startDate, 'MMM yyyy')} to ${format(endDate, 'MMM yyyy')}`, 14, 15);
    
    doc.setFontSize(10);
    legend.forEach((item, index) => {
      doc.text(`${item.symbol} ${item.meaning}`, 14 + (index * 50), 25);
    });

    (doc as any).autoTable({
      startY: 30,
      head: [['Date', 'Day', 'Jobs']],
      body: pdfData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 230 }
      }
    });

    doc.save(`calendar-${range}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setShowPrintDialog(false);
  };

  const PrintDialog = () => (
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
            Current Month ({format(date || new Date(), 'MMMM yyyy')})
          </Button>
          <Button onClick={() => generatePDF('quarter')}>
            Next Quarter ({format(addMonths(startOfQuarter(addMonths(date || new Date(), 1)), 1), 'Q')} Quarter)
          </Button>
          <Button onClick={() => generatePDF('year')}>
            Whole Year ({format(date || new Date(), 'yyyy')})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderJobCard = (job: any, date: Date) => {
    const dateTypeIcon = getDateTypeIcon(job.id, date);
    const totalRequired = getTotalRequiredPersonnel(job);
    const currentlyAssigned = job.job_assignments?.length || 0;
    
    return (
      <DateTypeContextMenu 
        key={job.id} 
        jobId={job.id} 
        date={date}
        onTypeChange={async () => {
          const { data, error } = await supabase
            .from('job_date_types')
            .select('*')
            .eq('job_id', job.id);
            
          if (!error) {
            const types = data.reduce((acc: Record<string, any>, curr) => {
              const key = `${curr.job_id}-${curr.date}`;
              acc[key] = curr;
              return acc;
            }, {});
            setDateTypes(prev => ({ ...prev, ...types }));
          }
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="px-1.5 py-0.5 rounded text-xs truncate hover:bg-accent/50 transition-colors flex items-center gap-1 cursor-pointer"
                style={{
                  backgroundColor: `${job.color}20`,
                  color: job.color,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedJob(job);
                  setShowMilestones(true);
                }}
              >
                {dateTypeIcon}
                <span>{job.title}</span>
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
                    {format(new Date(job.start_time), "MMM d, HH:mm")} - 
                    {format(new Date(job.end_time), "MMM d, HH:mm")}
                  </span>
                </div>
                {job.location?.name && (
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
                  <span>{currentlyAssigned}/{totalRequired} assigned</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DateTypeContextMenu>
    );
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
            <PrintDialog />
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
                const maxVisibleJobs = 3;
                
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
                      {dayJobs.slice(0, maxVisibleJobs).map((job: any) => renderJobCard(job, day))}
                      {dayJobs.length > maxVisibleJobs && (
                        <div className="text-xs text-muted-foreground mt-1">
                          + {dayJobs.length - maxVisibleJobs} more
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
