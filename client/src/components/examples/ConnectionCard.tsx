import { ConnectionCard } from "../ConnectionCard";

export default function ConnectionCardExample() {
  return (
    <div className="max-w-md space-y-4">
      <ConnectionCard
        connectionId="user-123"
        status="connected"
        phoneNumber="+92 300 1234567"
        webhookUrl="https://api.example.com/webhook"
        lastActive="2 minutes ago"
        onScanQR={() => console.log("Scan QR clicked")}
        onSettings={() => console.log("Settings clicked")}
        onDelete={() => console.log("Delete clicked")}
      />
      <ConnectionCard
        connectionId="user-456"
        status="disconnected"
        webhookUrl="https://api.example.com/webhook/456"
        lastActive="1 hour ago"
        onScanQR={() => console.log("Scan QR clicked")}
        onSettings={() => console.log("Settings clicked")}
        onDelete={() => console.log("Delete clicked")}
      />
    </div>
  );
}
