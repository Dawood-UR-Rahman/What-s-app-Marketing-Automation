import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SocketProvider } from "@/contexts/SocketContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Messages from "@/pages/Messages";
import Connections from "@/pages/Connections";
import Settings from "@/pages/Settings";
import DeveloperDocs from "@/pages/DeveloperDocs";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/messages" component={Messages} />
      <Route path="/connections" component={Connections} />
      <Route path="/settings" component={Settings} />
      <Route path="/developer-docs" component={DeveloperDocs} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}
