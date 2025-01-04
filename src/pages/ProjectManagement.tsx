import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProjectManagement = () => {
  return (
    <div className="container mx-auto px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Welcome to the Project Management dashboard. This section will help you manage and track your projects effectively.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagement;