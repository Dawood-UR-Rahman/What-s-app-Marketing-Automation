import { QRCodeModal } from "../QRCodeModal";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function QRCodeModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <Button onClick={() => setOpen(true)} data-testid="button-show-qr">
        Show QR Code
      </Button>
      <QRCodeModal
        open={open}
        onOpenChange={setOpen}
        qrCode="https://example.com/whatsapp-qr-demo"
        connectionId="demo-user-123"
        loading={false}
      />
    </div>
  );
}
