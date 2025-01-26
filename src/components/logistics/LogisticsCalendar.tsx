import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, PackageCheck } from "lucide-react";
import { LogisticsEventDialog } from "./LogisticsEventDialog";

export const LogisticsCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['logistics-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_events')
        .select(`
          *,
          job:jobs(title),
          departments:logistics_event_departments(department)
        `);

      if (error) throw error;
      return data;
    }
  });

  const getDayEvents = (date: Date) => {
    return events?.filter(event => 
      format(new Date(event.event_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logistics Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          components={{
            DayContent: ({ date }) => {
              const dayEvents = getDayEvents(date);
              return (
                <div className="w-full h-full p-2">
                  <span className="text-sm">{format(date, 'd')}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents?.map((event) => (
                      <Badge 
                        key={event.id}
                        variant={event.event_type === 'load' ? 'default' : 'secondary'}
                        className="w-full flex items-center gap-1 text-xs"
                      >
                        {event.event_type === 'load' ? <Package className="h-3 w-3" /> : <PackageCheck className="h-3 w-3" />}
                        <Truck className="h-3 w-3" />
                        <span className="truncate">{event.job?.title}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            }
          }}
        />
        <LogisticsEventDialog 
          open={showEventDialog} 
          onOpenChange={setShowEventDialog}
          selectedDate={selectedDate}
        />
      </CardContent>
    </Card>
  );
};