import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import CreateTourDialog from "@/components/tours/CreateTourDialog";
import { TourChips } from "@/components/dashboard/TourChips";
import { DepartmentSchedule } from "@/components/dashboard/DepartmentSchedule";
import { useJobs } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { Calendar, Home, Users } from "lucide-react";

const Dashboard = () => {
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false);
  const [showCreateTourDialog, setShowCreateTourDialog] = useState(false);
  const [timeSpan, setTimeSpan] = useState("1week");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const navigate = useNavigate();

  const { data: jobs = [], isLoading } = useJobs();

  const handleTourClick = (tourId: string) => {
    // Handle tour click navigation
    console.log("Navigating to tour:", tourId);
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/sound/jobs/${jobId}`);
  };

  const soundJobs = jobs.filter(job => 
    job.job_departments?.some((dept: any) => dept.department === 'sound')
  );

  const lightsJobs = jobs.filter(job => 
    job.job_departments?.some((dept: any) => dept.department === 'lights')
  );

  const videoJobs = jobs.filter(job => 
    job.job_departments?.some((dept: any) => dept.department === 'video')
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <DashboardHeader 
          timeSpan={timeSpan} 
          onTimeSpanChange={setTimeSpan} 
        />
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateJobDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
          <Button onClick={() => setShowCreateTourDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Tour
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <TourChips onTourClick={handleTourClick} />
      </div>
      
      <CalendarSection 
        date={selectedDate}
        onDateSelect={setSelectedDate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DepartmentSchedule
          name="sound"
          icon={Home}
          color="text-blue-500"
          jobs={soundJobs}
          onEditClick={() => {}}
          onDeleteClick={() => {}}
          onJobClick={handleJobClick}
        />
        <DepartmentSchedule
          name="lights"
          icon={Calendar}
          color="text-yellow-500"
          jobs={lightsJobs}
          onEditClick={() => {}}
          onDeleteClick={() => {}}
          onJobClick={handleJobClick}
        />
        <DepartmentSchedule
          name="video"
          icon={Users}
          color="text-green-500"
          jobs={videoJobs}
          onEditClick={() => {}}
          onDeleteClick={() => {}}
          onJobClick={handleJobClick}
        />
      </div>

      <CreateJobDialog
        open={showCreateJobDialog}
        onOpenChange={setShowCreateJobDialog}
        currentDepartment="sound"
      />
      
      <CreateTourDialog
        open={showCreateTourDialog}
        onOpenChange={setShowCreateTourDialog}
        currentDepartment="sound"
      />
    </div>
  );
};

export default Dashboard;