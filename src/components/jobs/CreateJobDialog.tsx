import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Department } from "@/types/department";
import { JobType } from "@/types/job";
import { useState } from "react";
import { DateTimePicker } from "@/components/ui/date-time-picker";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location_id: z.string().min(1, "Location is required"),
  start_time: z.date(),
  end_time: z.date(),
  job_type: z.enum(["single", "tour", "festival","Dry Hire"] as const),
  departments: z.array(z.string()).min(1, "At least one department is required"),
});

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDepartment?: string;
}

export const CreateJobDialog = ({ open, onOpenChange, currentDepartment }: CreateJobDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location_id: "",
      start_time: new Date(),
      end_time: new Date(),
      job_type: "single" as JobType,
      departments: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // First create or get location
      const { data: locationData, error: locationError } = await supabase
        .from("locations")
        .insert([{ name: values.location_id }])
        .select()
        .single();

      if (locationError && locationError.code !== '23505') throw locationError;

      // If location already exists, get it
      let locationId = locationData?.id;
      if (locationError?.code === '23505') {
        const { data: existingLocation } = await supabase
          .from("locations")
          .select("id")
          .eq("name", values.location_id)
          .single();
        locationId = existingLocation?.id;
      }

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert([
          {
            title: values.title,
            description: values.description,
            location_id: locationId,
            start_time: values.start_time.toISOString(),
            end_time: values.end_time.toISOString(),
            job_type: values.job_type,
          },
        ])
        .select()
        .single();

      if (jobError) throw jobError;

      const departmentInserts = values.departments.map((department) => ({
        job_id: job.id,
        department,
      }));

      const { error: deptError } = await supabase
        .from("job_departments")
        .insert(departmentInserts);

      if (deptError) throw deptError;

      await queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast({
        title: "Success",
        description: "Job created successfully",
      });

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments: Department[] = ["sound", "lights", "video"];
  const selectedDepartments = watch("departments") || [];

  const toggleDepartment = (department: Department) => {
    const current = selectedDepartments;
    const updated = current.includes(department)
      ? current.filter((d) => d !== department)
      : [...current, department];
    setValue("departments", updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register("title")} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register("description")} />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...register("location_id")} placeholder="Enter location" />
              {errors.location_id && (
                <p className="text-sm text-destructive">
                  {errors.location_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Job Type</Label>
              <Select
                onValueChange={(value) => setValue("job_type", value as JobType)}
                defaultValue={watch("job_type")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="tour">Tour</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <DateTimePicker
                value={watch("start_time")}
                onChange={(date) => setValue("start_time", date)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <DateTimePicker
                value={watch("end_time")}
                onChange={(date) => setValue("end_time", date)}
              />
            </div>

            <div className="space-y-2">
              <Label>Departments</Label>
              <div className="flex gap-2">
                {departments.map((department) => (
                  <Button
                    key={department}
                    type="button"
                    variant={
                      selectedDepartments.includes(department)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleDepartment(department)}
                  >
                    {department}
                  </Button>
                ))}
              </div>
              {errors.departments && (
                <p className="text-sm text-destructive">
                  {errors.departments.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
