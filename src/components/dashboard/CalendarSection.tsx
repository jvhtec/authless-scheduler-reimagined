import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, Users, Music2, Lightbulb, Video, Plane, Wrench, Star, Moon, Mic, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, isSameDay } from "date-fns";
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

      console.log('Date types fetched:', data);

      const typesMap = data.reduce((acc: Record<string, any>, curr) => ({
        ...acc,
        [`${curr.job_id}-${curr.date}`]: curr
      }), {});

      console.log('Date types map:', typesMap);
      setDateTypes(typesMap);
    };

    fetchDateTypes();
  }, [jobs]);

  const getDateTypeIcon = (jobId: string, date: Date) => {
    const key = `${jobId}-${format(date, 'yyyy-MM-dd')}`;
    const dateType = dateTypes[key]?.type;
    
    console.log('Getting icon for:', { jobId, date, key, dateType });

    switch (dateType) {
      case 'travel': return <Plane className="h-3 w-3 text-blue-500" />;
      case 'setup': return <Wrench className="h-3 w-3 text-yellow-500" />;
      case 'show': return <Star className="h-3 w-3 text-green-500" />;
      case 'off': return <Moon className="h-3 w-3 text-gray-500" />;
      case 'rehearsal': return <Mic className="h-3 w-3 text-violet-500" />;
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
    
    if (job.sound_job_personnel?.length > 0) {
      total += (job.sound_job_personnel[0].foh_engineers || 0) + 
               (job.sound_job_personnel[0].mon_engineers || 0) + 
               (job.sound_job_personnel[0].pa_techs || 0) + 
               (job.sound_job_personnel[0].rf_techs || 0);
    }
    
    if (job.lights_job_personnel?.length > 0) {
      total += (job.lights_job_personnel[0].lighting_designers || 0) + 
               (job.lights_job_personnel[0].lighting_techs || 0) + 
               (job.lights_job_personnel[0].spot_ops || 0) + 
               (job.lights_job_personnel[0].riggers || 0);
    }
    
    if (job.video_job_personnel?.length > 0) {
      total += (job.video_job_personnel[0].video_directors || 0) + 
               (job.video_job_personnel[0].camera_ops || 0) + 
               (job.video_job_personnel[0].playback_techs || 0) + 
               (job.video_job_personnel[0].video_techs || 0);
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
      
      return department 
        ? isWithinDuration && job.job_departments.some((d: any) => d.department === department)
        : isWithinDuration;
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
        endDate = endOfQuarter(addMonths(startDate, 2));
        break;
      case 'year':
        startDate = startOfYear(currentDate);
        endDate = endOfYear(currentDate);
        break;
      default:
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
    }

    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const cellWidth = 40;
    const cellHeight = 30;
    const startX = 10;
    const startY = 30;
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const colors = ['#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2'];

    months.forEach((monthStart, pageIndex) => {
      if (pageIndex > 0) doc.addPage('landscape');
      
      const monthEnd = endOfMonth(monthStart);
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const weeks: Date[][] = [];
      let currentWeek: Date[] = [];

      monthDays.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push([...currentWeek]);
          currentWeek = [];
        }
      });

      if (currentWeek.length > 0) {
        weeks.push([...currentWeek]);
      }

      doc.setFontSize(16);
      doc.text(format(monthStart, 'MMMM yyyy'), 105, 20, { align: 'center' });

      daysOfWeek.forEach((day, index) => {
        doc.setFillColor(41, 128, 185);
        doc.rect(startX + (index * cellWidth), startY, cellWidth, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.text(day, startX + (index * cellWidth) + 15, startY + 7);
      });

      let yPos = startY + 10;
      weeks.forEach(week => {
        week.forEach((day, dayIndex) => {
          const x = startX + (dayIndex * cellWidth);
          const y = yPos;
          
          doc.setDrawColor(200);
          doc.rect(x, y, cellWidth, cellHeight);

          doc.setTextColor(isSameMonth(day, monthStart) ? 0 : 200);
          doc.setFontSize(12);
          doc.text(format(day, 'd'), x + 2, y + 5);

          const dayJobs = getJobsForDate(day);
          let eventY = y + 8;
          
          dayJobs.slice(0, 8).forEach((job, index) => {
            const key = `${job.id}-${format(day, 'yyyy-MM-dd')}`;
            const dateType = dateTypes[key]?.type;
            
            doc.setFillColor(colors[index % colors.length]);
            doc.rect(x + 1, eventY + (index * 5), cellWidth - 2, 4, 'F');

            const icon = getDateTypeIconComponent(dateType);
            if (icon) {
              doc.addImage(icon, 'PNG', x + 2, eventY + (index * 5) + 0.5, 3, 3);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(0);
            doc.text(job.title.substring(0, 18), x + 6, eventY + (index * 5) + 3);
          });
        });
        yPos += cellHeight;
      });

      if (pageIndex === 0) {
        const legendY = yPos + 10;
        const icons = [
          { type: 'travel', component: getDateTypeIconComponent('travel') },
          { type: 'setup', component: getDateTypeIconComponent('setup') },
          { type: 'show', component: getDateTypeIconComponent('show') },
          { type: 'off', component: getDateTypeIconComponent('off') },
        ];

        icons.forEach((icon, index) => {
          if (icon.component) {
            doc.addImage(icon.component, 'PNG', 10 + (index * 30), legendY, 5, 5);
            doc.text(icon.type, 17 + (index * 30), legendY + 5);
          }
        });
      }
    });

    doc.save(`calendar-${range}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setShowPrintDialog(false);
  };

  const getDateTypeIconComponent = (type: string) => {
    const iconSize = 16;
    const canvas = document.createElement('canvas');
    canvas.width = iconSize;
    canvas.height = iconSize;
    const ctx = canvas.getContext('2d')!;
    
    const icons: Record<string, string> = {
      travel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.8 19.1a.75.75 0 1 0-1.2-.9l-1.5-2a.75.75 0 0 0-.6-.3h-3v-2h1a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h1v2h-3a.75.75 0 0 0-.6.3l-1.5 2a.75.75 0 1 0 1.2.9l1.2-1.6h9.6l1.2 1.6Z"/>
              </svg>`,
      setup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
               <path d="M14.25 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm-2.655 4.805a.75.75 0 0 1-.345.635l-2.25 1.5a.75.75 0 0 1-.787-1.28l1.38-.92V9.75a.75.75 0 0 1 1.5 0v2.58l1.38.92a.75.75 0 0 1-.338 1.355Z"/>
             </svg>`,
      show: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z"/>
            </svg>`,
      off: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
             <path d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"/>
           </svg>`
    };

    const svg = icons[type] || '';
    const img = new Image();
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    
    ctx.clearRect(0, 0, iconSize, iconSize);
    ctx.drawImage(img, 0, 0, iconSize, iconSize);
    return canvas.toDataURL();
  };

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
            
          if (error) {
            console.error('Error refreshing date types:', error);
            return;
          }

          console.log('Refreshed date types:', data);
          
          setDateTypes(prev => ({
            ...prev,
            ...data?.reduce((acc: Record<string, any>, curr) => ({
              ...acc,
              [`${curr.job_id}-${curr.date}`]: curr
            }), {})
          }));
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
                {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
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
