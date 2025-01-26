import React, { useState, useEffect } from 'react';
import { Truck, Calendar, Edit, Plus } from 'lucide-react';

// Basic UI Components
const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  className = '',
  ...props 
}) => {
  const variants = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    outline: 'border border-gray-300 hover:bg-gray-100'
  };

  return (
    <button 
      className={`px-4 py-2 rounded ${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`border rounded-lg shadow-sm p-4 ${className}`}>{children}</div>
);

const LogisticsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [todayJobs, setTodayJobs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);

  const departments = ['Sound', 'Lights', 'Video'];

  useEffect(() => {
    const fetchJobs = async () => {
      const fetchedJobs = [
        {
          id: '1',
          courier: 'FastTrack Logistics',
          transportType: 'Truck',
          licensePlate: 'ABC-1234',
          loadTime: new Date().toISOString(),
          loadUnloadSelection: 'Unload',
          loadingBay: 'Bay 1',
          departments: ['Sound', 'Lights']
        },
        {
          id: '2',
          courier: 'QuickDeliver',
          transportType: 'Van',
          licensePlate: 'XYZ-5678',
          loadTime: new Date().toISOString(),
          loadUnloadSelection: 'Load',
          loadingBay: 'Bay 2',
          departments: ['Video']
        }
      ];

      setJobs(fetchedJobs);
      
      const today = new Date();
      const todaysJobs = fetchedJobs.filter(job => {
        const jobDate = new Date(job.loadTime);
        return jobDate.toDateString() === today.toDateString();
      });

      setTodayJobs(todaysJobs);
    };

    fetchJobs();
  }, []);

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setIsEditModalOpen(true);
  };

  const handleUpdateJob = (updatedJob) => {
    setJobs(jobs.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ));
    setIsEditModalOpen(false);
  };

  const handleAssignDepartments = (job) => {
    setSelectedJob(job);
    setIsDepartmentModalOpen(true);
  };

  const toggleDepartment = (department) => {
    setSelectedJob(prevJob => ({
      ...prevJob,
      departments: prevJob.departments.includes(department)
        ? prevJob.departments.filter(d => d !== department)
        : [...prevJob.departments, department]
    }));
  };

  const saveDepartmentAssignments = () => {
    setJobs(jobs.map(job => 
      job.id === selectedJob.id ? selectedJob : job
    ));
    setIsDepartmentModalOpen(false);
  };

  const renderDepartmentModal = () => {
    if (!selectedJob) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg w-96">
          <h2 className="text-xl font-bold mb-4">Assign Departments</h2>
          <div className="space-y-4">
            {departments.map(department => (
              <div 
                key={department} 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => toggleDepartment(department)}
              >
                <input 
                  type="checkbox"
                  checked={selectedJob.departments.includes(department)}
                  readOnly
                  className="form-checkbox"
                />
                <span>{department}</span>
              </div>
            ))}
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDepartmentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveDepartmentAssignments}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!selectedJob) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg w-96">
          <h2 className="text-xl font-bold mb-4">Edit Logistics Details</h2>
          <div className="space-y-4">
            <input 
              placeholder="Courier"
              defaultValue={selectedJob.courier}
              className="w-full border p-2 rounded"
            />
            <input 
              placeholder="Transport Type"
              defaultValue={selectedJob.transportType}
              className="w-full border p-2 rounded"
            />
            <input 
              placeholder="License Plate"
              defaultValue={selectedJob.licensePlate}
              className="w-full border p-2 rounded"
            />
            <input 
              type="datetime-local"
              defaultValue={selectedJob.loadTime}
              className="w-full border p-2 rounded"
            />
            <select 
              defaultValue={selectedJob.loadUnloadSelection}
              className="w-full border p-2 rounded"
            >
              <option>Load</option>
              <option>Unload</option>
            </select>
            <select 
              defaultValue={selectedJob.loadingBay}
              className="w-full border p-2 rounded"
            >
              <option>Bay 1</option>
              <option>Bay 2</option>
            </select>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => handleUpdateJob(selectedJob)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Logistics Management</h1>
        <div className="space-x-2">
          <Button>
            <Plus className="mr-2" /> Create Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Calendar className="mr-2" /> Job Calendar
            </h2>
            <div className="border rounded p-4 text-center">
              Calendar Placeholder
            </div>
          </div>
        </Card>

        <Card>
          <div>
            <h2 className="text-xl font-semibold mb-4">Today's Schedule</h2>
            <div className="space-y-2">
              {todayJobs.map(job => (
                <div 
                  key={job.id} 
                  className="border p-2 rounded flex justify-between items-center"
                >
                  <span>{job.courier}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditJob(job)}
                  >
                    <Edit size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Truck className="mr-2" /> Logistics Jobs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Courier</th>
                  <th className="p-2 text-left">Transport Type</th>
                  <th className="p-2 text-left">License Plate</th>
                  <th className="p-2 text-left">Load Time</th>
                  <th className="p-2 text-left">Load/Unload</th>
                  <th className="p-2 text-left">Loading Bay</th>
                  <th className="p-2 text-left">Departments</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b">
                    <td className="p-2">{job.courier}</td>
                    <td className="p-2">{job.transportType}</td>
                    <td className="p-2">{job.licensePlate}</td>
                    <td className="p-2">{new Date(job.loadTime).toLocaleString()}</td>
                    <td className="p-2">{job.loadUnloadSelection}</td>
                    <td className="p-2">{job.loadingBay}</td>
                    <td className="p-2">
                      {job.departments.length > 0 
                        ? job.departments.join(', ') 
                        : 'No departments'}
                    </td>
                    <td className="p-2 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditJob(job)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAssignDepartments(job)}
                      >
                        Assign Dept
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {isEditModalOpen && renderEditModal()}
      {isDepartmentModalOpen && renderDepartmentModal()}
    </div>
  );
};

export default LogisticsPage;