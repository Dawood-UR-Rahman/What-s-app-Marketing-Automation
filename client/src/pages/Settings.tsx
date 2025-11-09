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
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";

export default function Settings() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiTokenConnectionId, setApiTokenConnectionId] = useState<string>("");
  const [showApiToken, setShowApiToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string>("");
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

  const generateApiTokenMutation = useMutation({
    mutationFn: (connectionId: string) => connectionsApi.generateApiToken(connectionId),
    onSuccess: (data) => {
      setGeneratedToken(data.api_token);
      setShowApiToken(true);
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "API Token Generated",
        description: "Copy and save your token securely. It won't be shown again!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to generate API token",
        variant: "destructive",
      });
    },
  });

  const clearApiTokenMutation = useMutation({
    mutationFn: (connectionId: string) => connectionsApi.clearApiToken(connectionId),
    onSuccess: () => {
      setGeneratedToken("");
      setShowApiToken(false);
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "API Token Cleared",
        description: "The API token has been removed from this connection",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clear API token",
        variant: "destructive",
      });
    },
  });

  const handleGenerateToken = () => {
    if (!apiTokenConnectionId) {
      toast({
        title: "Error",
        description: "Please select a connection",
        variant: "destructive",
      });
      return;
    }
    generateApiTokenMutation.mutate(apiTokenConnectionId);
  };

  const handleClearToken = () => {
    if (!apiTokenConnectionId) {
      toast({
        title: "Error",
        description: "Please select a connection",
        variant: "destructive",
      });
      return;
    }
    clearApiTokenMutation.mutate(apiTokenConnectionId);
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      toast({
        title: "Copied",
        description: "API token copied to clipboard",
      });
    }
  };

  const selectedConnection = connections.find(c => c.connectionId === selectedConnectionId);
  const apiTokenConnection = connections.find(c => c.connectionId === apiTokenConnectionId);

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
            <CardTitle>API Token Management</CardTitle>
            <CardDescription>
              Generate API tokens for programmatic access to send messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-token-connection">Select Connection</Label>
              <Select value={apiTokenConnectionId} onValueChange={setApiTokenConnectionId}>
                <SelectTrigger id="api-token-connection" data-testid="select-api-token-connection">
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

            {apiTokenConnection && (
              <div className="space-y-2">
                <Label>Current Status</Label>
                <Badge variant={apiTokenConnection.apiToken ? "default" : "secondary"}>
                  {apiTokenConnection.apiToken ? "Token Active" : "No Token"}
                </Badge>
              </div>
            )}

            {generatedToken && (
              <div className="space-y-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <div className="flex items-center gap-2">
                  <Label className="text-yellow-600 dark:text-yellow-400 font-semibold">⚠️ Save This Token</Label>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  This token will only be shown once. Copy it now and store it securely!
                </p>
                <div className="flex gap-2">
                  <Input
                    value={generatedToken}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-generated-token"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyToken}
                    data-testid="button-copy-token"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Separator />
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleGenerateToken}
                disabled={!apiTokenConnectionId || generateApiTokenMutation.isPending}
                data-testid="button-generate-token"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {apiTokenConnection?.apiToken ? "Regenerate Token" : "Generate Token"}
              </Button>
              {apiTokenConnection?.apiToken && (
                <Button 
                  variant="destructive"
                  onClick={handleClearToken}
                  disabled={clearApiTokenMutation.isPending}
                  data-testid="button-clear-token"
                >
                  Clear Token
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use API tokens to authenticate requests to /api/send-text, /api/send-image, /api/send-link, and /api/send-buttons endpoints
            </p>
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
