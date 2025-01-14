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
        const tourDateData = job.tour_date as any;
        return {
          id: job.id,
          title: job.title,
          tour_date_id: job.tour_date_id,
          tour_date: tourDateData ? {
            id: tourDateData.id,
            tour: tourDateData.tour ? {
              id: tourDateData.tour.id,
              name: tourDateData.tour.name
            } : null
          } : null
        };
      }) as JobSelection[];

      console.log("Transformed jobs:", transformedJobs);
      return transformedJobs;
    },
  });
};