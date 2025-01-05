import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DirectMessage } from "./types";
import { DirectMessageCard } from "./DirectMessageCard";

export const DirectMessagesList = () => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error getting current user:", error);
          return;
        }
        if (user) {
          console.log("Current user set:", user.id);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error("Error in getCurrentUser:", error);
      }
    };
    getCurrentUser();
  }, []);

  const fetchMessages = async () => {
    try {
      console.log("Fetching direct messages...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('direct_messages')
          .select(`
            *,
            sender:profiles!direct_messages_sender_id_fkey(first_name, last_name),
            recipient:profiles!direct_messages_recipient_id_fkey(first_name, last_name)
          `)
          .eq('sender_id', user.id)
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

  const handleMarkAsRead = async (messageId: string) => {
    try {
      console.log("Marking message as read:", messageId);
      const { error } = await supabase
        .from('direct_messages')
        .update({ status: 'read' })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message marked as read",
        description: "The message has been marked as read.",
      });

      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark the message as read. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchMessages();

      // Subscribe to ALL changes in direct_messages table that involve the current user
      const channel = supabase
        .channel('direct-messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
            filter: `recipient_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log("Direct message changes detected for recipient:", payload);
            // Show notification for new messages
            if (payload.eventType === 'INSERT') {
              toast({
                title: "New Message",
                description: "You have received a new message.",
              });
            }
            fetchMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
            filter: `sender_id=eq.${currentUserId}`,
          },
          (payload) => {
            console.log("Direct message changes detected for sender:", payload);
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        console.log("Cleaning up direct messages subscription");
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No direct messages.</p>
      ) : (
        messages.map((message) => (
          <DirectMessageCard
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onDelete={handleDeleteMessage}
            onMarkAsRead={handleMarkAsRead}
          />
        ))
      )}
    </div>
  );
};
