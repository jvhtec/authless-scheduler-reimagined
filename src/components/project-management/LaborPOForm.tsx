import React, { useState } from 'react';
import { PlusCircle, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createLaborPO, addResourceLineItem, updateLineItemDates } from './apiService';

const LaborPOForm = () => {
  // Hardcoded mappings for departments and resources (job roles)
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

  const [workers, setWorkers] = useState([{
    id: 1,
    name: '',
    departmentId: '',
    resourceId: '',
    shifts: [{
      id: 1,
      date: '',
      startTime: '09:00',
      endTime: '17:00'
    }]
  }]);

  const handleProjectSearch = () => {
    // Simulate API call to get project data
    const mockProjectData = {
      jobName: `${projectData.projectNumber} HR`,
      venue: 'Main Venue',
      plannedStartDate: '2025-01-20',
      plannedEndDate: '2025-01-25'
    };
    setProjectData(prev => ({ ...prev, ...mockProjectData }));
  };

  const addWorker = () => {
    setWorkers(prev => [...prev, {
      id: prev.length + 1,
      name: '',
      departmentId: '',
      resourceId: '',
      shifts: [{
        id: 1,
        date: '',
        startTime: '09:00',
        endTime: '17:00'
      }]
    }]);
  };

  const removeWorker = (workerId: number) => {
    setWorkers(prev => prev.filter(w => w.id !== workerId));
  };

  const addShift = (workerId: number) => {
    setWorkers(prev => prev.map(worker => {
      if (worker.id === workerId) {
        return {
          ...worker,
          shifts: [...worker.shifts, {
            id: worker.shifts.length + 1,
            date: '',
            startTime: '09:00',
            endTime: '17:00'
          }]
        };
      }
      return worker;
    }));
  };

  const removeShift = (workerId: number, shiftId: number) => {
    setWorkers(prev => prev.map(worker => {
      if (worker.id === workerId) {
        return {
          ...worker,
          shifts: worker.shifts.filter(shift => shift.id !== shiftId)
        };
      }
      return worker;
    }));
  };

  const updateWorker = (workerId: number, field: string, value: string) => {
    setWorkers(prev => prev.map(worker => 
      worker.id === workerId ? { ...worker, [field]: value } : worker
    ));
  };

  const updateShift = (workerId: number, shiftId: number, field: string, value: string) => {
    setWorkers(prev => prev.map(worker => {
      if (worker.id === workerId) {
        return {
          ...worker,
          shifts: worker.shifts.map(shift => 
            shift.id === shiftId ? { ...shift, [field]: value } : shift
          )
        };
      }
      return worker;
    }));
  };

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

      alert('Labor PO and shifts successfully created!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create Labor PO.');
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
            {/* Project Details Section */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Project Number</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={projectData.projectNumber}
                      onChange={(e) => setProjectData(prev => ({ ...prev, projectNumber: e.target.value }))}
                    />
                    <Button
                      type="button"
                      onClick={handleProjectSearch}
                    >
                      Search
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <Label>Job Name</Label>
                  <Input
                    type="text"
                    value={projectData.jobName}
                    readOnly
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Venue</Label>
                  <Input
                    type="text"
                    value={projectData.venue}
                    readOnly
                  />
                </div>
                <div className="flex-1">
                  <Label>Planned Start Date</Label>
                  <Input
                    type="date"
                    value={projectData.plannedStartDate}
                    readOnly
                  />
                </div>
                <div className="flex-1">
                  <Label>Planned End Date</Label>
                  <Input
                    type="date"
                    value={projectData.plannedEndDate}
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Workers Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Workers</h3>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addWorker}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  Add Worker
                </Button>
              </div>

              {workers.map((worker) => (
                <Card key={worker.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Worker {worker.id}</h4>
                      {workers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeWorker(worker.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Worker Name</Label>
                        <select
                          className="w-full p-2 border rounded"
                          value={worker.name}
                          onChange={(e) => updateWorker(worker.id, 'name', e.target.value)}
                        >
                          <option value="">Select Worker</option>
                          {availableWorkers.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Department</Label>
                        <select
                          className="w-full p-2 border rounded"
                          value={worker.departmentId}
                          onChange={(e) => updateWorker(worker.id, 'departmentId', e.target.value)}
                        >
                          <option value="">Select Department</option>
                          {departmentOptions.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Job Role</Label>
                        <select
                          className="w-full p-2 border rounded"
                          value={worker.resourceId}
                          onChange={(e) => updateWorker(worker.id, 'resourceId', e.target.value)}
                        >
                          <option value="">Select Job Role</option>
                          {jobRoleOptions.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Shifts Section */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium">Shifts</h5>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => addShift(worker.id)}
                          className="flex items-center gap-1 text-sm"
                        >
                          <Clock className="w-4 h-4" />
                          Add Shift
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {worker.shifts.map((shift) => (
                          <div key={shift.id} className="flex gap-2 items-center bg-muted p-2 rounded">
                            <div className="flex-1">
                              <Input
                                type="date"
                                value={shift.date}
                                onChange={(e) => updateShift(worker.id, shift.id, 'date', e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                type="time"
                                value={shift.startTime}
                                onChange={(e) => updateShift(worker.id, shift.id, 'startTime', e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                type="time"
                                value={shift.endTime}
                                onChange={(e) => updateShift(worker.id, shift.id, 'endTime', e.target.value)}
                              />
                            </div>
                            {worker.shifts.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => removeShift(worker.id, shift.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="submit" className="w-full">
              Create Labor PO
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaborPOForm;