import { MessageComposer } from "../MessageComposer";

export default function MessageComposerExample() {
  const handleSend = (message: string) => {
    console.log("Sending message:", message);
  };

  return (
    <div className="max-w-2xl border rounded-lg">
      <MessageComposer onSend={handleSend} />
    </div>
  );
}
