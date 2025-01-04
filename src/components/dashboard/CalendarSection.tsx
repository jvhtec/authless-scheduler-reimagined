import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarSectionProps {
  date: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const CalendarSection = ({ date, onDateSelect }: CalendarSectionProps) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          className="w-full rounded-md border"
        />
      </CardContent>
    </Card>
  );
};