import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import CreateTourDialog from "@/components/tours/CreateTourDialog";
import { Department } from "@/types/department";

const Dashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const currentDepartment: Department = "sound"; // This would typically come from user context

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsJobDialogOpen(true)}>
            Create Job
          </Button>
          <Button variant="outline" onClick={() => setIsTourDialogOpen(true)}>
            Create Tour
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule for {date?.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Sign in to view and manage schedules
              </p>
              <div className="flex justify-center">
                <Button variant="outline">Create Schedule</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sound Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">3 upcoming events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lights Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">2 upcoming events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Video Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">1 upcoming event</p>
          </CardContent>
        </Card>
      </div>

      <CreateJobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        currentDepartment={currentDepartment}
      />
      
      <CreateTourDialog
        open={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
      />
    </div>
  );
};

export default Dashboard;