import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Clock, Users, Music2, Lightbulb, Video, Plane, Wrench, Star, Moon, Mic, Check, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, parseISO } from "date-fns";
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
import { useToast } from "@/hooks/use-toast";

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
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toast } = useToast();

  const distinctJobTypes = jobs ? Array.from(new Set(jobs.map(job => job.job_type).filter(Boolean))) : [];

  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('selected_job_types')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error loading user preferences:', error);
          return;
        }

        if (profile?.selected_job_types) {
          setSelectedJobTypes(profile.selected_job_types);
        }
      } catch (error) {
        console.error('Error in loadUserPreferences:', error);
      }
    };

    loadUserPreferences();
  }, []);

  const saveUserPreferences = async (types: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({ selected_job_types: types })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error saving user preferences:', error);
        toast({
          title: "Error saving preferences",
          description: "Your filter preferences couldn't be saved.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in saveUserPreferences:', error);
    }
  };

  const handleJobTypeSelection = (type: string) => {
    const newTypes = selectedJobTypes.includes(type)
      ? selectedJobTypes.filter(t => t !== type)
      : [...selectedJobTypes, type];
    
    setSelectedJobTypes(newTypes);
    saveUserPreferences(newTypes);
    setIsDropdownOpen(false);
  };

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

    const typesMap = data.reduce((acc: Record<string, any>, curr) => ({
      ...acc,
      [`${curr.job_id}-${curr.date}`]: curr
    }), {});

    setDateTypes(typesMap);
  };

  useEffect(() => {
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
      try {
        const startDate = job.start_time ? parseISO(job.start_time) : null;
        const endDate = job.end_time ? parseISO(job.end_time) : null;
        
        if (!startDate || !endDate) {
          console.warn('Invalid date found for job:', job);
          return false;
        }

        const compareDate = format(date, 'yyyy-MM-dd');
        const jobStartDate = format(startDate, 'yyyy-MM-dd');
        const jobEndDate = format(endDate, 'yyyy-MM-dd');
        
        const isSingleDayJob = jobStartDate === jobEndDate;
        const isWithinDuration = isSingleDayJob 
          ? compareDate === jobStartDate
          : compareDate >= jobStartDate && compareDate <= jobEndDate;
        
        const matchesDepartment = department 
          ? isWithinDuration && job.job_departments.some((d: any) => d.department === department)
          : isWithinDuration;

        const matchesJobType = selectedJobTypes.length === 0 || selectedJobTypes.includes(job.job_type);

        return matchesDepartment && matchesJobType;
      } catch (error) {
        console.error('Error processing job dates:', error, job);
        return false;
      }
    });
  };

  const generatePDF = async (range: 'month' | 'quarter' | 'year') => {
    const doc = new jsPDF('landscape');
    const currentDate = date || new Date();
    let startDate: Date, endDate: Date;

    // Load logo first
    const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    }).catch(() => null);

    // Calculate logo dimensions
    const logoWidth = 50;
    const logoHeight = logo ? logoWidth * (logo.height / logo.width) : 0;
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoX = logo ? (pageWidth - logoWidth) / 2 : 0;

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

    // Filter jobs based on selected job types before generating PDF
    const filteredJobs = jobs.filter(job => selectedJobTypes.length === 0 || selectedJobTypes.includes(job.job_type));

    const cellWidth = 40;
    const cellHeight = 30;
    const startX = 10;
    const startY = 10 + (logo ? logoHeight + 10 : 0);
    const daysOfWeek = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

    const dateTypeLabels: Record<string, string> = {
      travel: 'V',
      setup: 'M',
      show: 'S',
      off: 'O',
      rehearsal: 'E'
    };

    for (const [pageIndex, monthStart] of months.entries()) {
      if (pageIndex > 0) doc.addPage('landscape');

      // Add logo to top center
      if (logo) {
        doc.addImage(logo, 'PNG', logoX, 10, logoWidth, logoHeight);
      }

      // Add month title below logo
      doc.setFontSize(16);
      doc.text(
        format(monthStart, 'MMMM yyyy'), 
        pageWidth / 2, 
        logo ? 10 + logoHeight + 5 : 20, 
        { align: 'center' }
      );

      // Days of week headers
      daysOfWeek.forEach((day, index) => {
        doc.setFillColor(41, 128, 185);
        doc.rect(startX + (index * cellWidth), startY, cellWidth, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.text(day, startX + (index * cellWidth) + 15, startY + 7);
      });

      const monthEnd = endOfMonth(monthStart);
      const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const firstDayOfWeek = 1;

      function getDayIndex(d: Date) {
        return firstDayOfWeek === 1 ? (d.getDay() + 6) % 7 : d.getDay();
      }

      const offset = getDayIndex(monthStart);
      const offsetDays = Array.from({ length: offset }, () => null);
      const allDays = [...offsetDays, ...monthDays];
      const weeks: Array<Array<Date | null>> = [];

      while (allDays.length > 0) {
        weeks.push(allDays.splice(0, 7));
      }

      let currentY = startY + 10;

      for (const week of weeks) {
        for (const [dayIndex, day] of week.entries()) {
          const x = startX + (dayIndex * cellWidth);

          doc.setDrawColor(200);
          doc.rect(x, currentY, cellWidth, cellHeight);

          if (!day) continue;

          doc.setTextColor(isSameMonth(day, monthStart) ? 0 : 200);
          doc.setFontSize(12);
          doc.text(format(day, 'd'), x + 2, currentY + 5);

          const dayJobs = getJobsForDate(day);
          let eventY = currentY + 8;

          for (const [index, job] of dayJobs.slice(0, 8).entries()) {
            const key = `${job.id}-${format(day, 'yyyy-MM-dd')}`;
            const dateType = dateTypes[key]?.type;
            const typeLabel = dateType ? dateTypeLabels[dateType] : '';

            const baseColor = job.color || '#cccccc';
            const [r, g, b] = hexToRgb(baseColor);
            const textColor = getContrastColor(baseColor);

            doc.setFillColor(r, g, b);
            doc.rect(x + 1, eventY + (index * 5), cellWidth - 2, 4, 'F');

            if (typeLabel) {
              doc.setFontSize(8);
              doc.setTextColor(textColor);
              doc.text(typeLabel, x + 3, eventY + (index * 5) + 3);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(textColor);
            const titleX = typeLabel ? x + 8 : x + 3;
            doc.text(job.title.substring(0, 18), titleX, eventY + (index * 5) + 3);
          }
        }
        currentY += cellHeight;
      }

      if (pageIndex === 0) {
        const legendY = currentY + 10;
        doc.setFontSize(8);
        doc.setTextColor(0);
        Object.entries(dateTypeLabels).forEach(([type, label], index) => {
          doc.text(`${label} = ${type}`, 10 + (index * 40), legendY);
        });
      }
    }

    doc.save(`calendar-${range}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setShowPrintDialog(false);
  };

  // Color utilities
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const getContrastColor = (hex: string): string => {
    const [r, g, b] = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
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
          const { data } = await supabase
            .from('job_date_types')
            .select('*')
            .eq('job_id', job.id);
            
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

        <div className="relative mb-4">
          <button
            className="border border-gray-300 rounded-md py-1 px-2 text-sm w-full flex items-center justify-between"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {selectedJobTypes.length > 0
              ? selectedJobTypes.join(", ")
              : "Select Job Types"}
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md">
              {distinctJobTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleJobTypeSelection(type)}
                >
                  <span className="text-sm text-black dark:text-white">{type}</span>
                  {selectedJobTypes.includes(type) && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </div>
              ))}
            </div>
          )}
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
