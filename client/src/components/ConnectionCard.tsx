import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { QrCode, Settings, Trash2 } from "lucide-react";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface ConnectionCardProps {
  connectionId: string;
  status: ConnectionStatus;
  phoneNumber?: string;
  webhookUrl?: string;
  lastActive?: string;
  onScanQR?: () => void;
  onSettings?: () => void;
  onDelete?: () => void;
}

export function ConnectionCard({
  connectionId,
  status,
  phoneNumber,
  webhookUrl,
  lastActive,
  onScanQR,
  onSettings,
  onDelete,
}: ConnectionCardProps) {
  return (
    <Card data-testid={`card-connection-${connectionId}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="font-medium text-sm truncate" data-testid={`text-connection-id-${connectionId}`}>
            {connectionId}
          </h3>
          {phoneNumber && (
            <p className="text-xs text-muted-foreground font-mono" data-testid={`text-phone-${connectionId}`}>
              {phoneNumber}
            </p>
          )}
        </div>
        <ConnectionStatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-4">
        {webhookUrl && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
            <p className="text-xs font-mono truncate bg-muted px-2 py-1 rounded-md" data-testid={`text-webhook-${connectionId}`}>
              {webhookUrl}
            </p>
          </div>
        )}
        {lastActive && (
          <p className="text-xs text-muted-foreground">
            Last active: <span data-testid={`text-last-active-${connectionId}`}>{lastActive}</span>
          </p>
        )}
        <div className="flex gap-2">
          {status !== "connected" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={onScanQR}
              data-testid={`button-scan-qr-${connectionId}`}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={status !== "connected" ? "" : "flex-1"}
            onClick={onSettings}
            data-testid={`button-settings-${connectionId}`}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            data-testid={`button-delete-${connectionId}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
