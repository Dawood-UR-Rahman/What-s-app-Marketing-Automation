import { ConnectionCard } from "@/components/ConnectionCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { QRCodeModal } from "@/components/QRCodeModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WebhookSettings } from "@/components/WebhookSettings";
import { connectionsApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Connection } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { socketService } from "@/lib/socket";
import { useLocation } from "wouter";

export default function Connections() {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newConnectionModalOpen, setNewConnectionModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [newConnectionId, setNewConnectionId] = useState("");
  const [connectionPhase, setConnectionPhase] = useState<"generating_qr" | "waiting_scan" | "pairing" | "syncing" | "ready">("generating_qr");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const createConnectionMutation = useMutation({
    mutationFn: (connectionId: string) => connectionsApi.create(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Success",
        description: "Connection created successfully",
      });
      setNewConnectionModalOpen(false);
      setNewConnectionId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create connection",
        variant: "destructive",
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (connectionId: string) => connectionsApi.delete(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Success",
        description: "Connection deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete connection",
        variant: "destructive",
      });
    },
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
      setSettingsModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update webhook URL",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const socket = socketService.connect();

    const handleQRUpdate = (data: { connectionId: string; qr: string }) => {
      if (data.connectionId === selectedConnection && qrModalOpen) {
        setQrCode(data.qr);
        setQrLoading(false);
      }
    };

    const handleConnectionPhase = (data: { connectionId: string; phase: "generating_qr" | "waiting_scan" | "pairing" | "syncing" | "ready" }) => {
      if (data.connectionId === selectedConnection && qrModalOpen) {
        setConnectionPhase(data.phase);
      }
    };

    const handleConnectionStatus = (data: { connectionId: string; status: string; phoneNumber?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      
      if (data.status === "connected" && data.connectionId === selectedConnection) {
        toast({
          title: "Connected",
          description: `WhatsApp connected successfully${data.phoneNumber ? ` (${data.phoneNumber})` : ""}`,
        });
        
        // Auto-redirect to messages page after a brief delay
        setTimeout(() => {
          setQrModalOpen(false);
          setLocation(`/messages?connectionId=${selectedConnection}`);
        }, 1500);
      }
    };

    socketService.on("qr-update", handleQRUpdate);
    socketService.on("connection-phase", handleConnectionPhase);
    socketService.on("connection-status", handleConnectionStatus);

    return () => {
      socketService.off("qr-update", handleQRUpdate);
      socketService.off("connection-phase", handleConnectionPhase);
      socketService.off("connection-status", handleConnectionStatus);
    };
  }, [selectedConnection, qrModalOpen, queryClient, toast, setLocation]);

  const handleScanQR = async (connectionId: string) => {
    setSelectedConnection(connectionId);
    setQrModalOpen(true);
    setQrLoading(true);
    setQrCode(null);
    setConnectionPhase("generating_qr");

    try {
      const result = await connectionsApi.getQR(connectionId);
      if (result.qr) {
        setQrCode(result.qr);
        setConnectionPhase("waiting_scan");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleSettings = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setSettingsModalOpen(true);
  };

  const handleNewConnection = () => {
    setNewConnectionModalOpen(true);
  };

  const handleCreateConnection = () => {
    if (!newConnectionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connection ID",
        variant: "destructive",
      });
      return;
    }
    createConnectionMutation.mutate(newConnectionId);
  };

  const handleSaveWebhook = (url: string) => {
    if (selectedConnection) {
      updateWebhookMutation.mutate({ connectionId: selectedConnection, webhookUrl: url });
    }
  };

  const selectedConnectionData = connections.find((c) => c.connectionId === selectedConnection);

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="text-sm text-muted-foreground">
            Manage your WhatsApp account connections
          </p>
        </div>
        <Button onClick={handleNewConnection} data-testid="button-new-connection">
          <Plus className="h-4 w-4 mr-2" />
          New Connection
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading connections...</p>
      ) : connections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No connections yet. Create one to get started!</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connectionId={connection.connectionId}
              status={connection.status as any}
              phoneNumber={connection.phoneNumber || undefined}
              webhookUrl={connection.webhookUrl || undefined}
              lastActive={formatRelativeTime(connection.lastActive)}
              onScanQR={() => handleScanQR(connection.connectionId)}
              onSettings={() => handleSettings(connection.connectionId)}
              onDelete={() => deleteConnectionMutation.mutate(connection.connectionId)}
            />
          ))}
        </div>
      )}

      {selectedConnection && (
        <>
          <QRCodeModal
            open={qrModalOpen}
            onOpenChange={setQrModalOpen}
            qrCode={qrCode}
            connectionId={selectedConnection}
            loading={qrLoading}
            phase={connectionPhase}
          />

          <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Connection Settings</DialogTitle>
                <DialogDescription>
                  Configure webhook and other settings for this connection
                </DialogDescription>
              </DialogHeader>
              <WebhookSettings
                connectionId={selectedConnection}
                currentWebhookUrl={selectedConnectionData?.webhookUrl || ""}
                onSave={handleSaveWebhook}
                isActive={selectedConnectionData?.status === "connected"}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog open={newConnectionModalOpen} onOpenChange={setNewConnectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Connection</DialogTitle>
            <DialogDescription>
              Enter a unique connection ID for your new WhatsApp connection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connection-id">Connection ID</Label>
              <Input
                id="connection-id"
                placeholder="e.g., user-123"
                value={newConnectionId}
                onChange={(e) => setNewConnectionId(e.target.value)}
                data-testid="input-new-connection-id"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateConnection}
                disabled={createConnectionMutation.isPending}
                className="flex-1"
                data-testid="button-create-connection"
              >
                Create Connection
              </Button>
              <Button
                variant="outline"
                onClick={() => setNewConnectionModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
