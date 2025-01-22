import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile } from "@/components/users/types";
import { Department } from "@/types/department";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ManageMilestonesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageMilestonesDialog = ({ open, onOpenChange }: ManageMilestonesDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: definitions } = useQuery({
    queryKey: ["milestone-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestone_definitions")
        .select("*")
        .order("priority", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (milestone: Omit<any, 'id'>) => {
      const { data, error } = await supabase
        .from("milestone_definitions")
        .insert(milestone)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestone-definitions"] });
      toast({
        title: "Success",
        description: "Milestone definition created successfully",
      });
      setIsEditing(false);
      setEditingMilestone(null);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (milestone: any) => {
      const { data, error } = await supabase
        .from("milestone_definitions")
        .update(milestone)
        .eq("id", milestone.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestone-definitions"] });
      toast({
        title: "Success",
        description: "Milestone definition updated successfully",
      });
      setIsEditing(false);
      setEditingMilestone(null);
    },
  });

  // Delete mutation with cascade
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related job_milestones
      const { error: jobMilestonesError } = await supabase
        .from("job_milestones")
        .delete()
        .eq("definition_id", id);

      if (jobMilestonesError) throw jobMilestonesError;

      // Then delete the milestone definition
      const { error } = await supabase
        .from("milestone_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestone-definitions"] });
      toast({
        title: "Success",
        description: "Milestone definition deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting milestone:", error);
      toast({
        title: "Error",
        description: "Failed to delete milestone definition",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!editingMilestone) return;

    if (editingMilestone.id) {
      updateMutation.mutate(editingMilestone);
    } else {
      const { id, ...newMilestone } = editingMilestone;
      createMutation.mutate(newMilestone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Manage Milestone Definitions</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-6">
            <Button
              onClick={() => {
                setEditingMilestone({
                  id: '',
                  name: '',
                  default_offset: 0,
                  department: null,
                  category: 'planning',
                  priority: 1,
                  description: '',
                });
                setIsEditing(true);
              }}
              className="mb-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Milestone
            </Button>

            {isEditing && editingMilestone && (
              <div className="space-y-4 p-4 border rounded-lg">
                <Input
                  placeholder="Milestone name"
                  value={editingMilestone.name}
                  onChange={(e) =>
                    setEditingMilestone({ ...editingMilestone, name: e.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="Default offset (days)"
                  value={editingMilestone.default_offset}
                  onChange={(e) =>
                    setEditingMilestone({
                      ...editingMilestone,
                      default_offset: parseInt(e.target.value),
                    })
                  }
                />
                <Select
                  value={editingMilestone.department || "all"}
                  onValueChange={(value) =>
                    setEditingMilestone({
                      ...editingMilestone,
                      department: value === "all" ? null : value as Department,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="sound">Sound</SelectItem>
                    <SelectItem value="lights">Lights</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={editingMilestone.category}
                  onValueChange={(value: any) =>
                    setEditingMilestone({
                      ...editingMilestone,
                      category: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Priority"
                  value={editingMilestone.priority}
                  onChange={(e) =>
                    setEditingMilestone({
                      ...editingMilestone,
                      priority: parseInt(e.target.value),
                    })
                  }
                />
                <Input
                  placeholder="Description"
                  value={editingMilestone.description || ''}
                  onChange={(e) =>
                    setEditingMilestone({
                      ...editingMilestone,
                      description: e.target.value,
                    })
                  }
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingMilestone(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Offset Days</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {definitions?.map((definition) => (
                  <TableRow key={definition.id}>
                    <TableCell>{definition.name}</TableCell>
                    <TableCell>{definition.department || 'All'}</TableCell>
                    <TableCell>{definition.category}</TableCell>
                    <TableCell>{definition.default_offset}</TableCell>
                    <TableCell>{definition.priority}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingMilestone(definition);
                            setIsEditing(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(definition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};