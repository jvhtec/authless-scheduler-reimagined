import { supabase } from "@/lib/supabase";
import { Department } from "@/types/department";
import { useLocationManagement } from "@/hooks/useLocationManagement";

interface TourCreationData {
  title: string;
  description: string;
  dates: { date: string; location: string }[];
  color: string;
  departments: Department[];
  startDate?: string;
  endDate?: string;
}

export const useTourCreationMutation = () => {
  const { getOrCreateLocation } = useLocationManagement();

  const createTourWithDates = async ({
    title,
    description,
    dates,
    color,
    departments,
    startDate,
    endDate,
  }: TourCreationData) => {
    console.log("Starting tour creation process...");
    
    // Create the tour with optional start and end dates
    console.log("Creating main tour record...");
    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .insert({
        name: title,
        description,
        color,
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single();

    if (tourError) {
      console.error("Error creating tour:", tourError);
      throw tourError;
    }

    // Only process dates if there are any
    if (dates.length > 0) {
      const validDates = dates.filter(date => date.date);
      
      if (validDates.length > 0) {
        // Sort dates chronologically
        validDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Create the main tour job
        console.log("Creating main tour job...");
        const { data: mainTourJob, error: mainJobError } = await supabase
          .from("jobs")
          .insert({
            title,
            description,
            start_time: `${validDates[0].date}T00:00:00`,
            end_time: `${validDates[validDates.length - 1].date}T23:59:59`,
            job_type: "tour",
            color,
          })
          .select()
          .single();

        if (mainJobError) {
          console.error("Error creating main tour job:", mainJobError);
          throw mainJobError;
        }

        // Create department associations for main tour job
        console.log("Creating department associations for main tour job...");
        const mainJobDepartments = departments.map(department => ({
          job_id: mainTourJob.id,
          department
        }));

        const { error: mainDeptError } = await supabase
          .from("job_departments")
          .insert(mainJobDepartments);

        if (mainDeptError) {
          console.error("Error creating main job departments:", mainDeptError);
          throw mainDeptError;
        }

        // Process each tour date
        console.log("Processing tour dates...");
        for (const dateInfo of validDates) {
          try {
            // Get or create location
            console.log(`Processing location: ${dateInfo.location}`);
            let locationId = null;
            if (dateInfo.location) {
              locationId = await getOrCreateLocation(dateInfo.location);
            }
            
            // Create tour date entry
            console.log("Creating tour date entry...");
            const { data: tourDate, error: tourDateError } = await supabase
              .from("tour_dates")
              .insert({
                tour_id: tour.id,
                date: dateInfo.date,
                location_id: locationId
              })
              .select()
              .single();

            if (tourDateError) {
              console.error("Error creating tour date:", tourDateError);
              throw tourDateError;
            }

            // Create job for this tour date
            console.log("Creating job for tour date...");
            const { data: dateJob, error: dateJobError } = await supabase
              .from("jobs")
              .insert({
                title: `${title} (Tour Date)`,
                description,
                start_time: `${dateInfo.date}T00:00:00`,
                end_time: `${dateInfo.date}T23:59:59`,
                location_id: locationId,
                job_type: "single",
                tour_date_id: tourDate.id,
                color,
              })
              .select()
              .single();

            if (dateJobError) {
              console.error("Error creating date job:", dateJobError);
              throw dateJobError;
            }

            // Create department associations for this date's job
            console.log("Creating department associations for date job...");
            const dateDepartments = departments.map(department => ({
              job_id: dateJob.id,
              department
            }));

            const { error: dateDeptError } = await supabase
              .from("job_departments")
              .insert(dateDepartments);

            if (dateDeptError) {
              console.error("Error creating date job departments:", dateDeptError);
              throw dateDeptError;
            }
          } catch (error) {
            console.error("Error processing tour date:", error);
            throw error;
          }
        }
      }
    }

    return tour;
  };

  return {
    createTourWithDates,
  };
};