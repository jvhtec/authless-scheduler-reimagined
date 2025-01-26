import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, PackageCheck } from "lucide-react";
import { LogisticsEventDialog } from "./LogisticsEventDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LogisticsEventCard } from "./LogisticsEventCard";

export const LogisticsCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery({
    queryKey: ['logistics-events'],
    queryFn: async () => {
      console.log('Fetching logistics events');
      const { data, error } = await supabase
        .from('logistics_events')
        .select(`
          *,
          job:jobs(title),
          departments:logistics_event_departments(department)
        `);

      if (error) {
        console.error('Error fetching logistics events:', error);
        toast({
          title: "Error",
          description: "Failed to load logistics events",
          variant: "destructive",
        });
        throw error;
      }
      
      console.log('Fetched logistics events:', data);
      return data;
    }
  });

  const getDayEvents = (date: Date) => {
    return events?.filter(event => 
      format(new Date(event.event_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setShowEventDialog(true);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Logistics Calendar</CardTitle>
        <Button onClick={handleAddEvent} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
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
                <div className="w-full h-full min-h-[100px] p-2">
                  <span className="text-sm font-medium">
                    {format(date, 'd')}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents?.map((event) => (
                      <LogisticsEventCard
                        key={event.id}
                        event={event}
                        onClick={() => handleEventClick(event)}
                        compact
                      />
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
          selectedEvent={selectedEvent}
        />
      </CardContent>
    </Card>
  );
};