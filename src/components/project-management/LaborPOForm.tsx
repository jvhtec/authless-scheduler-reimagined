import React, { useState } from 'react';
import { createLaborPO, addResourceLineItem, updateLineItemDates } from './apiService';
import { PlusCircle, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LaborPOForm: React.FC = () => {
  const departmentOptions = [
    { id: 'cdd5e372-d124-11e1-bba1-00e08175e43e', name: 'Sound Department' },
    { id: 'a89d124d-7a95-4384-943e-49f5c0f46b23', name: 'Video Department' },
    { id: 'd5af7892-d124-11e1-bba1-00e08175e43e', name: 'Lighting Department' },
  ];

  const jobRoleOptions = [
    { id: '2915a190-c515-11ea-a087-2a0a4490a7fb', name: 'Responsable de Sonido' },
    { id: 'f1224528-9038-486b-b1b8-a8085cb24651', name: 'Tecnico Especialista' },
  ];

  const availableWorkers = [
    { id: '18c0acc0-cc37-11eb-8106-f23c925290b3', name: 'Alvaro González Miranda' },
    { id: '842e1628-faa1-4f6b-a05e-8f44f00d2d26', name: 'Andrés Dellarrosa' },
  ];

  const [projectData, setProjectData] = useState({
    projectNumber: '',
    jobName: '',
    venue: '',
    plannedStartDate: '',
    plannedEndDate: '',
  });

  const [workers, setWorkers] = useState([
    {
      id: 1,
      name: '',
      departmentId: '',
      resourceId: '',
      shifts: [
        {
          id: 1,
          date: '',
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const parentElementId = '1253bbbd-d9d2-4afa-ba34-3520562d5847'; // Example ID
      const vendorId = '18c0acc0-cc37-11eb-8106-f23c925290b3'; // Example vendor ID

      const laborPO = await createLaborPO({
        name: projectData.jobName,
        plannedStartDate: projectData.plannedStartDate,
        plannedEndDate: projectData.plannedEndDate,
        personResponsibleId: '4b618540-e700-11ea-97d0-2a0a4490a7fb',
        locationId: '2f49c62c-b139-11df-b8d5-00e08175e43e',
        vendorId,
        parentElementId,
      });

      for (const worker of workers) {
        const lineItem = await addResourceLineItem({
          documentId: laborPO.id,
          resourceId: worker.resourceId,
          resourceParentId: parentElementId,
          managedResourceLineItemType: 'service-offering',
          quantity: worker.shifts.length,
        });

        for (const shift of worker.shifts) {
          await updateLineItemDates({
            documentId: laborPO.id,
            lineItemId: lineItem.addedResourceLineIds[0],
            alternatePickupDate: shift.date,
            alternateReturnDate: shift.date,
          });
        }
      }

      alert('Labor PO and shifts successfully created and updated!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to complete submission.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Labor PO Creation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Details */}
            <div className="space-y-4">
              <label className="block text-sm font-medium mb-1">Project Number</label>
              <input
                type="text"
                value={projectData.projectNumber}
                onChange={(e) =>
                  setProjectData((prev) => ({ ...prev, projectNumber: e.target.value }))
                }
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Workers Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Workers</h3>
              <button
                type="button"
                onClick={() =>
                  setWorkers((prev) => [
                    ...prev,
                    {
                      id: prev.length + 1,
                      name: '',
                      departmentId: '',
                      resourceId: '',
                      shifts: [{ id: 1, date: '', startTime: '09:00', endTime: '17:00' }],
                    },
                  ])
                }
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
              >
                <PlusCircle className="w-5 h-5" />
                Add Worker
              </button>

              {workers.map((worker, index) => (
                <Card key={index}>
                  <CardContent>
                    <div className="flex flex-col space-y-2">
                      <select
                        value={worker.name}
                        onChange={(e) =>
                          setWorkers((prev) =>
                            prev.map((w) =>
                              w.id === worker.id ? { ...w, name: e.target.value } : w
                            )
                          )
                        }
                      >
                        <option value="">Select Worker</option>
                        {availableWorkers.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded">
              Submit
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaborPOForm;
