import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { MessageCard } from "./MessageCard";
import { useMessagesQuery } from "./hooks/useMessagesQuery";
import { useMessageOperations } from "./hooks/useMessageOperations";

export const MessagesList = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, department')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          setUserDepartment(profile.department);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const { messages, loading, setMessages } = useMessagesQuery(userRole, userDepartment);
  const { handleDeleteMessage, handleMarkAsRead } = useMessageOperations(messages, setMessages, toast);

  if (loading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-muted-foreground">No messages in this department.</p>
      ) : (
        messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            currentUserId={userRole === 'management' ? message.sender_id : undefined}
            onDelete={handleDeleteMessage}
            onMarkAsRead={handleMarkAsRead}
            isManagement={userRole === 'management'}
          />
        ))
      )}
    </div>
  );
};