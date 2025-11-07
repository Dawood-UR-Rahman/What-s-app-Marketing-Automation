import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string | null;
  connectionId: string;
  loading?: boolean;
}

export function QRCodeModal({
  open,
  onOpenChange,
  qrCode,
  connectionId,
  loading = false,
}: QRCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-qr-code">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Open WhatsApp on your phone and scan this QR code to connect
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          {loading ? (
            <div className="flex h-64 w-64 items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : qrCode ? (
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG value={qrCode} size={256} data-testid="img-qr-code" />
            </div>
          ) : (
            <div className="flex h-64 w-64 items-center justify-center bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">No QR code available</p>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Connection ID</p>
            <Badge variant="secondary" className="font-mono text-xs" data-testid="text-connection-id">
              {connectionId}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
