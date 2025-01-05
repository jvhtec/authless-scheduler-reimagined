import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '../types';

export const useMessagesSubscription = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  userRole: string | null,
  userDepartment: string | null
) => {
  useEffect(() => {
    if (!userRole) return;

    console.log('Setting up messages subscription for role:', userRole, 'department:', userDepartment);

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('Received message change:', payload);

          // Fetch the complete message data including sender information
          const { data: updatedMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey (
                id,
                first_name,
                last_name
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!updatedMessage) return;

          setMessages(prevMessages => {
            switch (payload.eventType) {
              case 'INSERT':
                return [updatedMessage, ...prevMessages];
              case 'UPDATE':
                return prevMessages.map(msg => 
                  msg.id === updatedMessage.id ? updatedMessage : msg
                );
              case 'DELETE':
                return prevMessages.filter(msg => msg.id !== payload.old.id);
              default:
                return prevMessages;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('Messages subscription status:', status);
      });

    return () => {
      console.log('Cleaning up messages subscription');
      supabase.removeChannel(channel);
    };
  }, [userRole, userDepartment, setMessages]);
};