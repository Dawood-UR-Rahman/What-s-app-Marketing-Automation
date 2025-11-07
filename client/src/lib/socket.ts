import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
