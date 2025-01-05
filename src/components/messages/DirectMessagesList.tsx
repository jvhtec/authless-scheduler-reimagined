import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  status: 'read' | 'unread';
  sender: {
    first_name: string;
    last_name: string;
  };
  recipient: {
    first_name: string;
    last_name: string;
  };
  sender_id: string;
}

export const DirectMessagesList = () => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      console.log("Fetching direct messages...");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log("No authenticated user found");
        return;
      }

      // Fetch both sent and received messages
      const [receivedMessages, sentMessages] = await Promise.all([
        supabase
          .from('direct_messages')
          .select(`
            *,
            sender:profiles!direct_messages_sender_id_fkey(first_name, last_name),
            recipient:profiles!direct_messages_recipient_id_fkey(first_name, last_name)
          `)
          .eq('recipient_id', userData.user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('direct_messages')
          .select(`
            *,
            sender:profiles!direct_messages_sender_id_fkey(first_name, last_name),
            recipient:profiles!direct_messages_recipient_id_fkey(first_name, last_name)
          `)
          .eq('sender_id', userData.user.id)
          .order('created_at', { ascending: false })
      ]);

      if (receivedMessages.error) {
        console.error("Error fetching received messages:", receivedMessages.error);
        throw receivedMessages.error;
      }

      if (sentMessages.error) {
        console.error("Error fetching sent messages:", sentMessages.error);
        throw sentMessages.error;
      }

      // Combine and sort messages
      const allMessages = [...(receivedMessages.data || []), ...(sentMessages.data || [])];
      const uniqueMessages = Array.from(
        new Map(allMessages.map(message => [message.id, message])).values()
      );
      const sortedMessages = uniqueMessages.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log("All messages fetched:", sortedMessages);
      setMessages(sortedMessages);

      // Mark unread received messages as read
      const unreadMessages = receivedMessages.data?.filter(msg => msg.status === 'unread') || [];
      if (unreadMessages.length > 0) {
        const { error: updateError } = await supabase
          .from('direct_messages')
          .update({ status: 'read' })
          .in('id', unreadMessages.map(msg => msg.id));

        if (updateError) {
          console.error("Error marking messages as read:", updateError);
        }
      }
    } catch (error) {
      console.error("Error in fetchMessages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log("Deleting message:", messageId);
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message deleted",
        description: "The message has been successfully deleted.",
      });

      // Update local state to remove the deleted message
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates for both sent and received messages
    const channel = supabase
      .channel('direct-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages'
        },
        () => {
          console.log("Direct message changes detected, refreshing...");
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up direct messages subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No direct messages.</p>
      ) : (
        messages.map((message) => (
          <Card key={message.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {message.sender.first_name} {message.sender.last_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      to {message.recipient.first_name} {message.recipient.last_name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(message.created_at), 'PPp')}
                  </span>
                  {message.sender_id === supabase.auth.getUser().data.user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMessage(message.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-2">{message.content}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};