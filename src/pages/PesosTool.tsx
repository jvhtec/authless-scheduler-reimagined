import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ArrowLeft, Calculator } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useJobSelection, JobSelection } from '@/hooks/useJobSelection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobSelection | null>(null);
  const [tableName, setTableName] = useState('');
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

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs?.find(j => j.id === jobId) || null;
    setSelectedJob(job);
  };

  const generateTable = () => {
    if (!tableName) {
      toast({
        title: "Missing table name",
        description: "Please enter a name for the table",
        variant: "destructive"
      });
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
      name: tableName,
      rows: calculatedRows,
      totalWeight,
      id: Date.now()
    };

    setTables(prev => [...prev, newTable]);
    resetCurrentTable();
  };

  const resetCurrentTable = () => {
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', weight: '' }]
    });
    setTableName('');
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
      const totalSystemWeight = tables.reduce((sum, table) => sum + (table.totalWeight || 0), 0);
      const pdfBlob = await exportToPDF(tableName, tables, 'weight', { totalSystemWeight });
      const timestamp = new Date().getTime();
      const file = new File([pdfBlob], `${tableName}-weight-report-${timestamp}.pdf`, { type: 'application/pdf' });

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
          file_name: `${tableName}-weight-report-${timestamp}.pdf`,
          file_path: filePath,
          sound_task_id: tasks.id,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
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
      a.download = `${tableName}-weight-report-${timestamp}.pdf`;
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

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/sound')}
              title="Back to Sound"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold">Weight Calculator</CardTitle>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/consumos-tool')}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            Power Calculator
          </Button>
        </div>
      </CardHeader>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="jobSelect">Select Job</Label>
          <Select
            value={selectedJobId}
            onValueChange={handleJobSelect}
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
          <Label htmlFor="tableName">Table Name</Label>
          <Input
            id="tableName"
            value={tableName}
            onChange={e => setTableName(e.target.value)}
            placeholder="Enter table name"
            className="w-full"
          />
        </div>

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
                      value={row.weight}
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
    </Card>
  );
};

export default PesosTool;
