import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export const ReportGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    date: "",
    venue: "",
    details: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-sv-report', {
        body: formData
      });

      if (error) throw error;

      // Handle successful report generation
      toast({
        title: "Report Generated",
        description: "Your SV report has been generated successfully.",
      });

      // Reset form
      setFormData({
        eventName: "",
        date: "",
        venue: "",
        details: ""
      });

    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={formData.eventName}
              onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="details">Additional Details</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isGenerating}
        >
          {isGenerating ? "Generating Report..." : "Generate SV Report"}
        </Button>
      </form>
    </Card>
  );
};