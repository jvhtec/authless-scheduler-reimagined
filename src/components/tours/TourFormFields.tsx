import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimplifiedJobColorPicker } from "@/components/jobs/SimplifiedJobColorPicker";
import { TourDateForm } from "./TourDateForm";
import { TourDepartmentSelector } from "./TourDepartmentSelector";
import { Department } from "@/types/department";
import { DatePicker } from "@/components/ui/date-picker";

interface TourFormFieldsProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  dates: { date: string; location: string }[];
  onDateChange: (index: number, field: "date" | "location", value: string) => void;
  onAddDate: () => void;
  onRemoveDate: (index: number) => void;
  color: string;
  setColor: (color: string) => void;
  departments: Department[];
  availableDepartments: Department[];
  currentDepartment: Department;
  onDepartmentChange: (dept: Department, checked: boolean) => void;
  locations?: { name: string }[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export const TourFormFields = ({
  title,
  setTitle,
  description,
  setDescription,
  dates,
  onDateChange,
  onAddDate,
  onRemoveDate,
  color,
  setColor,
  departments,
  availableDepartments,
  currentDepartment,
  onDepartmentChange,
  locations,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: TourFormFieldsProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tour Start Date</Label>
          <DatePicker
            date={startDate}
            onChange={onStartDateChange}
          />
        </div>
        <div className="space-y-2">
          <Label>Tour End Date</Label>
          <DatePicker
            date={endDate}
            onChange={onEndDateChange}
            fromDate={startDate}
          />
        </div>
      </div>

      <TourDateForm
        dates={dates}
        onDateChange={onDateChange}
        onAddDate={onAddDate}
        onRemoveDate={onRemoveDate}
        locations={locations}
      />

      <TourDepartmentSelector
        departments={departments}
        availableDepartments={availableDepartments}
        currentDepartment={currentDepartment}
        onDepartmentChange={onDepartmentChange}
      />

      <SimplifiedJobColorPicker color={color} onChange={setColor} />
    </div>
  );
};