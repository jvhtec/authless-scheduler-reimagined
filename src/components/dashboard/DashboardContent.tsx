import { CalendarSection } from "./CalendarSection";
import { TodaySchedule } from "./TodaySchedule";

interface DashboardContentProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  jobs: any[];
  selectedDateJobs: any[];
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  userRole: string | null;
}

export const DashboardContent = ({
  date,
  setDate,
  jobs,
  selectedDateJobs,
  onEditClick,
  onDeleteClick,
  onJobClick,
  userRole,
}: DashboardContentProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8">
        <CalendarSection 
          date={date} 
          onDateSelect={setDate} 
          jobs={jobs} 
        />
      </div>
      <div className="lg:col-span-4">
        <TodaySchedule
          jobs={selectedDateJobs}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
          onJobClick={onJobClick}
          userRole={userRole}
          selectedDate={date}
        />
      </div>
    </div>
  );
};