import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TechnicianDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Technician Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>My Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;