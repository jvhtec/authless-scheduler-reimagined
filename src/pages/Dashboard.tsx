import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
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
    </div>
  );
};

export default Dashboard;