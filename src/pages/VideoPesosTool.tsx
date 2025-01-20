import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToPDF } from "@/utils/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface EquipmentRow {
  quantity: string; // Changed from number to string
  componentName: string;
  weight: number;
  totalWeight: number;
}

interface EquipmentTable {
  name: string;
  rows: EquipmentRow[];
  totalWeight: number;
}

const VideoPesosTool = () => {
  const [projectName, setProjectName] = useState("");
  const [jobName, setJobName] = useState("");
  const [tables, setTables] = useState<EquipmentTable[]>([
    {
      name: "LED Screens",
      rows: [
        { quantity: "0", componentName: "LED Panel P3.9", weight: 8.5, totalWeight: 0 },
        { quantity: "0", componentName: "LED Panel P2.6", weight: 9.2, totalWeight: 0 },
        { quantity: "0", componentName: "LED Panel Processor", weight: 4.8, totalWeight: 0 },
      ],
      totalWeight: 0,
    },
    {
      name: "Cameras & Equipment",
      rows: [
        { quantity: "0", componentName: "Professional Camera", weight: 7.2, totalWeight: 0 },
        { quantity: "0", componentName: "Camera Tripod", weight: 4.5, totalWeight: 0 },
        { quantity: "0", componentName: "Video Switcher", weight: 5.3, totalWeight: 0 },
      ],
      totalWeight: 0,
    },
    {
      name: "Projection Systems",
      rows: [
        { quantity: "0", componentName: "Projector 20K", weight: 55, totalWeight: 0 },
        { quantity: "0", componentName: "Projector Screen", weight: 35, totalWeight: 0 },
        { quantity: "0", componentName: "Media Server", weight: 12, totalWeight: 0 },
      ],
      totalWeight: 0,
    },
  ]);

  const { toast } = useToast();

  const handleQuantityChange = (tableIndex: number, rowIndex: number, value: string) => {
    const newTables = [...tables];
    const quantity = parseInt(value) || 0;
    const row = newTables[tableIndex].rows[rowIndex];
    
    row.quantity = value; // Store as string
    row.totalWeight = quantity * row.weight;
    
    // Recalculate table total
    newTables[tableIndex].totalWeight = newTables[tableIndex].rows.reduce(
      (sum, row) => sum + row.totalWeight,
      0
    );
    
    setTables(newTables);
  };

  const calculateTotalWeight = () => {
    return tables.reduce((sum, table) => sum + table.totalWeight, 0);
  };

  const handleExport = async () => {
    try {
      const blob = await exportToPDF(
        projectName || "Untitled Project",
        tables,
        "weight",
        jobName || "Untitled Job"
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName || "video-weight-report"}.pdf`;
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
        <h1 className="text-3xl font-bold">Video Weight Calculator</h1>
        <Button onClick={handleExport}>Export PDF</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                      <Label>Weight (kg)</Label>
                      <div className="p-2 bg-muted rounded-md">{row.totalWeight.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-4">
                  <div className="text-lg font-semibold">
                    Total: {table.totalWeight.toFixed(2)} kg
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xl font-bold text-right">
            Total System Weight: {calculateTotalWeight().toFixed(2)} kg
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPesosTool;