import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  { id: 1, name: ' K1 ', weight: 106 },
  { id: 2, name: ' K2 ', weight: 56 },
  { id: 3, name: ' K3 ', weight: 43 },
  { id: 4, name: ' KARA II ', weight: 25 },
  { id: 5, name: ' KIVA ', weight: 14 },
  { id: 6, name: ' KS28 ', weight: 79 },
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
    const job = jobs?.find(j => j.id === jobId);
    if (!job) {
      toast({
        title: 'Error',
        description: 'Failed to retrieve job information.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedJobId(jobId);
    setSelectedJob(job);
  };

  const generateTable = () => {
    if (!tableName) {
      toast({
        title: 'Missing table name',
        description: 'Please enter a name for the table',
        variant: 'destructive'
      });
      return;
    }

    const calculatedRows = currentTable.rows.map(row => {
      const component = componentDatabase.find(c => c.id.toString() === row.componentId);
      const totalWeight = parseFloat(row.quantity) && parseFloat(row.weight)
        ? parseFloat(row.quantity) * parseFloat(row.weight)
        : 0;
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

  const handleExportPDF = async () => {
    if (!selectedJob) {
      toast({
        title: 'No job selected',
        description: 'Please select a job before exporting',
        variant: 'destructive'
      });
      return;
    }

    try {
      const jobName = selectedJob.tour_date?.tour?.name || selectedJob.title;
      const fileName = `Pesos Sonido ${jobName}.pdf`;
      const totalSystemWeight = tables.reduce((sum, table) => sum + (table.totalWeight || 0), 0);
      const pdfBlob = await exportToPDF(tableName, tables, 'weight', { totalSystemWeight });

      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const filePath = `sound/${selectedJobId}/${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('task_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast({
        title: 'Success',
        description: 'PDF exported successfully!',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the PDF.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
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
      </CardHeader>
      <div className="space-y-6">
        <Label>Select Job</Label>
        <Select value={selectedJobId} onValueChange={handleJobSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a job" />
          </SelectTrigger>
          <SelectContent>
            {jobs?.map(job => (
              <SelectItem key={job.id} value={job.id}>
                {job.tour_date?.tour?.name || job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleExportPDF} variant="outline" className="ml-auto">
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </Card>
  );
};

export default PesosTool;