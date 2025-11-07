import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Webhook, Activity } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
}

function MetricCard({ title, value, icon, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardMetricsProps {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  webhookCalls: number;
}

export function DashboardMetrics({
  totalConnections,
  activeConnections,
  totalMessages,
  webhookCalls,
}: DashboardMetricsProps) {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Connections"
        value={totalConnections}
        icon={<Users className="h-5 w-5" />}
        description="WhatsApp accounts linked"
      />
      <MetricCard
        title="Active Connections"
        value={activeConnections}
        icon={<Activity className="h-5 w-5" />}
        description="Currently online"
      />
      <MetricCard
        title="Total Messages"
        value={totalMessages}
        icon={<MessageSquare className="h-5 w-5" />}
        description="Sent and received"
      />
      <MetricCard
        title="Webhook Calls"
        value={webhookCalls}
        icon={<Webhook className="h-5 w-5" />}
        description="Last 24 hours"
      />
    </div>
  );
}
