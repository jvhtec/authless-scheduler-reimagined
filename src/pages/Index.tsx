import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div
        className={`bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Tech Schedule</h2>
          <nav className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              Schedule
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              Settings
            </Button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="border-b p-4 flex justify-between items-center bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelRightOpen className="h-5 w-5" />
              )}
            </Button>
            <h1 className="text-xl font-semibold">Schedule Manager</h1>
          </div>
          <Button>Sign In</Button>
        </header>

        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card">
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

              <Card className="bg-card">
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;