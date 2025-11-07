import { Check, CheckCheck } from "lucide-react";

type MessageStatus = "sent" | "delivered" | "read" | "failed";

interface MessageBubbleProps {
  messageId: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  status?: MessageStatus;
}

export function MessageBubble({
  messageId,
  content,
  timestamp,
  isSent,
  status = "sent",
}: MessageBubbleProps) {
  const statusIcon = {
    sent: <Check className="h-3 w-3" />,
    delivered: <CheckCheck className="h-3 w-3" />,
    read: <CheckCheck className="h-3 w-3 text-primary" />,
    failed: <span className="text-xs">!</span>,
  };

  return (
    <div
      className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2`}
      data-testid={`message-${messageId}`}
    >
      <div
        className={`max-w-md rounded-2xl px-4 py-2 ${
          isSent
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        <p className="text-sm break-words" data-testid={`text-message-content-${messageId}`}>
          {content}
        </p>
        <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end" : "justify-start"}`}>
          <span className="text-xs opacity-70" data-testid={`text-timestamp-${messageId}`}>
            {timestamp}
          </span>
          {isSent && (
            <span className="opacity-70" data-testid={`icon-status-${messageId}`}>
              {statusIcon[status]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
