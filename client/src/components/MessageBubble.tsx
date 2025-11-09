import { Check, CheckCheck, BarChart3 } from "lucide-react";

type MessageStatus = "sent" | "delivered" | "read" | "failed";

interface MessageBubbleProps {
  messageId: string;
  content: string;
  timestamp: string;
  isSent: boolean;
  status?: MessageStatus;
  mediaType?: string | null;
  mediaUrl?: string | null;
  pollQuestion?: string | null;
  pollOptions?: string[] | null;
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
  pollQuestion,
  pollOptions,
}: MessageBubbleProps) {
  const statusIcon = {
    sent: <Check className="h-3 w-3" />,
    delivered: <CheckCheck className="h-3 w-3" />,
    read: <CheckCheck className="h-3 w-3 text-primary" />,
    failed: <span className="text-xs">!</span>,
  };

  const isPoll = pollQuestion && pollOptions && pollOptions.length > 0;

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
        {isPoll ? (
          <div className="flex flex-col gap-2" data-testid={`poll-${messageId}`}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">{pollQuestion}</span>
            </div>
            <div className="flex flex-col gap-1 pl-1">
              {pollOptions.map((option, index) => (
                <div 
                  key={index} 
                  className="text-sm opacity-80 flex items-start gap-1"
                  data-testid={`poll-option-${index + 1}`}
                >
                  <span className="opacity-50">{index + 1}.</span>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          </div>
        ) : content ? (
          <p className="text-sm break-words whitespace-pre-wrap" data-testid={`text-message-content-${messageId}`}>
            {renderContentWithLinks(content)}
          </p>
        ) : null}
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
