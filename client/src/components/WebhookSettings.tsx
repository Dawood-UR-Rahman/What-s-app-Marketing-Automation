import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface WebhookSettingsProps {
  connectionId: string;
  currentWebhookUrl?: string;
  onSave: (url: string) => void;
  isActive?: boolean;
}

export function WebhookSettings({
  connectionId,
  currentWebhookUrl = "",
  onSave,
  isActive = false,
}: WebhookSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl);

  const handleSave = () => {
    onSave(webhookUrl);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Webhook Settings</CardTitle>
            <CardDescription>
              Configure webhook URL for incoming messages
            </CardDescription>
          </div>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" : ""}
            data-testid="badge-webhook-status"
          >
            {isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="connection-id">Connection ID</Label>
          <Input
            id="connection-id"
            value={connectionId}
            readOnly
            className="font-mono text-sm bg-muted"
            data-testid="input-connection-id"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://api.example.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            data-testid="input-webhook-url"
          />
          <p className="text-xs text-muted-foreground">
            This URL will receive POST requests when new messages arrive
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="w-full"
          data-testid="button-save-webhook"
        >
          Save Webhook Settings
        </Button>
      </CardContent>
    </Card>
  );
}
