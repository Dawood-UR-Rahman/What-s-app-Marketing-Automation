import { ChatList } from "@/components/ChatList";
import { MessageThread } from "@/components/MessageThread";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Messages() {
  const [activeConnection, setActiveConnection] = useState("user-123");
  const [activeChat, setActiveChat] = useState<string | null>("chat-1");

  const mockChats = [
    {
      id: "chat-1",
      name: "John Doe",
      phoneNumber: "+92 300 1234567",
      lastMessage: "Hey, how are you?",
      timestamp: "2m ago",
      unreadCount: 3,
    },
    {
      id: "chat-2",
      name: "Alice Smith",
      phoneNumber: "+92 301 9876543",
      lastMessage: "Thanks for your help!",
      timestamp: "1h ago",
    },
    {
      id: "chat-3",
      name: "Bob Johnson",
      phoneNumber: "+92 302 5555555",
      lastMessage: "See you tomorrow",
      timestamp: "Yesterday",
    },
    {
      id: "chat-4",
      name: "Sarah Wilson",
      phoneNumber: "+92 303 7777777",
      lastMessage: "Perfect, thanks!",
      timestamp: "2 days ago",
    },
  ];

  const mockMessages = [
    {
      id: "msg-1",
      content: "Hey, how are you?",
      timestamp: "10:30 AM",
      isSent: false,
    },
    {
      id: "msg-2",
      content: "I'm doing great! Thanks for asking.",
      timestamp: "10:31 AM",
      isSent: true,
      status: "delivered" as const,
    },
    {
      id: "msg-3",
      content: "That's wonderful to hear! Are we still on for tomorrow?",
      timestamp: "10:32 AM",
      isSent: false,
    },
    {
      id: "msg-4",
      content: "Yes, absolutely! Looking forward to it.",
      timestamp: "10:33 AM",
      isSent: true,
      status: "read" as const,
    },
    {
      id: "msg-5",
      content: "Great! What time works best for you?",
      timestamp: "10:34 AM",
      isSent: false,
    },
  ];

  const activeChatData = mockChats.find((chat) => chat.id === activeChat);

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">
            View and send messages from your connected accounts
          </p>
        </div>
        <div className="w-64">
          <Select value={activeConnection} onValueChange={setActiveConnection}>
            <SelectTrigger data-testid="select-connection">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user-123">user-123 (+92 300 1234567)</SelectItem>
              <SelectItem value="user-456">user-456 (+92 301 9876543)</SelectItem>
              <SelectItem value="user-789">user-789 (Disconnected)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80">
          <ChatList
            chats={mockChats}
            activeChat={activeChat || undefined}
            onChatSelect={setActiveChat}
          />
        </div>
        <div className="flex-1">
          {activeChatData ? (
            <MessageThread
              chatName={activeChatData.name}
              phoneNumber={activeChatData.phoneNumber}
              messages={mockMessages}
              onSendMessage={handleSendMessage}
              connectionStatus="connected"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
