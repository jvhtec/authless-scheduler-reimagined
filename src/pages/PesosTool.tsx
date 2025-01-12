import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useJobSelection } from '@/hooks/useJobSelection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const componentDatabase = [
  { id: 1, name: 'Steel Beam Type A', weight: 25.5 },
  { id: 2, name: 'Concrete Block B', weight: 15.2 },
  { id: 3, name: 'Aluminum Panel', weight: 5.8 },
];

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
}

const PesosTool = () => {
  const { toast } = useToast();
  const { data: jobs, isLoading: jobsLoading } = useJobSelection();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', weight: '' }]
  });

  const addRow = () => {
    setCurrentTable(prev => ({
      ...prev,
      rows: [...prev.rows, { quantity: '', componentId: '', weight: '' }]
    }));
  };

  const updateInput = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...currentTable.rows];
    if (field === 'componentId') {
      const component = componentDatabase.find(c => c.id.toString() === value);
      newRows[index] = {
        ...newRows[index],
        [field]: value,
        weight: component ? component.weight.toString() : ''
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

  const calculateTotalWeight = (rows: TableRow[]) => {
    return rows.reduce((sum, row) => {
      const weight = parseFloat(row.weight) || 0;
      const quantity = parseFloat(row.quantity) || 0;
      return sum + (weight * quantity);
    }, 0);
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
      const totalSystemWeight = tables.reduce((sum, table) => sum + (table.totalWeight || 0), 0);
      const pdfBlob = await exportToPDF(projectName, tables, 'weight', { totalSystemWeight });

      const file = new File([pdfBlob], `${projectName}-weight-report.pdf`, { type: 'application/pdf' });

      const filePath = `sound/${selectedJobId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('task_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: tasks, error: taskError } = await supabase
        .from('sound_job_tasks')
        .select('id')
        .eq('job_id', selectedJobId)
        .eq('task_type', 'Pesos')
        .single();

      if (taskError) throw taskError;

      const { error: docError } = await supabase
        .from('task_documents')
        .insert({
          file_name: `${projectName}-weight-report.pdf`,
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
      a.download = `${projectName}-weight-report.pdf`;
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

  const generateTable = () => {
    if (!currentTable.name) {
      alert('Please enter a table name.');
      return;
    }

    const calculatedRows = currentTable.rows.map(row => {
      const component = componentDatabase.find(c => c.id.toString() === row.componentId);
      const totalWeight = parseFloat(row.quantity) && parseFloat(row.weight) ? 
        parseFloat(row.quantity) * parseFloat(row.weight) : 0;
      return {
        ...row,
        componentName: component?.name || '',
        totalWeight
      };
    });

    const totalWeight = calculatedRows.reduce((sum, row) => sum + (row.totalWeight || 0), 0);

    const newTable = {
      ...currentTable,
      rows: calculatedRows,
      totalWeight,
      id: Date.now()
    };

    setTables(prev => [...prev, newTable]);
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', weight: '' }]
    });
  };

  const resetFields = () => {
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', weight: '' }]
    });
  };

  const removeTable = (tableId: number) => {
    setTables(prev => prev.filter(table => table.id !== tableId));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Weight Calculator</CardTitle>
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
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.tour_date ? `${job.tour_date.tour.name} - ${job.title}` : job.title}
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

          <div className="flex gap-2">
            <Button onClick={addRow}>Add Row</Button>
            <Button onClick={generateTable} variant="secondary">Generate Table</Button>
            <Button onClick={resetFields} variant="destructive">Reset</Button>
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
                    <td colSpan={3} className="px-4 py-3 text-right">Total Weight:</td>
                    <td className="px-4 py-3">{table.totalWeight?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {tables.length > 0 && (
            <div className="mt-6 bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Total System Weight</h3>
              <div>
                <span className="font-medium">Total:</span>
                <span className="ml-2">
                  {tables.reduce((sum, table) => sum + (table.totalWeight || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PesosTool;
