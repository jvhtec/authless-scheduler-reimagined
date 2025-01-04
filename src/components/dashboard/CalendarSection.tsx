import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { JobWithAssignment } from "@/types/job";
import { useState } from "react";

interface CalendarSectionProps {
  jobs: JobWithAssignment[];
  onDateSelect?: (date: Date | undefined) => void;
}

export const CalendarSection = ({ jobs, onDateSelect }: CalendarSectionProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow p-2">
        <div className="h-full flex items-center justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};