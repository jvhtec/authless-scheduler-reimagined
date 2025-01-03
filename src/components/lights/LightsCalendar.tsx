import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LightsCalendarProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export const LightsCalendar = ({ date, onSelect }: LightsCalendarProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
};