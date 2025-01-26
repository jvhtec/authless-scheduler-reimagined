
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { LogisticsEventCard } from "./LogisticsEventCard";
import { LogisticsEventDialog } from "./LogisticsEventDialog";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const TodayLogistics = () => {
  const { toast } = useToast();
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const currentDate = startOfToday();
  const dateString = format(currentDate, 'yyyy-MM-dd');

  const { data: todayEvents, isLoading, isError } = useQuery({
    queryKey: ['today-logistics', dateString],
    queryFn: async () => {
      console.log('Fetching logistics events for:', dateString);
      
      const { data, error } = await supabase
        .from('logistics_events')
        .select(`
          *,
          job:jobs(title),
          departments:logistics_event_departments(department)
        `)
        .gte('event_date', `${dateString}T00:00:00`)
        .lte('event_date', `${dateString}T23:59:59`)
        .order('event_time', { ascending: true });

      if (error) {
        console.error('Error fetching logistics events:', error);
        toast({
          title: "Error",
          description: "Failed to load today's events",
          variant: "destructive",
        });
        throw error;
      }

      console.log('Fetched events:', data);
      return data;
    }
  });

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive text-sm">
            Error loading today's events. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule ({format(currentDate, 'MMM d')})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[100px] w-full rounded-md" />
            ))
          ) : todayEvents?.length ? (
            todayEvents.map((event) => (
              <LogisticsEventCard
                key={event.id}
                event={event}
                onClick={() => handleEventClick(event)}
              />
            ))
          ) : (
            <div className="text-muted-foreground text-center py-4">
              No events scheduled for today
            </div>
          )}
        </div>

        <LogisticsEventDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          selectedDate={currentDate}
          selectedEvent={selectedEvent}
        />
      </CardContent>
    </Card>
  );
};