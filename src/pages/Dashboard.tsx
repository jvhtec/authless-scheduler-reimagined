import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import CreateTourDialog from "@/components/tours/CreateTourDialog";

const Dashboard = () => {
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false);
  const [showCreateTourDialog, setShowCreateTourDialog] = useState(false);
  const [timeSpan, setTimeSpan] = useState("1week");
  const [selectedDate, setSelectedDate] = useState<Date>();

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
      
      <CalendarSection 
        date={selectedDate}
        onDateSelect={setSelectedDate}
      />

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