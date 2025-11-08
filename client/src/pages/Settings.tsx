import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { connectionsApi, type Connection } from "@/lib/api";
import { useState } from "react";

export default function Settings() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const updateWebhookMutation = useMutation({
    mutationFn: ({ connectionId, webhookUrl }: { connectionId: string; webhookUrl: string }) =>
      connectionsApi.updateWebhook(connectionId, webhookUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Success",
        description: "Webhook URL updated successfully",
      });
      setWebhookUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update webhook URL",
        variant: "destructive",
      });
    },
  });

  const handleUpdateWebhook = () => {
    if (!selectedConnectionId) {
      toast({
        title: "Error",
        description: "Please select a connection",
        variant: "destructive",
      });
      return;
    }
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }
    updateWebhookMutation.mutate({ connectionId: selectedConnectionId, webhookUrl });
  };

  const selectedConnection = connections.find(c => c.connectionId === selectedConnectionId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your application preferences
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Configure your API settings and endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input
                id="api-endpoint"
                placeholder="https://api.example.com"
                defaultValue="http://localhost:5000"
                data-testid="input-api-endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                data-testid="input-api-key"
              />
            </div>
            <Button className="w-full" data-testid="button-save-api">
              Save API Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Storage</CardTitle>
            <CardDescription>
              Manage WhatsApp session storage settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Auto-reconnect</p>
                <p className="text-xs text-muted-foreground">
                  Automatically reconnect when server restarts
                </p>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Enabled
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Session backup</p>
                <p className="text-xs text-muted-foreground">
                  Save session files to persistent storage
                </p>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Enabled
              </Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="session-path">Session Storage Path</Label>
              <Input
                id="session-path"
                defaultValue="./whatsapp-sessions"
                className="font-mono text-sm"
                readOnly
                data-testid="input-session-path"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WebSocket Configuration</CardTitle>
            <CardDescription>
              Real-time messaging settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">WebSocket Status</p>
                <p className="text-xs text-muted-foreground">
                  Connection status for real-time updates
                </p>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Connected
              </Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="ws-endpoint">WebSocket Endpoint</Label>
              <Input
                id="ws-endpoint"
                defaultValue="ws://localhost:5000"
                className="font-mono text-sm"
                data-testid="input-ws-endpoint"
              />
            </div>
            <Button className="w-full" data-testid="button-reconnect-ws">
              Reconnect WebSocket
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Sync</CardTitle>
            <CardDescription>
              Configure message synchronization settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sync-limit">Message Sync Limit</Label>
              <Input
                id="sync-limit"
                type="number"
                defaultValue="50"
                data-testid="input-sync-limit"
              />
              <p className="text-xs text-muted-foreground">
                Number of messages to load per chat
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Auto-sync on connect</p>
                <p className="text-xs text-muted-foreground">
                  Sync messages automatically when connection established
                </p>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Enabled
              </Badge>
            </div>
            <Button className="w-full" data-testid="button-save-sync">
              Save Sync Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>
              Configure webhook URLs for incoming message notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connection-select">Select Connection</Label>
              <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                <SelectTrigger id="connection-select">
                  <SelectValue placeholder="Choose a connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.connectionId}>
                      {conn.connectionId} {conn.phoneNumber && `(${conn.phoneNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedConnection && (
              <div className="space-y-2">
                <Label>Current Webhook URL</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedConnection.webhookUrl || "Not configured"}
                </p>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="webhook-url">New Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-api.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                data-testid="input-webhook-url"
              />
              <p className="text-xs text-muted-foreground">
                This URL will receive POST requests when messages arrive
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateWebhook}
              disabled={updateWebhookMutation.isPending}
              data-testid="button-save-webhook"
            >
              Update Webhook URL
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
