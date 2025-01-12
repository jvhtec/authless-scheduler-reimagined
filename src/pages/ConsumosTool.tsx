import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const componentDatabase = [
  { id: 1, name: 'Motor 5HP', watts: 3730 },
  { id: 2, name: 'Air Conditioner 2-ton', watts: 2000 },
  { id: 3, name: 'LED Light Panel', watts: 45 },
  { id: 4, name: 'Server Rack', watts: 4200 },
  { id: 5, name: 'Desktop Computer', watts: 350 },
];

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

const ConsumosTool = () => {
  const [projectName, setProjectName] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTable, setCurrentTable] = useState<Table>({
    name: '',
    rows: [{ quantity: '', componentId: '', watts: '' }]
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

  const calculatePhaseCurrents = (totalWatts: number) => {
    const currentPerPhase = totalWatts / (SQRT3 * VOLTAGE_3PHASE * POWER_FACTOR);
    return currentPerPhase;
  };

  const generateTable = () => {
    if (!currentTable.name) {
      alert('Please enter a table name.');
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
      ...currentTable,
      rows: calculatedRows,
      totalWatts,
      currentPerPhase,
      id: Date.now()
    };

    setTables(prev => [...prev, newTable]);
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', watts: '' }]
    });
  };

  const resetFields = () => {
    setCurrentTable({
      name: '',
      rows: [{ quantity: '', componentId: '', watts: '' }]
    });
  };

  const removeTable = (tableId) => {
    setTables(prev => prev.filter(table => table.id !== tableId));
  };

  const calculateTotalSystem = () => {
    const totalSystemWatts = tables.reduce((sum, table) => sum + table.totalWatts, 0);
    const totalSystemAmps = calculatePhaseCurrents(totalSystemWatts);
    return { totalSystemWatts, totalSystemAmps };
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader>
        <CardTitle>Power Consumption Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                value={currentTable.name}
                onChange={e => setCurrentTable(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Quantity</th>
                  <th className="p-2 text-left">Component</th>
                  <th className="p-2 text-left">Watts (per unit)</th>
                </tr>
              </thead>
              <tbody>
                {currentTable.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={e => updateInput(index, 'quantity', e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={row.componentId}
                        onValueChange={(value) => updateInput(index, 'componentId', value)}
                      >
                        <SelectTrigger>
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
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.watts}
                        readOnly
                        className="w-full bg-gray-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-x-2">
            <Button onClick={addRow}>Add Row</Button>
            <Button onClick={generateTable} variant="secondary">Generate Table</Button>
            <Button onClick={resetFields} variant="destructive">Reset</Button>
          </div>

          {/* Generated Tables */}
          {tables.map(table => (
            <div key={table.id} className="border rounded-lg overflow-hidden mt-6">
              <div className="bg-gray-100 p-2 flex justify-between items-center">
                <h3 className="font-semibold">{table.name}</h3>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => removeTable(table.id)}
                >
                  Remove Table
                </Button>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Quantity</th>
                    <th className="p-2 text-left">Component</th>
                    <th className="p-2 text-left">Watts (per unit)</th>
                    <th className="p-2 text-left">Total Watts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{row.quantity}</td>
                      <td className="p-2">{row.componentName}</td>
                      <td className="p-2">{row.watts}</td>
                      <td className="p-2">{row.totalWatts?.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td colSpan="3" className="p-2 text-right">Total Power:</td>
                    <td className="p-2">{table.totalWatts?.toFixed(2)} W</td>
                  </tr>
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td colSpan="3" className="p-2 text-right">Current per Phase:</td>
                    <td className="p-2">{table.currentPerPhase?.toFixed(2)} A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Total System Summary */}
          {tables.length > 0 && (
            <div className="mt-6 bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Total System Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total System Power:</span>
                  <span className="ml-2">{calculateTotalSystem().totalSystemWatts?.toFixed(2)} W</span>
                </div>
                <div>
                  <span className="font-medium">Total Current per Phase:</span>
                  <span className="ml-2">{calculateTotalSystem().totalSystemAmps?.toFixed(2)} A</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsumosTool;
