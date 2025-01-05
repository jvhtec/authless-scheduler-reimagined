import { DirectMessage } from "../types";
import { supabase } from "@/lib/supabase";
import { Toast } from "@/hooks/use-toast";

export const useMessageOperations = (
  messages: DirectMessage[],
  setMessages: React.Dispatch<React.SetStateAction<DirectMessage[]>>,
  toast: Toast
) => {
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

  return { handleDeleteMessage, handleMarkAsRead };
};