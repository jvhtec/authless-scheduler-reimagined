import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/JobCard";
import { TourChips } from "@/components/dashboard/TourChips";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { JobWithAssignment } from "@/types/job";
import { CalendarSection } from "./CalendarSection";

interface AdminDashboardProps {
  timeSpan: string;
  onTimeSpanChange: (value: string) => void;
  jobs: JobWithAssignment[] | null;
  isLoading: boolean;
  onEditClick: (job: JobWithAssignment) => void;
  onDeleteClick: (jobId: string) => void;
  onJobClick: (jobId: string) => void;
}

export const AdminDashboard = ({
  timeSpan,
  onTimeSpanChange,
  jobs,
  isLoading,
  onEditClick,
  onDeleteClick,
  onJobClick,
}: AdminDashboardProps) => {
  return (
    <>
      <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={onTimeSpanChange} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <CalendarSection jobs={jobs || []} />
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold mt-4">All Jobs</h2>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-4">
                  {jobs?.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEditClick={onEditClick}
                      onDeleteClick={onDeleteClick}
                      onJobClick={onJobClick}
                    />
                  ))}
                  {!jobs?.length && (
                    <p className="text-muted-foreground">No jobs found.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TourChips onTourClick={() => {}} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};