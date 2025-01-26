import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface LogisticsEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
}

export const LogisticsEventDialog = ({
  open,
  onOpenChange,
  selectedDate,
}: LogisticsEventDialogProps) => {
  const [eventType, setEventType] = useState<'load' | 'unload'>('load');
  const [transportType, setTransportType] = useState<string>('trailer');
  const [time, setTime] = useState('09:00');
  const [loadingBay, setLoadingBay] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    try {
      const { error } = await supabase
        .from('logistics_events')
        .insert({
          event_type: eventType,
          transport_type: transportType,
          event_date: selectedDate,
          event_time: time,
          loading_bay: loadingBay || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logistics event created successfully",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Logistics Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(value: 'load' | 'unload') => setEventType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load">Load</SelectItem>
                <SelectItem value="unload">Unload</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transport Type</Label>
            <Select
              value={transportType}
              onValueChange={setTransportType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trailer">Trailer</SelectItem>
                <SelectItem value="9m">9m</SelectItem>
                <SelectItem value="8m">8m</SelectItem>
                <SelectItem value="6m">6m</SelectItem>
                <SelectItem value="4m">4m</SelectItem>
                <SelectItem value="furgoneta">Furgoneta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Loading Bay</Label>
            <Input
              value={loadingBay}
              onChange={(e) => setLoadingBay(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <Button type="submit" className="w-full">
            Create Event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};