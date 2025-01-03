import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface TourChipsProps {
  onTourClick: (tourId: string) => void;
}

export const TourChips = ({ onTourClick }: TourChipsProps) => {
  const { data: tours, isLoading } = useQuery({
    queryKey: ["tours", new Date().getFullYear()],
    queryFn: async () => {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const endOfYear = new Date(new Date().getFullYear(), 11, 31).toISOString();
      
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          start_time,
          end_time
        `)
        .eq('job_type', 'tour')
        .gte('start_time', startOfYear)
        .lte('end_time', endOfYear)
        .order('start_time');

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div>Loading tours...</div>;

  return (
    <div className="flex flex-wrap gap-2">
      {tours?.map((tour) => (
        <Button
          key={tour.id}
          variant="outline"
          size="sm"
          onClick={() => onTourClick(tour.id)}
          className="rounded-full"
        >
          {tour.title} ({format(new Date(tour.start_time), 'MMM yyyy')})
        </Button>
      ))}
    </div>
  );
};