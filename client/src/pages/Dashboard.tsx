import { DashboardMetrics } from "@/components/DashboardMetrics";
import { ConnectionCard } from "@/components/ConnectionCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { QRCodeModal } from "@/components/QRCodeModal";

export default function Dashboard() {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  const handleScanQR = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setQrModalOpen(true);
  };

  const handleNewConnection = () => {
    setSelectedConnection("new-connection-" + Date.now());
    setQrModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your WhatsApp connections and activity
          </p>
        </div>
        <Button onClick={handleNewConnection} data-testid="button-new-connection">
          <Plus className="h-4 w-4 mr-2" />
          New Connection
        </Button>
      </div>

      <DashboardMetrics
        totalConnections={3}
        activeConnections={2}
        totalMessages={1547}
        webhookCalls={234}
      />

      <div>
        <h2 className="text-lg font-medium mb-4">Recent Connections</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <ConnectionCard
            connectionId="user-123"
            status="connected"
            phoneNumber="+92 300 1234567"
            webhookUrl="https://api.example.com/webhook"
            lastActive="2 minutes ago"
            onScanQR={() => handleScanQR("user-123")}
            onSettings={() => console.log("Settings clicked")}
            onDelete={() => console.log("Delete clicked")}
          />
          <ConnectionCard
            connectionId="user-456"
            status="connected"
            phoneNumber="+92 301 9876543"
            webhookUrl="https://api.example.com/webhook/456"
            lastActive="5 minutes ago"
            onScanQR={() => handleScanQR("user-456")}
            onSettings={() => console.log("Settings clicked")}
            onDelete={() => console.log("Delete clicked")}
          />
          <ConnectionCard
            connectionId="user-789"
            status="disconnected"
            webhookUrl="https://api.example.com/webhook/789"
            lastActive="1 hour ago"
            onScanQR={() => handleScanQR("user-789")}
            onSettings={() => console.log("Settings clicked")}
            onDelete={() => console.log("Delete clicked")}
          />
        </div>
      </div>

      {selectedConnection && (
        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          qrCode="https://example.com/whatsapp-qr-demo"
          connectionId={selectedConnection}
          loading={false}
        />
      )}
    </div>
  );
}
