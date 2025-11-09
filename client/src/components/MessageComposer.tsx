import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Image, Link, ListOrdered, Plus, X } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { SendPayload, ReplyButton } from "@shared/schema";

interface MessageComposerProps {
  onSend: (payload: SendPayload) => void;
  disabled?: boolean;
}

type ComposerMode = "text" | "image" | "link" | "buttons";

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("text");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonFooter, setButtonFooter] = useState("");
  const [buttons, setButtons] = useState<ReplyButton[]>([{ id: "1", title: "" }]);

  const resetForm = () => {
    setMessage("");
    setImageUrl("");
    setCaption("");
    setLink("");
    setButtonText("");
    setButtonFooter("");
    setButtons([{ id: "1", title: "" }]);
    setMode("text");
  };

  const handleSend = () => {
    if (disabled) return;

    try {
      if (mode === "text" && message.trim()) {
        onSend({ kind: "text", message: message.trim() });
        resetForm();
      } else if (mode === "image" && imageUrl.trim()) {
        onSend({
          kind: "image",
          image_url: imageUrl.trim(),
          caption: caption.trim() || undefined,
        });
        resetForm();
      } else if (mode === "link" && message.trim() && link.trim()) {
        onSend({
          kind: "link",
          message: message.trim(),
          link: link.trim(),
        });
        resetForm();
      } else if (mode === "buttons" && buttonText.trim()) {
        const validButtons = buttons.filter(b => b.title.trim());
        if (validButtons.length >= 1 && validButtons.length <= 3) {
          onSend({
            kind: "buttons",
            text: buttonText.trim(),
            footer: buttonFooter.trim() || undefined,
            buttons: validButtons.map((b, idx) => ({
              id: (idx + 1).toString(),
              title: b.title.trim(),
            })),
          });
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && mode === "text") {
      e.preventDefault();
      handleSend();
    }
  };

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { id: (buttons.length + 1).toString(), title: "" }]);
    }
  };

  const removeButton = (index: number) => {
    if (buttons.length > 1) {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  const updateButton = (index: number, title: string) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], title };
    setButtons(updated);
  };

  const canSend = () => {
    if (disabled) return false;
    
    switch (mode) {
      case "text":
        return message.trim().length > 0;
      case "image":
        return imageUrl.trim().length > 0;
      case "link":
        return message.trim().length > 0 && link.trim().length > 0;
      case "buttons":
        const validButtons = buttons.filter(b => b.title.trim());
        return buttonText.trim().length > 0 && validButtons.length >= 1 && validButtons.length <= 3;
      default:
        return false;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-t bg-background">
      {mode === "image" && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Image Message</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("text")}
              data-testid="button-cancel-image"
            >
              Cancel
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL..."
              disabled={disabled}
              data-testid="input-image-url"
            />
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)..."
              disabled={disabled}
              data-testid="input-image-caption"
            />
          </div>
        </Card>
      )}

      {mode === "link" && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Link Message</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("text")}
              data-testid="button-cancel-link"
            >
              Cancel
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message..."
              disabled={disabled}
              data-testid="input-link-message"
            />
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enter link URL..."
              disabled={disabled}
              data-testid="input-link-url"
            />
          </div>
        </Card>
      )}

      {mode === "buttons" && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Interactive Buttons</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("text")}
              data-testid="button-cancel-buttons"
            >
              Cancel
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Main message text..."
              disabled={disabled}
              data-testid="input-button-text"
            />
            <Input
              value={buttonFooter}
              onChange={(e) => setButtonFooter(e.target.value)}
              placeholder="Footer text (optional)..."
              disabled={disabled}
              data-testid="input-button-footer"
            />
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Buttons (1-3)</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addButton}
                  disabled={disabled || buttons.length >= 3}
                  data-testid="button-add-button"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Button
                </Button>
              </div>
              {buttons.map((button, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={button.title}
                    onChange={(e) => updateButton(index, e.target.value)}
                    placeholder={`Button ${index + 1} text (max 20 chars)...`}
                    maxLength={20}
                    disabled={disabled}
                    data-testid={`input-button-${index + 1}`}
                  />
                  {buttons.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeButton(index)}
                      disabled={disabled}
                      data-testid={`button-remove-${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        {mode === "text" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("image")}
              disabled={disabled}
              className="shrink-0"
              data-testid="button-image-mode"
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("link")}
              disabled={disabled}
              className="shrink-0"
              data-testid="button-link-mode"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("buttons")}
              disabled={disabled}
              className="shrink-0"
              data-testid="button-buttons-mode"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </>
        )}
        <Textarea
          value={mode === "text" ? message : mode === "link" ? message : ""}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={mode === "text" ? "Type a message..." : mode === "image" ? "Image mode active" : mode === "link" ? "Link mode active" : "Button mode active"}
          className="resize-none min-h-[44px] max-h-32 flex-1"
          rows={1}
          disabled={disabled || mode !== "text"}
          data-testid="input-message"
        />
        <Button
          onClick={handleSend}
          disabled={!canSend()}
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
