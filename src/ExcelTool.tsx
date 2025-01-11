// Import necessary libraries
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Main component for the tool
const ExcelTool = () => {
    const [tableName, setTableName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [inputData, setInputData] = useState([
        { quantity: '', component: '', weight: '' },
    ]);
    const [outputData, setOutputData] = useState([]);

    // Add a new row to the input table
    const addRow = () => {
        setInputData([...inputData, { quantity: '', component: '', weight: '' }]);
    };

    // Update input data dynamically
    const updateInput = (index: number, field: string, value: string) => {
        const newData = [...inputData];
        newData[index][field] = value;
        setInputData(newData);
    };

    // Generate the output table
    const generateTable = () => {
        if (!tableName) {
            alert('Please enter a table name.');
            return;
        }

        const calculatedData = inputData.map(row => {
            const totalWeight = row.quantity && row.weight ? parseFloat(row.quantity) * parseFloat(row.weight) : 0;
            return { ...row, totalWeight };
        });

        setOutputData(calculatedData);
    };

    // Reset all fields and data
    const resetFields = () => {
        setTableName('');
        setProjectName('');
        setInputData([{ quantity: '', component: '', weight: '' }]);
        setOutputData([]);
    };

    // Export output to PDF
    const exportToPDF = () => {
        if (!outputData.length) {
            alert('No data to export. Please generate the table first.');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Project: ${projectName}`, 10, 10);
        doc.text(`Table: ${tableName}`, 10, 20);

        const tableData = outputData.map(row => [
            row.quantity,
            row.component,
            row.weight,
            row.totalWeight,
        ]);

        doc.autoTable({
            head: [['Quantity', 'Component', 'Weight', 'Total Weight']],
            body: tableData,
            startY: 30,
        });

        doc.save(`${projectName}_output.pdf`);
    };

    return (
        <div>
            <h1>Excel Tool</h1>

            {/* Input Fields */}
            <div>
                <label>Table Name:</label>
                <input
                    type="text"
                    value={tableName}
                    onChange={e => setTableName(e.target.value)}
                />

                <label>Project Name:</label>
                <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                />
            </div>

            {/* Input Table */}
            <table>
                <thead>
                    <tr>
                        <th>Quantity</th>
                        <th>Component</th>
                        <th>Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {inputData.map((row, index) => (
                        <tr key={index}>
                            <td>
                                <input
                                    type="text"
                                    value={row.quantity}
                                    onChange={e => updateInput(index, 'quantity', e.target.value)}
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={row.component}
                                    onChange={e => updateInput(index, 'component', e.target.value)}
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={row.weight}
                                    onChange={e => updateInput(index, 'weight', e.target.value)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={addRow}>Add Row</button>

            {/* Action Buttons */}
            <div>
                <button onClick={generateTable}>Generate Table</button>
                <button onClick={resetFields}>Reset</button>
                <button onClick={exportToPDF}>Export to PDF</button>
            </div>

            {/* Output Table */}
            {outputData.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Quantity</th>
                            <th>Component</th>
                            <th>Weight</th>
                            <th>Total Weight</th>
                        </tr>
                    </thead>
                    <tbody>
                        {outputData.map((row, index) => (
                            <tr key={index}>
                                <td>{row.quantity}</td>
                                <td>{row.component}</td>
                                <td>{row.weight}</td>
                                <td>{row.totalWeight}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ExcelTool;
