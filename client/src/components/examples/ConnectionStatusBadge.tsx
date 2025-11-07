import { ConnectionStatusBadge } from "../ConnectionStatusBadge";

export default function ConnectionStatusBadgeExample() {
  return (
    <div className="flex gap-4">
      <ConnectionStatusBadge status="connected" />
      <ConnectionStatusBadge status="connecting" />
      <ConnectionStatusBadge status="disconnected" />
    </div>
  );
}
