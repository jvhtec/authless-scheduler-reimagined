import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarSectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const CalendarSection = ({ date, onDateSelect }: CalendarSectionProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow p-2">
        <div className="h-full flex items-center justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateSelect}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};