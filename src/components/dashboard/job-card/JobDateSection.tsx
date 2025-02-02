import { format } from "date-fns";

interface JobDateSectionProps {
  startTime: string;
  endTime: string;
}

export const JobDateSection = ({ startTime, endTime }: JobDateSectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <span className="text-sm font-medium">Start:</span>
        <span className="text-sm ml-2">
          {format(new Date(startTime), "PPp")}
        </span>
      </div>
      <div>
        <span className="text-sm font-medium">End:</span>
        <span className="text-sm ml-2">
          {format(new Date(endTime), "PPp")}
        </span>
      </div>
    </div>
  );
};