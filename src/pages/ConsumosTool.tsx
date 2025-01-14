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
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// Constants for power calculations
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

interface ConsumosToolProps {
  department: 'sound' | 'lights' | 'video';
}

const getComponentDatabase = (department: 'sound' | 'lights' | 'video') => {
  switch (department) {
    case 'sound':
      return [
        { id: 1, name: 'LA12X', watts: 2900 },
        { id: 2, name: 'LA8', watts: 2500 },
        { id: 3, name: 'LA4X', watts: 2000 },
        { id: 4, name: 'PLM20000D', watts: 2900 },
        { id: 5, name: 'Control FoH (L)', watts: 3500 },
        { id: 6, name: 'Control FoH (S)', watts: 1500 },
        { id: 7, name: 'Control Mon (L)', watts: 3500 },
        { id: 8, name: 'Control Mon (S)', watts: 1500 },
        { id: 9, name: 'RF Rack', watts: 2500 },
        { id: 10, name: 'Backline', watts: 2500 },
        { id: 11, name: 'Varios', watts: 1500 },
      ];
    case 'lights':
      return [
        { id: 1, name: 'Lights Component 1', watts: 1000 }, // Placeholder
        { id: 2, name: 'Lights Component 2', watts: 2000 }, // Placeholder
      ];
    case 'video':
      return [
        { id: 1, name: 'Video Component 1', watts: 1500 }, // Placeholder
        { id: 2, name: 'Video Component 2', watts: 2500 }, // Placeholder
      ];
  }
};

const ConsumosTool: React.FC<ConsumosToolProps> = ({ department }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobSelection | null>(null);
  const [tableName, setTableName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', watts: '' }]
  });

  const componentDatabase = getComponentDatabase(department);

  const { data: jobs } = useQuery({
    queryKey: ['jobs-for-calculator', department],
    queryFn: async () => {
      console.log(`Fetching jobs for ${department} calculator...`);
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          tour_date_id,
          tour_date:tour_dates!tour_date_id (
            id,
            tour:tours (
              id,
              name
            )
          ),
          job_departments!inner (
            department
          )
        `)
        .eq('job_departments.department', department)
        .order('start_time', { ascending: true });

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      console.log("Filtered jobs data:", jobs);
      return jobs;
    },
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

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs?.find(j => j.id === jobId) || null;
    setSelectedJob(job);
  };

  const calculatePhaseCurrents = (totalWatts: number) => {
    const currentPerPhase = totalWatts / (SQRT3 * VOLTAGE_3PHASE * POWER_FACTOR);
    return currentPerPhase;
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
      name: tableName,
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
    setTableName('');
  };

  const removeTable = (tableId: number) => {
    setTables(prev => prev.filter(table => table.id !== tableId));
  };

  const handleExportPDF = async () => {
    if (!selectedJobId || !selectedJob) {
      toast({
        title: "No job selected",
        description: "Please select a job before exporting",
        variant: "destructive"
      });
      return;
    }

    try {
      const totalSystem = {
        totalSystemWatts: tables.reduce((sum, table) => sum + (table.totalWatts || 0), 0),
        totalSystemAmps: calculatePhaseCurrents(
          tables.reduce((sum, table) => sum + (table.totalWatts || 0), 0)
        )
      };

      const jobName = selectedJob.title || 'Unnamed Job';
      const fileName = `Consumos ${department} - ${jobName}.pdf`;
      const pdfBlob = await exportToPDF(selectedJob.title, tables, 'power', jobName, totalSystem);

      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const filePath = `${department}/${selectedJobId}/${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('task_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // First try to get existing task
      const { data: existingTask, error: fetchError } = await supabase
        .from(`${department}_job_tasks`)
        .select('id')
        .eq('job_id', selectedJobId)
        .eq('task_type', 'Consumos')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      let taskId;

      if (!existingTask) {
        // Create new task if none exists
        const { data: newTask, error: createError } = await supabase
          .from(`${department}_job_tasks`)
          .insert({
            job_id: selectedJobId,
            task_type: 'Consumos',
            status: 'completed',
            progress: 100
          })
          .select('id')
          .single();

        if (createError) throw createError;
        taskId = newTask.id;
      } else {
        taskId = existingTask.id;
      }

      const { error: docError } = await supabase
        .from('task_documents')
        .insert({
          file_name: fileName,
          file_path: filePath,
          [`${department}_task_id`]: taskId,
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
      a.download = fileName;
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
              onClick={() => navigate(`/${department}`)}
              title={`Back to ${department.charAt(0).toUpperCase() + department.slice(1)}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold">Power Calculator</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                {jobs?.map((job) => (
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
                </tbody>
              </table>
            </div>
          ))}

          {tables.length > 0 && (
            <div className="mt-6 bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Total System Summary</h3>
              <div>
                <span className="font-medium">Total Power:</span>
                <span className="ml-2">
                  {tables.reduce((sum, table) => sum + (table.totalWatts || 0), 0).toFixed(2)} W
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsumosTool;
