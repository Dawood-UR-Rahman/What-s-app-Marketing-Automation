import { MessageBubble } from "../MessageBubble";

export default function MessageBubbleExample() {
  return (
    <div className="max-w-2xl space-y-2 p-4 bg-background">
      <MessageBubble
        messageId="msg-1"
        content="Hey, how are you?"
        timestamp="10:30 AM"
        isSent={false}
      />
      <MessageBubble
        messageId="msg-2"
        content="I'm doing great! Thanks for asking."
        timestamp="10:31 AM"
        isSent={true}
        status="delivered"
      />
      <MessageBubble
        messageId="msg-3"
        content="That's wonderful to hear! Are we still on for tomorrow?"
        timestamp="10:32 AM"
        isSent={false}
      />
      <MessageBubble
        messageId="msg-4"
        content="Yes, absolutely! Looking forward to it."
        timestamp="10:33 AM"
        isSent={true}
        status="read"
      />
    </div>
  );
}
