import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Image, Link } from "lucide-react";
import { useState, useRef } from "react";

interface MessageComposerProps {
  onSend: (message: string, imageUrl?: string, productUrl?: string) => void;
  disabled?: boolean;
}

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [showProductInput, setShowProductInput] = useState(false);

  const handleSend = () => {
    if ((message.trim() || imageUrl.trim() || productUrl.trim()) && !disabled) {
      onSend(message, imageUrl || undefined, productUrl || undefined);
      setMessage("");
      setImageUrl("");
      setProductUrl("");
      setShowImageInput(false);
      setShowProductInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-t bg-background">
      {showImageInput && (
        <div className="flex gap-2 items-center">
          <Image className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL..."
            className="flex-1"
            disabled={disabled}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowImageInput(false);
              setImageUrl("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      {showProductInput && (
        <div className="flex gap-2 items-center">
          <Link className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="Enter product URL..."
            className="flex-1"
            disabled={disabled}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowProductInput(false);
              setProductUrl("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        {!showImageInput && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowImageInput(true)}
            disabled={disabled}
            className="shrink-0"
          >
            <Image className="h-4 w-4" />
          </Button>
        )}
        {!showProductInput && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowProductInput(true)}
            disabled={disabled}
            className="shrink-0"
          >
            <Link className="h-4 w-4" />
          </Button>
        )}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          className="resize-none min-h-[44px] max-h-32 flex-1"
          rows={1}
          disabled={disabled}
          data-testid="input-message"
        />
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !imageUrl.trim() && !productUrl.trim()) || disabled}
          size="icon"
          className="shrink-0"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
