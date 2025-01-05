import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCardNew } from "./JobCardNew";
import { LucideIcon } from "lucide-react";
import { Department } from "@/types/department";

interface DepartmentScheduleProps {
  name: Department;
  icon: LucideIcon;
  color: string;
  jobs: any[];
  onEditClick: (job: any) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
  userRole?: string | null;
}

export const DepartmentSchedule = ({
  name,
  icon: Icon,
  color,
  jobs,
  onEditClick,
  onDeleteClick,
  onJobClick,
  userRole
}: DepartmentScheduleProps) => {
  return (
    <Card className="w-full transition-all hover:shadow-lg">
      <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
        <CardTitle className="flex items-center gap-2">
          <Icon className={`w-6 h-6 ${color}`} />
          <span className="capitalize">{name} Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] overflow-y-auto">
        <div className="space-y-4">
          {jobs.map(job => (
            <JobCardNew
              key={job.id}
              job={job}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              onJobClick={onJobClick}
              department={name}
              userRole={userRole}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};