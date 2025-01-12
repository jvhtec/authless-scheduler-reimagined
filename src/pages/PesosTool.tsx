import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Sample component database
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
    newRows[index][field] = value;
    
    if (field === 'componentId') {
      const component = componentDatabase.find(c => c.id.toString() === value);
      if (component) {
        newRows[index].weight = component.weight.toString();
      }
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

  const generateTable = () => {
    if (!currentTable.name) {
      alert('Please enter a table name.');
      return;
    }

    const calculatedRows = currentTable.rows.map(row => {
      const component = componentDatabase.find(c => c.id.toString() === row.componentId);
      const totalWeight = row.quantity && row.weight ? 
        parseFloat(row.quantity) * parseFloat(row.weight) : 0;
      return {
        ...row,
        componentName: component?.name || '',
        totalWeight
      };
    });

    const newTable = {
      ...currentTable,
      rows: calculatedRows,
      totalWeight: calculateTotalWeight(calculatedRows),
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

  const preparePDFData = () => {
    // This function would prepare the data for PDF export
    // You would implement the actual PDF generation here
    alert('PDF export would go here - data is ready for export');
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Pesos Tool</CardTitle>
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

          {/* Input Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Quantity</th>
                  <th className="p-2 text-left">Component</th>
                  <th className="p-2 text-left">Weight (per unit)</th>
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
                        value={row.weight}
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
            <Button onClick={preparePDFData} variant="outline">Export All to PDF</Button>
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
                    <th className="p-2 text-left">Weight (per unit)</th>
                    <th className="p-2 text-left">Total Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{row.quantity}</td>
                      <td className="p-2">{row.componentName}</td>
                      <td className="p-2">{row.weight}</td>
                      <td className="p-2">{row.totalWeight?.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td colSpan="3" className="p-2 text-right">Total Weight:</td>
                    <td className="p-2">{table.totalWeight?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PesosTool;
