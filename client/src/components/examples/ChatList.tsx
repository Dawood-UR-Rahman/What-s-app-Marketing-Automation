import { ChatList } from "../ChatList";
import { useState } from "react";

export default function ChatListExample() {
  const [activeChat, setActiveChat] = useState("chat-1");

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
  ];

  return (
    <div className="h-[600px] max-w-md border rounded-lg overflow-hidden">
      <ChatList
        chats={mockChats}
        activeChat={activeChat}
        onChatSelect={setActiveChat}
      />
    </div>
  );
}
