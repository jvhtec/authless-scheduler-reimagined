import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { DirectMessage } from "./types";
import { DirectMessageCard } from "./DirectMessageCard";
import { useMessagesSubscription } from "./hooks/useMessagesSubscription";
import { useMessageOperations } from "./hooks/useMessageOperations";

export const DirectMessagesList = () => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const { toast } = useToast();
  const { handleDeleteMessage, handleMarkAsRead } = useMessageOperations(messages, setMessages, toast);

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

      const [receivedMessages, sentMessages] = await Promise.all([
        supabase
          .from('direct_messages')
          .select(`
            *,
            sender:profiles!direct_messages_sender_id_fkey(id, first_name, last_name),
            recipient:profiles!direct_messages_recipient_id_fkey(id, first_name, last_name)
          `)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('direct_messages')
          .select(`
            *,
            sender:profiles!direct_messages_sender_id_fkey(id, first_name, last_name),
            recipient:profiles!direct_messages_recipient_id_fkey(id, first_name, last_name)
          `)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (receivedMessages.error || sentMessages.error) {
        throw receivedMessages.error || sentMessages.error;
      }

      const allMessages = [...(receivedMessages.data || []), ...(sentMessages.data || [])];
      const uniqueMessages = Array.from(
        new Map(allMessages.map(message => [message.id, message])).values()
      );
      const sortedMessages = uniqueMessages.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log("All messages fetched:", sortedMessages);
      setMessages(sortedMessages);
    } catch (error) {
      console.error("Error in fetchMessages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useMessagesSubscription(currentUserId, fetchMessages);

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