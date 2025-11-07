import { ChatListItem } from "./ChatListItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface Chat {
  id: string;
  name: string;
  phoneNumber: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
}

interface ChatListProps {
  chats: Chat[];
  activeChat?: string;
  onChatSelect: (chatId: string) => void;
}

export function ChatList({ chats, activeChat, onChatSelect }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.phoneNumber.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search chats..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-chats"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chatId={chat.id}
              name={chat.name}
              phoneNumber={chat.phoneNumber}
              lastMessage={chat.lastMessage}
              timestamp={chat.timestamp}
              unreadCount={chat.unreadCount}
              active={activeChat === chat.id}
              onClick={() => onChatSelect(chat.id)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No chats found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
