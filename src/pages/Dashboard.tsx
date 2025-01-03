import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface JobFormValues {
  title: string;
  date: Date;
  location: string;
  description: string;
  requirements: string;
}

interface TourFormValues {
  name: string;
  startDate: Date;
  endDate: Date;
  venues: string;
  notes: string;
}

const Dashboard = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const jobForm = useForm<JobFormValues>({
    defaultValues: {
      title: "",
      date: new Date(),
      location: "",
      description: "",
      requirements: "",
    },
  });

  const tourForm = useForm<TourFormValues>({
    defaultValues: {
      name: "",
      startDate: new Date(),
      endDate: new Date(),
      venues: "",
      notes: "",
    },
  });

  const onJobSubmit = (data: JobFormValues) => {
    console.log("Job form submitted:", data);
    // TODO: Handle job creation
  };

  const onTourSubmit = (data: TourFormValues) => {
    console.log("Tour form submitted:", data);
    // TODO: Handle tour creation
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Create Job</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Job</DialogTitle>
              </DialogHeader>
              <Form {...jobForm}>
                <form onSubmit={jobForm.handleSubmit(onJobSubmit)} className="space-y-4">
                  <FormField
                    control={jobForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={jobForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={jobForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter job description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={jobForm.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter job requirements" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Create Job</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Create Tour</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Tour</DialogTitle>
              </DialogHeader>
              <Form {...tourForm}>
                <form onSubmit={tourForm.handleSubmit(onTourSubmit)} className="space-y-4">
                  <FormField
                    control={tourForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter tour name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tourForm.control}
                    name="venues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venues</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter tour venues" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tourForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter tour notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Create Tour</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule for {date?.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Sign in to view and manage schedules
              </p>
              <div className="flex justify-center">
                <Button variant="outline">Create Schedule</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sound Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">3 upcoming events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lights Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">2 upcoming events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Video Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">1 upcoming event</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;