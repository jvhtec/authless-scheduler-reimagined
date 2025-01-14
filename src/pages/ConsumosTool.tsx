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

const componentDatabase = [
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

const VOLTAGE_3PHASE = 380;
const POWER_FACTOR = 0.85;
const PHASES = 3;

const PDU_TYPES = ['CEE32A 3P+N+G', 'CEE63A 3P+N+G', 'CEE125A 3P+N+G'];

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
  wattsPerPhase?: number;
  currentPerPhase?: number;
  pduType?: string;
  id?: number;
}

const ConsumosTool = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobSelection | null>(null);
  const [tableName, setTableName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [safetyMargin, setSafetyMargin] = useState(0);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', watts: '' }]
  });

  const calculatePhaseCurrents = (totalWatts: number) => {
    const adjustedWatts = totalWatts * (1 + safetyMargin / 100);
    const wattsPerPhase = adjustedWatts / PHASES;
    const currentPerPhase = wattsPerPhase / (VOLTAGE_3PHASE * POWER_FACTOR);
    return { wattsPerPhase, currentPerPhase };
  };

  const recommendPDU = (current: number) => {
    if (current < 32) return PDU_TYPES[0];
    if (current < 63) return PDU_TYPES[1];
    return PDU_TYPES[2];
  };

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
      const totalWatts = parseFloat(row.quantity) && parseFloat(row.watts)
        ? parseFloat(row.quantity) * parseFloat(row.watts)
        : 0;
      return {
        ...row,
        componentName: component?.name || '',
        totalWatts
      };
    });

    const totalWatts = calculatedRows.reduce((sum, row) => sum + (row.totalWatts || 0), 0);
    const { wattsPerPhase, currentPerPhase } = calculatePhaseCurrents(totalWatts);
    const pduSuggestion = recommendPDU(currentPerPhase);

    const newTable = {
      name: tableName,
      rows: calculatedRows,
      totalWatts,
      wattsPerPhase,
      currentPerPhase,
      pduType: pduSuggestion,
      id: Date.now()
    };

    setTables(prev => [...prev, newTable]);
    setCurrentTable({ name: '', rows: [{ quantity: '', componentId: '', watts: '' }] });
    setTableName('');
  };

  const resetCurrentTable = () => {
    setCurrentTable({ name: '', rows: [{ quantity: '', componentId: '', watts: '' }] });
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

    const totalSystem = {
      totalSystemWatts: tables.reduce((sum, table) => sum + (table.totalWatts || 0), 0),
      totalSystemAmps: tables.reduce((sum, table) => sum + (table.currentPerPhase || 0), 0)
    };

    const pdfBlob = await exportToPDF(selectedJob.title, tables, 'power', selectedJob.title, totalSystem, safetyMargin);

    const fileName = `Power Report - ${selectedJob.title}.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const filePath = `sound/${selectedJobId}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('task_documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

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
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sound')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Power Calculator</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Safety Margin */}
          <div className="space-y-2">
            <Label htmlFor="safetyMargin">Safety Margin</Label>
            <Select
              value={safetyMargin.toString()}
              onValueChange={value => setSafetyMargin(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Safety Margin" />
              </SelectTrigger>
              <SelectContent>
                {[0, 10, 20, 30, 40, 50].map(percentage => (
                  <SelectItem key={percentage} value={percentage.toString()}>
                    {percentage}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Selector */}
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
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table Input */}
          {/* Same as before with full table inputs */}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsumosTool;