import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  status?: "sent" | "delivered" | "read" | "failed";
  mediaType?: string | null;
  mediaUrl?: string | null;
}

interface MessageThreadProps {
  chatName: string;
  phoneNumber: string;
  messages: Message[];
  onSendMessage: (message: string, imageUrl?: string, productUrl?: string) => void;
  connectionStatus?: "connected" | "disconnected" | "connecting";
}

export function MessageThread({
  chatName,
  phoneNumber,
  messages,
  onSendMessage,
  connectionStatus = "connected",
}: MessageThreadProps) {
  const initials = chatName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm" data-testid="text-thread-chat-name">
            {chatName}
          </h3>
          <p className="text-xs text-muted-foreground font-mono" data-testid="text-thread-phone">
            {phoneNumber}
          </p>
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              messageId={message.id}
              content={message.content}
              timestamp={message.timestamp}
              isSent={message.isSent}
              status={message.status}
              mediaType={message.mediaType}
              mediaUrl={message.mediaUrl}
            />
          ))}
        </div>
      </ScrollArea>
      <MessageComposer
        onSend={onSendMessage}
        disabled={connectionStatus !== "connected"}
      />
    </div>
  );
}
