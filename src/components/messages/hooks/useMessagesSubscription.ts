import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const useMessagesSubscription = (
  currentUserId: string | undefined,
  fetchMessages: () => Promise<void>
) => {
  useEffect(() => {
    if (!currentUserId) return;

    console.log("Setting up direct messages subscription for user:", currentUserId);
    
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
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      console.log("Cleaning up direct messages subscription");
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchMessages]);
};