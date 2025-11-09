import { MessageComposer } from "../MessageComposer";
import type { SendPayload } from "@shared/schema";

export default function MessageComposerExample() {
  const handleSend = (payload: SendPayload) => {
    console.log("Sending message:", payload);
  };

  return (
    <div className="max-w-2xl border rounded-lg">
      <MessageComposer onSend={handleSend} />
    </div>
  );
}
