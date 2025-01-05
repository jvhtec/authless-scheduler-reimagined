import { format } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DirectMessage } from "./types";

interface DirectMessageCardProps {
  message: DirectMessage;
  currentUserId: string | undefined;
  onDelete: (messageId: string) => void;
}

export const DirectMessageCard = ({ 
  message, 
  currentUserId,
  onDelete 
}: DirectMessageCardProps) => {
  return (
    <Card key={message.id}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">
                {message.sender.first_name} {message.sender.last_name}
              </span>
              <span className="text-sm text-muted-foreground">
                to {message.recipient.first_name} {message.recipient.last_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {format(new Date(message.created_at), 'PPp')}
            </span>
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
        <p className="mt-2">{message.content}</p>
      </CardContent>
    </Card>
  );
};