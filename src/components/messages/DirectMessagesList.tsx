import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface DirectMessage {
  id: string;
  content: string;
  created_at: string;
  status: 'read' | 'unread';
  sender: {
    first_name: string;
    last_name: string;
  };
}

export const DirectMessagesList = () => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      console.log("Fetching direct messages...");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log("No authenticated user found");
        return;
      }

      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(first_name, last_name)
        `)
        .eq('recipient_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching direct messages:", error);
        throw error;
      }

      console.log("Fetched direct messages:", data);
      setMessages(data || []);

      // Mark unread messages as read
      const unreadMessages = data?.filter(msg => msg.status === 'unread') || [];
      if (unreadMessages.length > 0) {
        const { error: updateError } = await supabase
          .from('direct_messages')
          .update({ status: 'read' })
          .eq('recipient_id', userData.user.id)
          .eq('status', 'unread');

        if (updateError) {
          console.error("Error updating message status:", updateError);
        }
      }
    } catch (error) {
      console.error("Error in fetchMessages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('direct-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages'
        },
        (payload) => {
          console.log("Direct message changes detected:", payload);
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};