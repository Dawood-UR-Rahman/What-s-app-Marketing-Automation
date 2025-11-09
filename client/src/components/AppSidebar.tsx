import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, MessageSquare, Link2, Settings, Book } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/SocketContext";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
    showBadge: true,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Link2,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Developer Docs",
    url: "/developer-docs",
    icon: Book,
  },
];

interface Connection {
  id: string;
  connectionId: string;
  status: string;
}

interface Chat {
  chatId: string;
  unreadCount: number;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { socket } = useSocket();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const { data: connections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const activeConnection = connections.find((c) => c.status === "connected") || connections[0];

  const { data: chats = [], refetch: refetchChats } = useQuery<Chat[]>({
    queryKey: ["/api/chats", activeConnection?.connectionId],
    enabled: !!activeConnection,
  });

  useEffect(() => {
    const total = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    setTotalUnreadCount(total);
  }, [chats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      refetchChats();
    };

    const handleMessageSent = () => {
      refetchChats();
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-sent", handleMessageSent);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-sent", handleMessageSent);
    };
  }, [socket, refetchChats]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <h2 className="text-lg font-semibold">WhatsApp Manager</h2>
        <p className="text-xs text-muted-foreground">Multi-user messaging</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.showBadge && totalUnreadCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="ml-auto" 
                          data-testid="badge-unread-count"
                        >
                          {totalUnreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <p className="text-xs text-muted-foreground">© 2024 WhatsApp Manager</p>
      </SidebarFooter>
    </Sidebar>
  );
}
