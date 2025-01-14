import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ArrowLeft, Scale } from 'lucide-react';
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

const VOLTAGE_3PHASE = 400;
const POWER_FACTOR = 0.85;
const SQRT3 = Math.sqrt(3);

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
  currentPerPhase?: number;
  pduType?: string;
  id?: number;
}

const ConsumosTool = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: jobs } = useJobSelection();

  // State Variables
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobSelection | null>(null);
  const [tableName, setTableName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [safetyMargin, setSafetyMargin] = useState(0); // Safety margin in %
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', watts: '' }]
  });

  // Helper: Calculate phase currents with safety margin
  const calculatePhaseCurrents = (totalWatts: number) => {
    const adjustedWatts = totalWatts * (1 + safetyMargin / 100);
    return adjustedWatts / (SQRT3 * VOLTAGE_3PHASE * POWER_FACTOR);
  };

  // Recommend PDU based on current per phase
  const recommendPDU = (current: number) => {
    if (current < 32) return PDU_TYPES[0]; // CEE32A
    if (current < 63) return PDU_TYPES[1]; // CEE63A
    return PDU_TYPES[2]; // CEE125A
  };

  // Add new row
  const addRow = () => {
    setCurrentTable(prev => ({
      ...prev,
      rows: [...prev.rows, { quantity: '', componentId: '', watts: '' }]
    }));
  };

  // Update input
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

  // Generate table
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
    const pduSuggestion = recommendPDU(currentPerPhase);

    const newTable = {
      name: tableName,
      rows: calculatedRows,
      totalWatts,
      currentPerPhase,
      pduType: pduSuggestion,
      id: Date.now()
    };

    setTables(prev => [...prev, newTable]);
    setCurrentTable({ name: '', rows: [{ quantity: '', componentId: '', watts: '' }] });
    setTableName('');
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!selectedJobId || !selectedJob) {
      toast({
        title: "No job selected",
        description: "Please select a job before exporting",
        variant: "destructive"
      });
      return;
    }

    const jobName = selectedJob.title || 'Unnamed Job';

    const pdfBlob = await exportToPDF(
      selectedJob.title,
      tables,
      'power',
      jobName,
      {
        totalSystemWatts: tables.reduce((sum, table) => sum + (table.totalWatts || 0), 0),
        totalSystemAmps: tables.reduce((sum, table) => sum + (table.currentPerPhase || 0), 0)
      },
      safetyMargin // Pass safety margin to PDF function
    );

    // File upload and feedback logic...
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
            <CardTitle className="text-2xl font-bold">Power Calculator</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Safety Margin Selector */}
        <div className="space-y-4">
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
            onValueChange={value => setSelectedJobId(value)}
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

        {/* Table Name */}
        <div className="space-y-2">
          <Label htmlFor="tableName">Table Name</Label>
          <Input
            id="tableName"
            value={tableName}
            onChange={e => setTableName(e.target.value)}
            placeholder="Enter table name"
          />
        </div>

        {/* Table Rows */}
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

        {/* Table Controls */}
        <div className="flex gap-2">
          <Button onClick={addRow}>Add Row</Button>
          <Button onClick={generateTable} variant="secondary">Generate Table</Button>
          <Button onClick={() => setCurrentTable({ name: '', rows: [{ quantity: '', componentId: '', watts: '' }] })} variant="destructive">Reset</Button>
          {tables.length > 0 && (
            <Button onClick={handleExportPDF} variant="outline" className="ml-auto gap-2">
              <FileText className="w-4 w-4" />
              Export & Upload PDF
            </Button>
          )}
        </div>

        {/* Generated Tables */}
        {tables.map(table => (
          <div key={table.id} className="border rounded-lg overflow-hidden mt-6">
            <div className="bg-muted px-4 py-3 flex justify-between items-center">
              <h3 className="font-semibold">{table.name} ({table.pduType})</h3>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setTables(prev => prev.filter(t => t.id !== table.id))}
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
                  <th className="px-4 py-3 text-left font-medium">Current per Phase</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.componentName}</td>
                    <td className="px-4 py-3">{row.watts}</td>
                    <td className="px-4 py-3">{row.totalWatts?.toFixed(2)}</td>
                    <td className="px-4 py-3">{table.currentPerPhase?.toFixed(2)} A</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/50 font-medium">
                  <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                  <td className="px-4 py-3">{table.totalWatts?.toFixed(2)} W</td>
                  <td className="px-4 py-3">{table.currentPerPhase?.toFixed(2)} A</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ConsumosTool;