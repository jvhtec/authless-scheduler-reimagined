import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";

interface LightsCalendarProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export const LightsCalendar = ({ date, onSelect }: LightsCalendarProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow p-2">
        <div className="h-full flex items-center justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};