import { ChatList } from "@/components/ChatList";
import { MessageThread } from "@/components/MessageThread";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { connectionsApi, chatsApi, messagesApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Connection, Chat, Message } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { socketService } from "@/lib/socket";

export default function Messages() {
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats", activeConnection],
    enabled: !!activeConnection,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", activeConnection, activeChat],
    enabled: !!activeConnection && !!activeChat,
  });

  useEffect(() => {
    if (connections.length > 0 && !activeConnection) {
      const connectedConnection = connections.find((c) => c.status === "connected");
      if (connectedConnection) {
        setActiveConnection(connectedConnection.connectionId);
      } else if (connections[0]) {
        setActiveConnection(connections[0].connectionId);
      }
    }
  }, [connections, activeConnection]);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on("new-message", (data: { connectionId: string; chatId: string; message: any }) => {
      console.log("New message:", data);
      
      if (data.connectionId === activeConnection) {
        queryClient.invalidateQueries({ queryKey: ["/api/chats", activeConnection] });
        
        if (data.chatId === activeChat) {
          queryClient.invalidateQueries({ queryKey: ["/api/messages", activeConnection, activeChat] });
        }
      }
    });

    socket.on("message-sent", (data: { connectionId: string; chatId: string; clientMessageId?: string }) => {
      console.log("Message sent:", data);
      
      if (data.connectionId === activeConnection) {
        queryClient.invalidateQueries({ queryKey: ["/api/chats", activeConnection] });
        
        if (data.chatId === activeChat) {
          queryClient.invalidateQueries({ queryKey: ["/api/messages", activeConnection, activeChat] });
        }
      }
    });

    return () => {
      socket.off("new-message");
      socket.off("message-sent");
    };
  }, [activeConnection, activeChat, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: ({ to, message, imageUrl, productUrl }: { to: string; message: string; imageUrl?: string; productUrl?: string }) =>
      messagesApi.send(activeConnection!, to, message, undefined, imageUrl, imageUrl ? "image" : undefined, productUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", activeConnection, activeChat] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", activeConnection] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const activeChatData = chats.find((chat) => chat.chatId === activeChat);
  const activeConnectionData = connections.find((c) => c.connectionId === activeConnection);

  const handleSendMessage = (message: string, imageUrl?: string, productUrl?: string) => {
    if (!activeChat || !activeConnection) return;
    
    sendMessageMutation.mutate({ to: activeChat, message, imageUrl, productUrl });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const formatMessageTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formattedChats = chats.map((chat) => ({
    id: chat.chatId,
    name: chat.name,
    phoneNumber: chat.phoneNumber,
    lastMessage: chat.lastMessage,
    timestamp: formatRelativeTime(chat.timestamp),
    unreadCount: chat.unreadCount,
  }));

  const formattedMessages = messages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    timestamp: formatMessageTime(msg.timestamp),
    isSent: msg.isSent,
    status: msg.status as any,
    mediaType: msg.mediaType,
    mediaUrl: msg.mediaUrl,
  }));

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
          <Select value={activeConnection || ""} onValueChange={setActiveConnection}>
            <SelectTrigger data-testid="select-connection">
              <SelectValue placeholder="Select connection" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.connectionId}>
                  {conn.connectionId} {conn.phoneNumber ? `(${conn.phoneNumber})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!activeConnection ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-muted-foreground">
            {connections.length === 0
              ? "No connections available. Create a connection first."
              : "Select a connection to view messages"}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-80">
            <ChatList
              chats={formattedChats}
              activeChat={activeChat || undefined}
              onChatSelect={setActiveChat}
            />
          </div>
          <div className="flex-1">
            {activeChatData ? (
              <MessageThread
                chatName={activeChatData.name}
                phoneNumber={activeChatData.phoneNumber}
                messages={formattedMessages}
                onSendMessage={handleSendMessage}
                connectionStatus={activeConnectionData?.status as any}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a chat to start messaging</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
