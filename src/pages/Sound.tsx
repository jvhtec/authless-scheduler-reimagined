import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { JobCard } from "@/components/jobs/JobCard";
import { TourChips } from "@/components/dashboard/TourChips";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { useState } from "react";
import { JobWithAssignment } from "@/types/job";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const Sound = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["sound-jobs"],
    queryFn: async () => {
      console.log("Fetching sound department jobs...");
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          location:locations(name),
          job_departments(department)
        `)
        .eq('job_departments.department', 'sound');

      if (error) {
        console.error("Error fetching sound jobs:", error);
        throw error;
      }

      console.log("Sound jobs fetched:", data);
      return data as JobWithAssignment[];
    },
  });

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

  const pendingJobs = filteredJobs?.filter(job => job.status === 'pending') || [];
  const inProgressJobs = filteredJobs?.filter(job => job.status === 'in_progress') || [];
  const completedJobs = filteredJobs?.filter(job => job.status === 'completed') || [];

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const jobId = result.draggableId;
    const newStatus = result.destination.droppableId;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <CalendarSection 
            jobs={jobs || []} 
            onDateSelect={setSelectedDate}
          />
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 gap-4">
              <Droppable droppableId="pending">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-4">Pending</h3>
                        {pendingJobs.map((job, index) => (
                          <Draggable key={job.id} draggableId={job.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-4"
                              >
                                <JobCard
                                  job={job}
                                  onEditClick={() => {}}
                                  onDeleteClick={() => {}}
                                  onJobClick={() => {}}
                                  showAssignments
                                  department="sound"
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Droppable>

              <Droppable droppableId="in_progress">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-4">In Progress</h3>
                        {inProgressJobs.map((job, index) => (
                          <Draggable key={job.id} draggableId={job.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-4"
                              >
                                <JobCard
                                  job={job}
                                  onEditClick={() => {}}
                                  onDeleteClick={() => {}}
                                  onJobClick={() => {}}
                                  showAssignments
                                  department="sound"
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Droppable>

              <Droppable droppableId="completed">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-4">Completed</h3>
                        {completedJobs.map((job, index) => (
                          <Draggable key={job.id} draggableId={job.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-4"
                              >
                                <JobCard
                                  job={job}
                                  onEditClick={() => {}}
                                  onDeleteClick={() => {}}
                                  onJobClick={() => {}}
                                  showAssignments
                                  department="sound"
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <TourChips onTourClick={() => {}} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sound;