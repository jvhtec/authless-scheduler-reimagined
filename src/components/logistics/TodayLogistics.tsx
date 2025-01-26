import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { LogisticsEventCard } from "./LogisticsEventCard";
import { LogisticsEventDialog } from "./LogisticsEventDialog";
import { useState } from "react";

interface TodayLogisticsProps {
  selectedDate: Date;
}

export const TodayLogistics = ({ selectedDate }: TodayLogisticsProps) => {
  const formattedDate = format(selectedDate || new Date(), 'yyyy-MM-dd');
  const { toast } = useToast();
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ['logistics-events', formattedDate],
    queryFn: async () => {
      console.log('Fetching logistics events for:', formattedDate);
      const { data, error } = await supabase
        .from('logistics_events')
        .select(`
          *,
          job:jobs(title),
          departments:logistics_event_departments(department)
        `)
        .eq('event_date', formattedDate);

      if (error) {
        console.error('Error fetching logistics events:', error);
        toast({
          title: "Error",
          description: "Failed to load events",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule for {format(selectedDate, 'MMM dd, yyyy')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events?.map((event) => (
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
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
        />
      </CardContent>
    </Card>
  );
};