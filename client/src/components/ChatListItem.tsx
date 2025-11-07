import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ChatListItemProps {
  chatId: string;
  name: string;
  phoneNumber: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  active?: boolean;
  onClick?: () => void;
}

export function ChatListItem({
  chatId,
  name,
  phoneNumber,
  lastMessage,
  timestamp,
  unreadCount = 0,
  active = false,
  onClick,
}: ChatListItemProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-start gap-3 p-4 cursor-pointer hover-elevate border-b ${
        active ? "bg-accent" : ""
      }`}
      onClick={onClick}
      data-testid={`chat-item-${chatId}`}
    >
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-medium text-sm truncate" data-testid={`text-chat-name-${chatId}`}>
            {name}
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-timestamp-${chatId}`}>
            {timestamp}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-0.5 font-mono" data-testid={`text-phone-${chatId}`}>
          {phoneNumber}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate" data-testid={`text-last-message-${chatId}`}>
            {lastMessage}
          </p>
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="ml-auto bg-primary text-primary-foreground shrink-0 h-5 min-w-5 px-1.5 text-xs"
              data-testid={`badge-unread-${chatId}`}
            >
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
