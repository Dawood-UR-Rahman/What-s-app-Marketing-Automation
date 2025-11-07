import { DashboardMetrics } from "../DashboardMetrics";

export default function DashboardMetricsExample() {
  return (
    <DashboardMetrics
      totalConnections={12}
      activeConnections={8}
      totalMessages={1547}
      webhookCalls={234}
    />
  );
}
