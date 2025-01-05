import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Message } from "../types";
import { useToast } from "@/hooks/use-toast";

export const useMessagesQuery = (userRole: string | null, userDepartment: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'management') {
        query = query.eq('department', userDepartment);
      } else {
        query = query.eq('sender_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log("Messages fetched:", data);
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchMessages();

      // Subscribe to ALL changes on the messages table
      const channel = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            console.log("Messages table changed:", payload);
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        console.log("Cleaning up messages subscription");
        supabase.removeChannel(channel);
      };
    }
  }, [userRole, userDepartment]);

  return { messages, loading, setMessages };
};