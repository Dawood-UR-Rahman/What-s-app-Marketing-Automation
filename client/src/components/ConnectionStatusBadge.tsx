import { Badge } from "@/components/ui/badge";

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const statusConfig = {
    connected: {
      label: "Connected",
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    disconnected: {
      label: "Disconnected",
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
    connecting: {
      label: "Connecting",
      className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`${config.className} gap-1.5`}
      data-testid={`badge-status-${status}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500"
        }`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500"
        }`}></span>
      </span>
      {config.label}
    </Badge>
  );
}
