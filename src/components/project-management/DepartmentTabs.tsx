import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, Lightbulb, Video } from "lucide-react";
import { Department } from "@/types/department";
import { DepartmentTabContent } from "@/components/dashboard/DepartmentTabContent";
import { JobDocument } from "@/types/job";

interface DepartmentTabsProps {
  selectedDepartment: Department;
  onDepartmentChange: (value: string) => void;
  jobs: any[];
  jobsLoading: boolean;
  onDeleteDocument: (jobId: string, document: JobDocument) => Promise<void>;
  userRole: string | null;
}

export const DepartmentTabs = ({
  selectedDepartment,
  onDepartmentChange,
  jobs,
  jobsLoading,
  onDeleteDocument,
  userRole,
}: DepartmentTabsProps) => {
  return (
    <Tabs defaultValue={selectedDepartment} onValueChange={onDepartmentChange}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="sound" className="flex items-center gap-2">
          <Music2 className="h-4 w-4" />
          Sound
        </TabsTrigger>
        <TabsTrigger value="lights" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Lights
        </TabsTrigger>
        <TabsTrigger value="video" className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          Video
        </TabsTrigger>
      </TabsList>

      {["sound", "lights", "video"].map((dept) => (
        <TabsContent key={dept} value={dept}>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{dept} Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentTabContent
                department={dept as Department}
                jobs={jobs}
                isLoading={jobsLoading}
                onDeleteDocument={onDeleteDocument}
                userRole={userRole}
              />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
};