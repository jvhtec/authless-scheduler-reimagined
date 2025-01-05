import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UsersList } from "@/components/users/UsersList";
import { useState } from "react";
import { MessagesList } from "@/components/messages/MessagesList";
import { SendMessage } from "@/components/messages/SendMessage";

const Settings = () => {
  const [createUserOpen, setCreateUserOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={() => setCreateUserOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersList />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SendMessage />
              <MessagesList />
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateUserDialog 
        open={createUserOpen} 
        onOpenChange={setCreateUserOpen} 
      />
    </div>
  );
};

export default Settings;