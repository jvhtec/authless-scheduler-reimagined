import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ArrowLeft, Calculator } from 'lucide-react';
import { exportToPDF } from '@/utils/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';

let soundTableCounter = 0; // Global counter for sound department tables

const PesosTool: React.FC<{ department?: 'sound' | 'lights' | 'video' }> = ({ department = 'sound' }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tableName, setTableName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [useDualMotors, setUseDualMotors] = useState(false);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', weight: '' }]
  });

  const generateTable = () => {
    if (!tableName) {
      toast({
        title: "Missing table name",
        description: "Please enter a name for the table",
        variant: "destructive"
      });
      return;
    }

    // Generate table suffix
    const suffix = (() => {
      if (department === 'sound') {
        soundTableCounter++;
        const suffixNumber = soundTableCounter.toString().padStart(2, '0');
        if (useDualMotors) {
          soundTableCounter++; // Increment counter for dual motors
          return `(SX${suffixNumber}, SX${soundTableCounter.toString().padStart(2, '0')})`;
        }
        return `(SX${suffixNumber})`;
      }
      return '';
    })();

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
      name: `${tableName} ${suffix}`,
      rows: calculatedRows,
      totalWeight,
      id: Date.now(),
      dualMotors: useDualMotors
    };

    setTables(prev => [...prev, newTable]);
    resetCurrentTable();
    setUseDualMotors(false);
  };

  const resetCurrentTable = () => {
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', weight: '' }]
    });
    setTableName('');
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
            <CardTitle className="text-2xl font-bold">Weight Calculator</CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tableName">Table Name</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              placeholder="Enter table name"
              className="w-full"
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="dualMotors"
                checked={useDualMotors}
                onCheckedChange={(checked) => setUseDualMotors(checked as boolean)}
              />
              <Label htmlFor="dualMotors" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Dual Motors Configuration
              </Label>
            </div>
          </div>

          <Button onClick={generateTable} variant="secondary">Generate Table</Button>

          {tables.map(table => (
            <div key={table.id} className="border rounded-lg overflow-hidden mt-6">
              <div className="bg-muted px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold">{table.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PesosTool;
