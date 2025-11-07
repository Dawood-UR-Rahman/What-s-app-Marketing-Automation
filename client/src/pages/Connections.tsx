import { ConnectionCard } from "@/components/ConnectionCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { QRCodeModal } from "@/components/QRCodeModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WebhookSettings } from "@/components/WebhookSettings";

export default function Connections() {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  const connections = [
    {
      id: "user-123",
      status: "connected" as const,
      phoneNumber: "+92 300 1234567",
      webhookUrl: "https://api.example.com/webhook",
      lastActive: "2 minutes ago",
    },
    {
      id: "user-456",
      status: "connected" as const,
      phoneNumber: "+92 301 9876543",
      webhookUrl: "https://api.example.com/webhook/456",
      lastActive: "5 minutes ago",
    },
    {
      id: "user-789",
      status: "disconnected" as const,
      webhookUrl: "https://api.example.com/webhook/789",
      lastActive: "1 hour ago",
    },
    {
      id: "user-abc",
      status: "connecting" as const,
      webhookUrl: "https://api.example.com/webhook/abc",
      lastActive: "Just now",
    },
  ];

  const handleScanQR = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setQrModalOpen(true);
  };

  const handleSettings = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setSettingsModalOpen(true);
  };

  const handleNewConnection = () => {
    setSelectedConnection("new-connection-" + Date.now());
    setQrModalOpen(true);
  };

  const handleSaveWebhook = (url: string) => {
    console.log("Saving webhook URL:", url);
    setSettingsModalOpen(false);
  };

  const selectedConnectionData = connections.find((c) => c.id === selectedConnection);

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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connectionId={connection.id}
            status={connection.status}
            phoneNumber={connection.phoneNumber}
            webhookUrl={connection.webhookUrl}
            lastActive={connection.lastActive}
            onScanQR={() => handleScanQR(connection.id)}
            onSettings={() => handleSettings(connection.id)}
            onDelete={() => console.log("Delete clicked")}
          />
        ))}
      </div>

      {selectedConnection && (
        <>
          <QRCodeModal
            open={qrModalOpen}
            onOpenChange={setQrModalOpen}
            qrCode="https://example.com/whatsapp-qr-demo"
            connectionId={selectedConnection}
            loading={false}
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
                currentWebhookUrl={selectedConnectionData?.webhookUrl}
                onSave={handleSaveWebhook}
                isActive={selectedConnectionData?.status === "connected"}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
