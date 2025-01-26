import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Package, PackageCheck, Truck } from "lucide-react";

export const TodayLogistics = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayEvents, isLoading } = useQuery({
    queryKey: ['today-logistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_events')
        .select(`
          *,
          job:jobs(title),
          departments:logistics_event_departments(department)
        `)
        .eq('event_date', today);

      if (error) throw error;
      return data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {todayEvents?.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={event.event_type === 'load' ? 'default' : 'secondary'}>
                    {event.event_type === 'load' ? (
                      <Package className="h-4 w-4 mr-1" />
                    ) : (
                      <PackageCheck className="h-4 w-4 mr-1" />
                    )}
                    {event.event_type}
                  </Badge>
                  <Badge variant="outline">
                    <Truck className="h-4 w-4 mr-1" />
                    {event.transport_type}
                  </Badge>
                </div>
                <h3 className="font-medium mt-2">{event.job?.title}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  {format(new Date(`2000-01-01T${event.event_time}`), 'HH:mm')}
                </div>
                <div className="flex gap-2 mt-2">
                  {event.departments?.map((dept: any) => (
                    <Badge key={dept.department} variant="secondary">
                      {dept.department}
                    </Badge>
                  ))}
                </div>
                {event.loading_bay && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Loading Bay: {event.loading_bay}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};