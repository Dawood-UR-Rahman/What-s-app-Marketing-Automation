import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string | null;
  connectionId: string;
  loading?: boolean;
  phase?: "generating_qr" | "waiting_scan" | "pairing" | "syncing" | "ready";
}

const phaseInfo = {
  generating_qr: { label: "Generating QR Code...", progress: 20 },
  waiting_scan: { label: "Scan QR code with WhatsApp", progress: 40 },
  pairing: { label: "Connecting to WhatsApp...", progress: 60 },
  syncing: { label: "Syncing messages...", progress: 80 },
  ready: { label: "Connected successfully!", progress: 100 },
};

export function QRCodeModal({
  open,
  onOpenChange,
  qrCode,
  connectionId,
  loading = false,
  phase = "generating_qr",
}: QRCodeModalProps) {
  const currentPhase = phaseInfo[phase] || phaseInfo.generating_qr;
  const isConnecting = phase === "pairing" || phase === "syncing";
  const isReady = phase === "ready";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-qr-code">
        <DialogHeader>
          <DialogTitle>
            {isReady ? "Connected!" : "Scan QR Code"}
          </DialogTitle>
          <DialogDescription>
            {isReady 
              ? "Your WhatsApp account is now connected" 
              : "Open WhatsApp on your phone and scan this QR code to connect"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          <AnimatePresence mode="wait">
            {loading || phase === "generating_qr" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-64 w-64 items-center justify-center bg-muted rounded-lg"
              >
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </motion.div>
            ) : isReady ? (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-64 w-64 items-center justify-center bg-green-50 dark:bg-green-950 rounded-lg"
              >
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
              </motion.div>
            ) : isConnecting ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-64 w-64 items-center justify-center bg-muted rounded-lg"
              >
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{currentPhase.label}</p>
                </div>
              </motion.div>
            ) : qrCode ? (
              <motion.div
                key="qr"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 bg-white rounded-lg"
              >
                <QRCodeSVG value={qrCode} size={256} data-testid="img-qr-code" />
              </motion.div>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">No QR code available</p>
              </div>
            )}
          </AnimatePresence>
          
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentPhase.label}</span>
              <span className="font-medium">{currentPhase.progress}%</span>
            </div>
            <Progress value={currentPhase.progress} className="h-2" />
          </div>

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
