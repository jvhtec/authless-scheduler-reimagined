import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarSectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const CalendarSection = ({ date, onDateSelect }: CalendarSectionProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="h-full flex items-center justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateSelect}
            className="w-full rounded-md border"
          />
        </div>
      </CardContent>
    </Card>
  );
};