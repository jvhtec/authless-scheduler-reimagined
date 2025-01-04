import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/jobs/JobCard";
import { TourChips } from "@/components/dashboard/TourChips";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { JobWithAssignment } from "@/types/job";
import { CalendarSection } from "./CalendarSection";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [selectedDate, setSelectedDate] = useState<Date>();

  const filteredJobs = jobs?.filter(job => {
    if (selectedDate) {
      const jobDate = new Date(job.start_time);
      return (
        jobDate.getDate() === selectedDate.getDate() &&
        jobDate.getMonth() === selectedDate.getMonth() &&
        jobDate.getFullYear() === selectedDate.getFullYear()
      );
    }
    return true;
  });

  return (
    <>
      <DashboardHeader timeSpan={timeSpan} onTimeSpanChange={onTimeSpanChange} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <CalendarSection 
            jobs={jobs || []} 
            onDateSelect={setSelectedDate}
          />
          <Card>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all">All Jobs</TabsTrigger>
                  <TabsTrigger value="sound">Sound</TabsTrigger>
                  <TabsTrigger value="lights">Lights</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="space-y-4 mt-4">
                  {isLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredJobs?.map(job => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onEditClick={onEditClick}
                          onDeleteClick={onDeleteClick}
                          onJobClick={onJobClick}
                        />
                      ))}
                      {!filteredJobs?.length && (
                        <p className="text-muted-foreground">No jobs found.</p>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="sound" className="space-y-4 mt-4">
                  {filteredJobs?.filter(job => 
                    job.job_departments?.some(d => d.department === "sound")
                  ).map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEditClick={onEditClick}
                      onDeleteClick={onDeleteClick}
                      onJobClick={onJobClick}
                    />
                  ))}
                </TabsContent>
                <TabsContent value="lights" className="space-y-4 mt-4">
                  {filteredJobs?.filter(job => 
                    job.job_departments?.some(d => d.department === "lights")
                  ).map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEditClick={onEditClick}
                      onDeleteClick={onDeleteClick}
                      onJobClick={onJobClick}
                    />
                  ))}
                </TabsContent>
                <TabsContent value="video" className="space-y-4 mt-4">
                  {filteredJobs?.filter(job => 
                    job.job_departments?.some(d => d.department === "video")
                  ).map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEditClick={onEditClick}
                      onDeleteClick={onDeleteClick}
                      onJobClick={onJobClick}
                    />
                  ))}
                </TabsContent>
              </Tabs>
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