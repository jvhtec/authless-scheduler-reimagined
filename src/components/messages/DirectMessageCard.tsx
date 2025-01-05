import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  status: 'read' | 'unread';
  created_at: string;
  sender: {
    first_name: string;
    last_name: string;
  };
  recipient: {
    first_name: string;
    last_name: string;
  };
}

interface DirectMessageCardProps {
  message: DirectMessage;
  currentUserId?: string;
  onDelete: (messageId: string) => void;
  onMarkAsRead: (messageId: string) => void;
}

export const DirectMessageCard = ({
  message,
  currentUserId,
  onDelete,
  onMarkAsRead
}: DirectMessageCardProps) => {
  const isRecipient = message.recipient_id === currentUserId;
  const showMarkAsRead = isRecipient && message.status === 'unread';

  return (
    <Card className={message.status === 'unread' ? 'border-primary' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-medium">
                {message.sender.first_name} {message.sender.last_name}
              </span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(message.created_at), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showMarkAsRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(message.id)}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Mark as Read</span>
              </Button>
            )}
            {message.sender_id === currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(message.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap">{message.content}</p>
      </CardContent>
    </Card>
  );
};