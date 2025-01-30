import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { JobCard } from "@/components/jobs/JobCard";
import { Department } from "@/types/department";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface CalendarSectionProps {
  date?: Date;
  onDateSelect: (date: Date) => void;
  jobs: any[];
  department: Department;
}

export const CalendarSection = ({
  date,
  onDateSelect,
  jobs,
  department
}: CalendarSectionProps) => {
  const [showJobTypes, setShowJobTypes] = useState({
    single: true,
    festival: true,
    tour: false,
    tourdate: true,
    dryhire: true
  });

  const toggleJobType = (type: string) => {
    setShowJobTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const filteredJobs = jobs.filter(job => showJobTypes[job.job_type as keyof typeof showJobTypes]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleJobType('single')}
            className={showJobTypes.single ? 'bg-primary/10' : ''}
          >
            Single
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleJobType('festival')}
            className={showJobTypes.festival ? 'bg-primary/10' : ''}
          >
            Festival
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleJobType('tour')}
            className={showJobTypes.tour ? 'bg-primary/10' : ''}
          >
            Tour
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleJobType('tourdate')}
            className={showJobTypes.tourdate ? 'bg-primary/10' : ''}
          >
            Tour Date
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleJobType('dryhire')}
            className={showJobTypes.dryhire ? 'bg-primary/10' : ''}
          >
            Dry Hire
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
};