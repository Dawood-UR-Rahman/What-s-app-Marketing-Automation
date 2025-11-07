import { ChatListItem } from "../ChatListItem";

export default function ChatListItemExample() {
  return (
    <div className="max-w-md border rounded-lg overflow-hidden">
      <ChatListItem
        chatId="chat-1"
        name="John Doe"
        phoneNumber="+92 300 1234567"
        lastMessage="Hey, how are you doing?"
        timestamp="2m ago"
        unreadCount={3}
        onClick={() => console.log("Chat clicked")}
      />
      <ChatListItem
        chatId="chat-2"
        name="Alice Smith"
        phoneNumber="+92 301 9876543"
        lastMessage="Thanks for your help!"
        timestamp="1h ago"
        active={true}
        onClick={() => console.log("Chat clicked")}
      />
      <ChatListItem
        chatId="chat-3"
        name="Bob Johnson"
        phoneNumber="+92 302 5555555"
        lastMessage="See you tomorrow"
        timestamp="Yesterday"
        onClick={() => console.log("Chat clicked")}
      />
    </div>
  );
}
