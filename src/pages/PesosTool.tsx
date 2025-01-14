import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ArrowLeft } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useJobSelection, JobSelection } from '@/hooks/useJobSelection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';

const componentDatabase = {
  sound: [
    { id: 1, name: 'K1', weight: 106 },
    { id: 2, name: 'K2', weight: 56 },
    { id: 3, name: 'K3', weight: 43 },
    { id: 4, name: 'KARA II', weight: 25 },
    { id: 5, name: 'KIVA', weight: 14 },
    { id: 6, name: 'KS28', weight: 79 },
    { id: 7, name: 'K1-SB', weight: 83 },
    { id: 8, name: 'BUMPER K1', weight: 108 },
    { id: 9, name: 'BUMPER K2', weight: 60 },
    { id: 10, name: 'BUMPER K3', weight: 50 },
    { id: 11, name: 'BUMPER KARA', weight: 20 },
    { id: 12, name: 'BUMPER KIVA', weight: 13 },
    { id: 13, name: 'BUMPER KS28', weight: 15 },
    { id: 14, name: 'KARADOWNK1', weight: 15 },
    { id: 15, name: 'KARADOWNK2', weight: 15 },
    { id: 16, name: 'MOTOR 2T', weight: 90 },
    { id: 17, name: 'MOTOR 1T', weight: 70 },
    { id: 18, name: 'MOTOR 750Kg', weight: 60 },
    { id: 19, name: 'MOTOR 500Kg', weight: 50 },
    { id: 20, name: 'POLIPASTO 1T', weight: 10.4 },
  ],
  lights: [], // Placeholder for lights components
  video: [], // Placeholder for video components
};

interface TableRow {
  quantity: string;
  componentId: string;
  weight: string;
  componentName?: string;
  totalWeight?: number;
}

interface Table {
  name: string;
  rows: TableRow[];
  totalWeight?: number;
  id?: number;
  dualMotors?: boolean;
}

let soundTableCounter = 0;

const PesosTool: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();

  const params = new URLSearchParams(location.search);
  const department = params.get('department') || 'sound';
  const components = componentDatabase[department];

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobSelection | null>(null);
  const [tableName, setTableName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [useDualMotors, setUseDualMotors] = useState(false);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', weight: '' }],
  });

  const addRow = () => {
    setCurrentTable((prev) => ({
      ...prev,
      rows: [...prev.rows, { quantity: '', componentId: '', weight: '' }],
    }));
  };

  const updateInput = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...currentTable.rows];
    if (field === 'componentId') {
      const component = components.find((c) => c.id.toString() === value);
      newRows[index] = {
        ...newRows[index],
        [field]: value,
        weight: component ? component.weight.toString() : '',
      };
    } else {
      newRows[index] = {
        ...newRows[index],
        [field]: value,
      };
    }
    setCurrentTable((prev) => ({
      ...prev,
      rows: newRows,
    }));
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs?.find((j) => j.id === jobId) || null;
    setSelectedJob(job);
  };

  const generateSuffix = () => {
    soundTableCounter++;
    return `SX${soundTableCounter.toString().padStart(2, '0')}`;
  };

  const generateTable = () => {
    if (!tableName) {
      toast({
        title: 'Missing table name',
        description: 'Please enter a name for the table',
        variant: 'destructive',
      });
      return;
    }

    const calculatedRows = currentTable.rows.map((row) => {
      const component = components.find((c) => c.id.toString() === row.componentId);
      const totalWeight =
        parseFloat(row.quantity) && parseFloat(row.weight)
          ? parseFloat(row.quantity) * parseFloat(row.weight)
          : 0;
      return {
        ...row,
        componentName: component?.name || '',
        totalWeight,
      };
    });

    const totalWeight = calculatedRows.reduce((sum, row) => sum + (row.totalWeight || 0), 0);

    let suffix = '';
    if (department === 'sound') {
      suffix = useDualMotors
        ? ` (${generateSuffix()}, ${generateSuffix()})`
        : ` (${generateSuffix()})`;
    }

    const newTable = {
      name: `${tableName}${suffix}`,
      rows: calculatedRows,
      totalWeight,
      id: Date.now(),
      dualMotors: useDualMotors,
    };

    setTables((prev) => [...prev, newTable]);
    resetCurrentTable();
    setUseDualMotors(false);
  };

  const resetCurrentTable = () => {
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', weight: '' }],
    });
    setTableName('');
  };

  const removeTable = (tableId: number) => {
    setTables((prev) => prev.filter((table) => table.id !== tableId));
  };

  const handleExportPDF = async () => {
    if (!selectedJobId || !selectedJob) {
      toast({
        title: 'No job selected',
        description: 'Please select a job before exporting',
        variant: 'destructive',
      });
      return;
    }

    try {
      const jobName = selectedJob.title;
      const pdfBlob = await exportToPDF(tableName, tables, 'weight', jobName);

      // Additional code for exporting and uploading PDF
    } catch (error) {
      console.error('Export Error:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sound')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Weight Calculator</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jobSelect">Select Job</Label>
            <Select value={selectedJobId} onValueChange={handleJobSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableName">Table Name</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter table name"
            />
          </div>

          {department === 'sound' && (
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="dualMotors"
                checked={useDualMotors}
                onCheckedChange={(checked) => setUseDualMotors(checked as boolean)}
              />
              <Label htmlFor="dualMotors" className="text-sm font-medium">
                Dual Motors Configuration
              </Label>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium">Component</th>
                  <th className="px-4 py-3 text-left font-medium">Weight (per unit)</th>
                </tr>
              </thead>
              <tbody>
                {currentTable.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-4">
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateInput(index, 'quantity', e.target.value)}
                        min="0"
                      />
                    </td>
                    <td className="p-4">
                      <Select
                        value={row.componentId}
                        onValueChange={(value) => updateInput(index, 'componentId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select component" />
                        </SelectTrigger>
                        <SelectContent>
                          {components.map((component) => (
                            <SelectItem key={component.id} value={component.id.toString()}>
                              {component.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Input type="number" value={row.weight} readOnly />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={addRow}>Add Row</Button>
            <Button onClick={generateTable} variant="secondary">
              Generate Table
            </Button>
            <Button onClick={resetCurrentTable} variant="destructive">
              Reset
            </Button>
            {tables.length > 0 && (
              <Button onClick={handleExportPDF} variant="outline">
                <FileText className="w-4 h-4" />
                Export & Upload PDF
              </Button>
            )}
          </div>

          {tables.map((table) => (
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
                    <th className="px-4 py-3 text-left font-medium">Weight (per unit)</th>
                    <th className="px-4 py-3 text-left font-medium">Total Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3">{row.componentName}</td>
                      <td className="px-4 py-3">{row.weight}</td>
                      <td className="px-4 py-3">{row.totalWeight?.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/50 font-medium">
                    <td colSpan={3} className="px-4 py-3 text-right">
                      Total Weight:
                    </td>
                    <td className="px-4 py-3">{table.totalWeight?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              {table.dualMotors && (
                <div className="px-4 py-2 text-sm text-gray-500 bg-muted/30 italic">
                  *This configuration uses dual motors. Load is distributed between two motors for safety and redundancy.
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PesosTool;