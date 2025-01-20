import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToPDF } from "@/utils/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface PowerRow {
  quantity: string; // Changed from number to string
  componentName: string;
  watts: number;
  totalWatts: number;
}

interface PowerTable {
  name: string;
  rows: PowerRow[];
  totalWatts: number;
  currentPerPhase?: number;
}

const VideoConsumosTool = () => {
  const [projectName, setProjectName] = useState("");
  const [jobName, setJobName] = useState("");
  const [safetyMargin, setSafetyMargin] = useState(20); // 20% safety margin
  const [tables, setTables] = useState<PowerTable[]>([
    {
      name: "LED Screens",
      rows: [
        { quantity: "0", componentName: "LED Panel P3.9", watts: 450, totalWatts: 0 },
        { quantity: "0", componentName: "LED Panel P2.6", watts: 500, totalWatts: 0 },
        { quantity: "0", componentName: "LED Processor", watts: 800, totalWatts: 0 },
      ],
      totalWatts: 0,
    },
    {
      name: "Cameras & Control",
      rows: [
        { quantity: "0", componentName: "Professional Camera", watts: 80, totalWatts: 0 },
        { quantity: "0", componentName: "Video Switcher", watts: 350, totalWatts: 0 },
        { quantity: "0", componentName: "Monitor", watts: 150, totalWatts: 0 },
      ],
      totalWatts: 0,
    },
    {
      name: "Projection Systems",
      rows: [
        { quantity: "0", componentName: "Projector 20K", watts: 2200, totalWatts: 0 },
        { quantity: "0", componentName: "Media Server", watts: 750, totalWatts: 0 },
        { quantity: "0", componentName: "Signal Processor", watts: 300, totalWatts: 0 },
      ],
      totalWatts: 0,
    },
  ]);

  const { toast } = useToast();

  const handleQuantityChange = (tableIndex: number, rowIndex: number, value: string) => {
    const newTables = [...tables];
    const quantity = parseInt(value) || 0;
    const row = newTables[tableIndex].rows[rowIndex];
    
    row.quantity = value; // Store as string
    row.totalWatts = quantity * row.watts;
    
    // Recalculate table total
    newTables[tableIndex].totalWatts = newTables[tableIndex].rows.reduce(
      (sum, row) => sum + row.totalWatts,
      0
    );
    
    setTables(newTables);
  };

  const calculateTotalPower = () => {
    const rawTotal = tables.reduce((sum, table) => sum + table.totalWatts, 0);
    return rawTotal * (1 + safetyMargin/100);
  };

  const calculateTotalCurrent = () => {
    return calculateTotalPower() / (400 * Math.sqrt(3));
  };

  const handleExport = async () => {
    try {
      const blob = await exportToPDF(
        projectName || "Untitled Project",
        tables,
        "power",
        jobName || "Untitled Job",
        {
          totalSystemWatts: calculateTotalPower(),
          totalSystemAmps: calculateTotalCurrent(),
        },
        safetyMargin
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName || "video-power-report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Video Power Calculator</h1>
        <Button onClick={handleExport}>Export PDF</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
          />
        </div>
        <div>
          <Label htmlFor="jobName">Job Name</Label>
          <Input
            id="jobName"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="Enter job name"
          />
        </div>
        <div>
          <Label htmlFor="safetyMargin">Safety Margin (%)</Label>
          <Input
            id="safetyMargin"
            type="number"
            min="0"
            max="100"
            value={safetyMargin}
            onChange={(e) => setSafetyMargin(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-6">
        {tables.map((table, tableIndex) => (
          <Card key={tableIndex}>
            <CardHeader>
              <CardTitle>{table.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {table.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        value={row.quantity}
                        onChange={(e) =>
                          handleQuantityChange(tableIndex, rowIndex, e.target.value)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Component</Label>
                      <div className="p-2 bg-muted rounded-md">{row.componentName}</div>
                    </div>
                    <div>
                      <Label>Power (W)</Label>
                      <div className="p-2 bg-muted rounded-md">{row.totalWatts.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-4">
                  <div className="text-lg">
                    Current per phase: {table.currentPerPhase?.toFixed(2) || "0.00"} A
                  </div>
                  <div className="text-lg font-semibold">
                    Total: {table.totalWatts.toFixed(2)} W
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-xl">
              Total System Current: {calculateTotalCurrent().toFixed(2)} A per phase
            </div>
            <div className="text-xl font-bold">
              Total System Power: {calculateTotalPower().toFixed(2)} W
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoConsumosTool;
