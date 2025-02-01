import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface JobTableRow {
  id: string;
  dates: string[];
}

const ArtistTable = ({ jobId }: { jobId: string }) => {
  const [jobDates, setJobDates] = useState<JobTableRow[]>([]);
  const { toast } = useToast();

  const fetchJobDates = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("dates")
        .eq("id", jobId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching job dates:", error);
      return null;
    }
  };

  useEffect(() => {
    const getJobDates = async () => {
      const data = await fetchJobDates();
      if (data) {
        setJobDates(data.dates);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch job dates.",
          variant: "destructive",
        });
      }
    };

    getJobDates();
  }, [jobId, toast]);

  return (
    <Table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Dates</th>
        </tr>
      </thead>
      <tbody>
        {jobDates.map((job) => (
          <tr key={job.id}>
            <td>{job.id}</td>
            <td>{job.dates.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default ArtistTable;
