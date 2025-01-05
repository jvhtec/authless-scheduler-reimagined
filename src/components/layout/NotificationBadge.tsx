import { useEffect, useState } from "react";
import { BellDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface NotificationBadgeProps {
  userId: string;
  userRole: string;
  userDepartment: string | null;
}

export const NotificationBadge = ({ userId, userRole, userDepartment }: NotificationBadgeProps) => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      console.log("Checking for unread messages...");
      
      // Check for unread department messages
      let deptQuery = supabase
        .from('messages')
        .select('*')
        .eq('status', 'unread');

      if (userRole === 'management') {
        deptQuery = deptQuery.eq('department', userDepartment);
      } else if (userRole === 'technician') {
        deptQuery = deptQuery.eq('sender_id', userId);
      }

      // Check for unread direct messages
      const directQuery = supabase
        .from('direct_messages')
        .select('*')
        .eq('recipient_id', userId)
        .eq('status', 'unread');

      const [deptMessages, directMessages] = await Promise.all([
        deptQuery,
        directQuery
      ]);

      if (deptMessages.error) {
        console.error('Error fetching department messages:', deptMessages.error);
        return;
      }

      if (directMessages.error) {
        console.error('Error fetching direct messages:', directMessages.error);
        return;
      }

      const hasUnread = deptMessages.data.length > 0 || directMessages.data.length > 0;
      console.log("Unread messages status:", {
        departmentMessages: deptMessages.data.length,
        directMessages: directMessages.data.length,
        hasUnread
      });
      
      setHasUnreadMessages(hasUnread);
    };

    fetchUnreadMessages();

    // Subscribe to changes in both messages and direct_messages tables
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          console.log("Messages table changed, checking unread status");
          fetchUnreadMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          console.log("Direct messages changed, checking unread status");
          fetchUnreadMessages();
        }
      )
      .subscribe((status) => {
        console.log("Messages notification subscription status:", status);
      });

    return () => {
      console.log("Cleaning up messages notification subscription");
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, userDepartment]);

  const handleMessageNotificationClick = () => {
    if (userRole === 'management') {
      navigate('/dashboard?showMessages=true');
    } else if (userRole === 'technician') {
      navigate('/technician-dashboard?showMessages=true');
    }
  };

  if (!hasUnreadMessages) return null;

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2 text-yellow-500"
      onClick={handleMessageNotificationClick}
    >
      <BellDot className="h-4 w-4" />
      <span>New Messages</span>
    </Button>
  );
};