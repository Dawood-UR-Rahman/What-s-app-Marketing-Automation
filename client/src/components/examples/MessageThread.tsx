import { MessageThread } from "../MessageThread";

export default function MessageThreadExample() {
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
  ];

  const handleSendMessage = (message: string) => {
    console.log("Sending message:", message);
  };

  return (
    <div className="h-[600px] max-w-2xl border rounded-lg overflow-hidden">
      <MessageThread
        chatName="John Doe"
        phoneNumber="+92 300 1234567"
        messages={mockMessages}
        onSendMessage={handleSendMessage}
        connectionStatus="connected"
      />
    </div>
  );
}
