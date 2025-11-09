import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { socketService } from "@/lib/socket";
import type { Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectedSocket = socketService.connect();
    setSocket(connectedSocket);

    const handleConnect = () => {
      console.log("Global WebSocket connected");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Global WebSocket disconnected");
      setIsConnected(false);
    };

    connectedSocket.on("connect", handleConnect);
    connectedSocket.on("disconnect", handleDisconnect);

    if (connectedSocket.connected) {
      setIsConnected(true);
    }

    return () => {
      connectedSocket.off("connect", handleConnect);
      connectedSocket.off("disconnect", handleDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
