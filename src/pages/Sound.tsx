import { Button } from "@/components/ui/button";
import { useState } from "react";
import CreateJobDialog from "@/components/jobs/CreateJobDialog";
import CreateTourDialog from "@/components/tours/CreateTourDialog";

const Sound = () => {
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const currentDepartment = "sound";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Sound Department</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsJobDialogOpen(true)}>
            Create Job
          </Button>
          <Button variant="outline" onClick={() => setIsTourDialogOpen(true)}>
            Create Tour
          </Button>
        </div>
      </div>

      <CreateJobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        currentDepartment={currentDepartment}
      />
      
      <CreateTourDialog
        open={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
        currentDepartment={currentDepartment}
      />
    </div>
  );
};

export default Sound;