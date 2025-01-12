import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useJobSelection, JobSelection } from '@/hooks/useJobSelection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const componentDatabase = [
  { id: 1, name: 'Motor 5HP', watts: 3730 },
  { id: 2, name: 'Air Conditioner 2-ton', watts: 2000 },
  { id: 3, name: 'LED Light Panel', watts: 45 },
  { id: 4, name: 'Server Rack', watts: 4200 },
  { id: 5, name: 'Desktop Computer', watts: 350 },
];

const VOLTAGE_3PHASE = 400;
const POWER_FACTOR = 0.85;
const SQRT3 = Math.sqrt(3);

interface TableRow {
  quantity: string;
  componentId: string;
  watts: string;
  componentName?: string;
  totalWatts?: number;
}

interface Table {
  name: string;
  rows: TableRow[];
  totalWatts?: number;
  currentPerPhase?: number;
  id?: number;
}

const ConsumosTool = () => {
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', watts: '' }]
  });

  const addRow = () => {
    setCurrentTable(prev => ({
      ...prev,
      rows: [...prev.rows, { quantity: '', componentId: '', watts: '' }]
    }));
  };

  const updateInput = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...currentTable.rows];
    if (field === 'componentId') {
      const component = componentDatabase.find(c => c.id.toString() === value);
      newRows[index] = {
        ...newRows[index],
        [field]: value,
        watts: component ? component.watts.toString() : ''
      };
    } else {
      newRows[index] = {
        ...newRows[index],
        [field]: value
      };
    }
    
    setCurrentTable(prev => ({
      ...prev,
      rows: newRows
    }));
  };

  const calculatePhaseCurrents = (totalWatts: number) => {
    const currentPerPhase = totalWatts / (SQRT3 * VOLTAGE_3PHASE * POWER_FACTOR);
    return currentPerPhase;
  };

  const generateTable = () => {
    if (!currentTable.name) {
      alert('Please enter a table name.');
      return;
    }

    const calculatedRows = currentTable.rows.map(row => {
      const component = componentDatabase.find(c => c.id.toString() === row.componentId);
      const totalWatts = parseFloat(row.quantity) && parseFloat(row.watts) ? 
        parseFloat(row.quantity) * parseFloat(row.watts) : 0;
      return {
        ...row,
        componentName: component?.name || '',
        totalWatts
      };
    });

    const totalWatts = calculatedRows.reduce((sum, row) => sum + (row.totalWatts || 0), 0);
    const currentPerPhase = calculatePhaseCurrents(totalWatts);

    const newTable = {
      ...currentTable,
      rows: calculatedRows,
      totalWatts,
      currentPerPhase,
      id: Date.now()
    };

    setTables(prev => [...prev, newTable]);
    resetCurrentTable();
  };

  const resetCurrentTable = () => {
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', watts: '' }]
    });
  };

  const removeTable = (tableId: number) => {
    setTables(prev => prev.filter(table => table.id !== tableId));
  };

  const handleExportPDF = async () => {
    if (!selectedJobId) {
      toast({
        title: "No job selected",
        description: "Please select a job before exporting",
        variant: "destructive"
      });
      return;
    }

    try {
      const totalSystem = calculateTotalSystem();
      const pdfBlob = await exportToPDF(projectName, tables, 'power', totalSystem);

      const file = new File([pdfBlob], `${projectName}-power-report.pdf`, { type: 'application/pdf' });

      const filePath = `sound/${selectedJobId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('task_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: tasks, error: taskError } = await supabase
        .from('sound_job_tasks')
        .select('id')
        .eq('job_id', selectedJobId)
        .eq('task_type', 'Consumos')
        .single();

      if (taskError) throw taskError;

      const { error: docError } = await supabase
        .from('task_documents')
        .insert({
          file_name: `${projectName}-power-report.pdf`,
          file_path: filePath,
          sound_task_id: tasks.id
        });

      if (docError) throw docError;

      toast({
        title: "Success",
        description: "PDF has been generated and uploaded successfully.",
      });

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('task_documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const url = window.URL.createObjectURL(fileData);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-power-report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error: any) {
      console.error('Error handling PDF:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calculateTotalSystem = () => {
    const totalSystemWatts = tables.reduce((sum, table) => sum + (table.totalWatts || 0), 0);
    const totalSystemAmps = calculatePhaseCurrents(totalSystemWatts);
    return { totalSystemWatts, totalSystemAmps };
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Power Consumption Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobSelect">Select Job</Label>
              <Select
                value={selectedJobId}
                onValueChange={setSelectedJobId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map((job: JobSelection) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.tour_date?.tour?.name ? `${job.tour_date.tour.name} - ${job.title}` : job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium">Component</th>
                  <th className="px-4 py-3 text-left font-medium">Watts (per unit)</th>
                </tr>
              </thead>
              <tbody>
                {currentTable.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-4">
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={e => updateInput(index, 'quantity', e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="p-4">
                      <Select
                        value={row.componentId}
                        onValueChange={value => updateInput(index, 'componentId', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select component" />
                        </SelectTrigger>
                        <SelectContent>
                          {componentDatabase.map(component => (
                            <SelectItem key={component.id} value={component.id.toString()}>
                              {component.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        value={row.watts}
                        readOnly
                        className="w-full bg-muted"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={addRow}>Add Row</Button>
            <Button onClick={generateTable} variant="secondary">Generate Table</Button>
            <Button onClick={resetCurrentTable} variant="destructive">Reset</Button>
            {tables.length > 0 && (
              <Button onClick={handleExportPDF} variant="outline" className="ml-auto gap-2">
                <FileText className="w-4 h-4" />
                Export & Upload PDF
              </Button>
            )}
          </div>

          {tables.map(table => (
            <div key={table.id} className="border rounded-lg overflow-hidden mt-6">
              <div className="bg-muted px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold">{table.name}</h3>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => table.id && removeTable(table.id)}
                >
                  Remove Table
                </Button>
              </div>
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium">Component</th>
                    <th className="px-4 py-3 text-left font-medium">Watts (per unit)</th>
                    <th className="px-4 py-3 text-left font-medium">Total Watts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3">{row.componentName}</td>
                      <td className="px-4 py-3">{row.watts}</td>
                      <td className="px-4 py-3">{row.totalWatts?.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/50 font-medium">
                    <td colSpan={3} className="px-4 py-3 text-right">Total Power:</td>
                    <td className="px-4 py-3">{table.totalWatts?.toFixed(2)} W</td>
                  </tr>
                  <tr className="bg-muted/50 font-medium">
                    <td colSpan={3} className="px-4 py-3 text-right">Current per Phase:</td>
                    <td className="px-4 py-3">{table.currentPerPhase?.toFixed(2)} A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {tables.length > 0 && (
            <div className="mt-6 bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Total System Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total System Power:</span>
                  <span className="ml-2">
                    {calculateTotalSystem().totalSystemWatts?.toFixed(2)} W
                  </span>
                </div>
                <div>
                  <span className="font-medium">Total Current per Phase:</span>
                  <span className="ml-2">
                    {calculateTotalSystem().totalSystemAmps?.toFixed(2)} A
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsumosTool;
