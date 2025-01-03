import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardHeaderProps {
  timeSpan: string;
  onTimeSpanChange: (value: string) => void;
}

export const DashboardHeader = ({ timeSpan, onTimeSpanChange }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Select value={timeSpan} onValueChange={onTimeSpanChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time span" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1week">Next Week</SelectItem>
          <SelectItem value="2weeks">Next 2 Weeks</SelectItem>
          <SelectItem value="1month">Next Month</SelectItem>
          <SelectItem value="3months">Next 3 Months</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};