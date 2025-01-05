import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
import { MessageReplyDialog } from "./MessageReplyDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  created_at: string;
  status: 'read' | 'unread';
  department: string;
  sender: {
    first_name: string;
    last_name: string;
  };
}

export const MessagesList = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        console.log("Fetching messages...");
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('department, role')
          .eq('id', userData.user.id)
          .single();

        if (profileError) throw profileError;

        setUserRole(profileData.role);
        console.log("User profile data:", profileData);

        const query = supabase
          .from('messages')
          .select(`
            *,
            sender:profiles(first_name, last_name)
          `)
          .order('created_at', { ascending: false });

        // If user is management, fetch messages from their department
        if (profileData.role === 'management' && profileData.department) {
          console.log("Fetching messages for department:", profileData.department);
          query.eq('department', profileData.department);
          
          // Mark unread messages as read for management users
          const { error: updateError } = await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('department', profileData.department)
            .eq('status', 'unread');

          if (updateError) {
            console.error("Error updating message status:", updateError);
          }
        } else {
          // If user is technician, fetch only their messages
          console.log("Fetching messages for technician:", userData.user.id);
          query.eq('sender_id', userData.user.id);
          
          // Mark unread messages as read for technician
          const { error: updateError } = await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('sender_id', userData.user.id)
            .eq('status', 'unread');

          if (updateError) {
            console.error("Error updating message status:", updateError);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        console.log("Fetched messages:", data);
        setMessages(data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          console.log("Message changes detected, refreshing...");
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message deleted",
        description: "The message has been successfully deleted.",
      });

      // Update local state to remove the deleted message
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No messages found.</p>
      ) : (
        messages.map((message) => (
          <Card key={message.id} className={message.status === 'unread' ? 'border-blue-500' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {message.sender.first_name} {message.sender.last_name}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(message.created_at), 'PPp')}
                </span>
              </div>
              <p className="mt-2">{message.content}</p>
              <div className="mt-4 flex justify-end gap-2">
                {(userRole === 'admin' || userRole === 'management') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMessage(message.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMessage(message)}
                >
                  Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <MessageReplyDialog
        message={selectedMessage}
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      />
    </div>
  );
};