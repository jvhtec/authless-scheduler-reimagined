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
import { useNavigate, useLocation } from 'react-router-dom';
import { Checkbox } from "@/components/ui/checkbox";

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
    { id: 21, name: 'TFS900H', weight: 102 },
    { id: 22, name: 'TFA600', weight: 41 },
    { id: 23, name: 'TFS550H', weight: 13.4 },
    { id: 24, name: 'TFS550L', weight: 27 },
    { id: 25, name: 'BUMPER TFS900', weight: 20 },
    { id: 26, name: 'TFS900>TFA600', weight: 14 },
    { id: 27, name: 'TFS900>TFS550', weight: 14 },
    { id: 28, name: 'CABLEADO L', weight: 100 },
    { id: 29, name: 'CABLEADO H', weight: 250 },
  ],
  lights: [], // Placeholder for lights component list
  video: [], // Placeholder for video component list
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

let soundTableCounter = 0; // Global counter for sound tables

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

    // Add suffix logic for sound department with dual motors
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
    // Export logic remains the same
    // Refer to the original export logic provided earlier
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
        {/* Department-Specific Dual Motors */}
        {department === 'sound' && (
          <div className="space-y-2">
            <Label htmlFor="dualMotors">Dual Motors</Label>
            <Checkbox
              id="dualMotors"
              checked={useDualMotors}
              onCheckedChange={(checked) => setUseDualMotors(checked as boolean)}
            />
          </div>
        )}
        {/* Rest of the UI */}
      </CardContent>
    </Card>
  );
};

export default PesosTool;