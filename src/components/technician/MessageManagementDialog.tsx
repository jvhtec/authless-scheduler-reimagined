import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SendMessage } from "@/components/messages/SendMessage";
import { MessagesList } from "@/components/messages/MessagesList";

interface MessageManagementDialogProps {
  department: string | null;
  trigger?: boolean;
}

export const MessageManagementDialog = ({ department, trigger = true }: MessageManagementDialogProps) => {
  const content = (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Messages</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {department && <SendMessage department={department} />}
        <MessagesList />
      </div>
    </DialogContent>
  );

  if (!trigger) {
    return content;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Message Management
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
};