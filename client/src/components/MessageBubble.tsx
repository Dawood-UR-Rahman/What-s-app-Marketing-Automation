import { Check, CheckCheck } from "lucide-react";

type MessageStatus = "sent" | "delivered" | "read" | "failed";

interface MessageBubbleProps {
  messageId: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  status?: MessageStatus;
  mediaType?: string | null;
  mediaUrl?: string | null;
}

function renderContentWithLinks(content: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          data-testid="link-product-url"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function MessageBubble({
  messageId,
  content,
  timestamp,
  isSent,
  status = "sent",
  mediaType,
  mediaUrl,
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
        {mediaType === "image" && mediaUrl && (
          <img 
            src={mediaUrl} 
            alt="Message image" 
            className="rounded-lg max-w-full mb-2"
            loading="lazy"
          />
        )}
        {content && (
          <p className="text-sm break-words whitespace-pre-wrap" data-testid={`text-message-content-${messageId}`}>
            {renderContentWithLinks(content)}
          </p>
        )}
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
