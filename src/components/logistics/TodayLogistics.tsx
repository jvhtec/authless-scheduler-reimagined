import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { LogisticsEventCard } from "./LogisticsEventCard";
import { LogisticsEventDialog } from "./LogisticsEventDialog";
import { useState } from "react";

export const TodayLogistics = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { toast } = useToast();
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: todayEvents, isLoading } = useQuery({
    queryKey: ['today-logistics'],
    queryFn: async () => {
      console.log('Fetching today\'s logistics events for:', today);
      const { data, error } = await supabase
        .from('logistics_events')
        .select(`
          *,
          job:jobs(title),
          departments:logistics_event_departments(department)
        `)
        .eq('event_date', today);

      if (error) {
        console.error('Error fetching today\'s logistics events:', error);
        toast({
          title: "Error",
          description: "Failed to load today's events",
          variant: "destructive",
        });
        throw error;
      }

      console.log('Fetched today\'s events:', data);
      return data;
    }
  });

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {todayEvents?.map((event) => (
            <LogisticsEventCard
              key={event.id}
              event={event}
              onClick={() => handleEventClick(event)}
            />
          ))}
        </div>
        <LogisticsEventDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          selectedDate={new Date()}
          selectedEvent={selectedEvent}
        />
      </CardContent>
    </Card>
  );
};