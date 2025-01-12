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
  // The full list of components remains unchanged.
  { id: 1, name: ' K1 ', weight: 106 },
  // ...
  { id: 29, name: ' CABLEADO H ', weight: 250 },
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
  const [selectedJob, setSelectedJob] = useState<JobSelection | null>(null); // Stores the full job object.
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
    setSelectedJob(job); // Save the selected job object to state.
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

      const jobName = selectedJob?.tour_date?.tour?.name || selectedJob?.title || 'Unnamed Job';
      const file = new File([pdfBlob], `Pesos-Sonido-${jobName}.pdf`, { type: 'application/pdf' });

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
          file_name: `Pesos-Sonido-${jobName}.pdf`,
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
      a.download = `Pesos-Sonido-${jobName}.pdf`;
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
      {/* Rest of your JSX remains unchanged */}
      {/* ... */}
    </Card>
  );
};

export default PesosTool;