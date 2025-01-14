import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Tour {
  id: string;
  name: string;
}

export interface TourDate {
  id: string;
  tour: Tour | null;
}

export interface JobSelection {
  id: string;
  title: string;
  tour_date_id: string | null;
  tour_date: TourDate | null;
  job_departments?: { department: string }[];
}

export const useJobSelection = () => {
  return useQuery({
    queryKey: ["jobs-for-selection"],
    queryFn: async () => {
      console.log("Fetching jobs for selection...");
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          tour_date_id,
          tour_date:tour_dates (
            id,
            tour:tours (
              id,
              name
            )
          )
        `)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching jobs:", error);
        throw error;
      }

      console.log("Raw jobs data:", jobs);

      // Transform the data to match our expected types
      const transformedJobs = jobs?.map(job => {
        const tourDate = job.tour_date as TourDate | null;
        return {
          id: job.id,
          title: job.title,
          tour_date_id: job.tour_date_id,
          tour_date: tourDate ? {
            id: tourDate.id,
            tour: tourDate.tour
          } : null
        };
      }) as JobSelection[];

      console.log("Transformed jobs:", transformedJobs);
      return transformedJobs;
    },
  });
};