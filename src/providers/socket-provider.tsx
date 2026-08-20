"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { Notification } from "@/types";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

/**
 * Maps the backend's lower-cased Prisma model names (emitted by the
 * `db:changed` extension in `utils/prisma/prisma-client.ts`) onto the query
 * keys that should be refetched.
 */
const MODEL_QUERY_KEYS: Record<string, string[]> = {
  product: ["products", "product", "reports", "dashboard"],
  productbom: ["product", "products"],
  inventorybatch: ["inventory", "products", "dashboard"],
  stockmovement: ["stock-movements", "inventory", "products", "reports", "dashboard"],
  task: ["tasks", "task", "reports", "dashboard"],
  taskassignment: ["tasks", "task"],
  taskbatchallocation: ["tasks", "task", "inventory"],
  productrequest: ["product-requests", "tasks", "dashboard"],
  attendance: ["attendance", "payroll", "reports", "dashboard"],
  salarypayment: ["payroll", "reports", "dashboard"],
  monthlypayrollsnapshot: ["payroll"],
  user: ["users", "user", "dashboard"],
  employeeprofile: ["users", "user", "payroll"],
  vendor: ["vendors", "products"],
  category: ["categories", "products"],
  notification: ["notifications"],
  systemconfig: ["config", "attendance"],
  contenttype: ["content-types"],
  employeerecord: ["content-types", "employee-records"],
  employeedocument: ["documents"],
};

function resolveSocketUrl() {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
  const defaultSocketUrl = rawBaseUrl.replace(/\/api\/v1\/?$/, "");
  return process.env.NEXT_PUBLIC_API_URL || defaultSocketUrl;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Kept in a ref so the rooms can be re-joined on reconnect without
  // re-creating the socket every time the user object changes identity.
  const identityRef = useRef<{ id: string; role: string } | null>(null);
  useEffect(() => {
    identityRef.current = user ? { id: user.id, role: user.role } : null;
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socketInstance = io(resolveSocketUrl(), { transports: ["websocket", "polling"] });

    /** The backend only delivers events to `user:<id>` / `role:<ROLE>` rooms. */
    const joinRooms = () => {
      const identity = identityRef.current;
      if (!identity) return;
      socketInstance.emit("join_user", identity.id);
      socketInstance.emit("join_role", identity.role);
    };

    socketInstance.on("connect", () => {
      setIsConnected(true);
      joinRooms();
    });

    socketInstance.on("disconnect", () => setIsConnected(false));
    socketInstance.on("reconnect", joinRooms);

    socketInstance.on("notification:new", (payload: Partial<Notification>) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (payload?.title) {
        toast(payload.title, { description: payload.message });
      }
    });

    socketInstance.on("db:changed", (data: { model?: string; operation?: string }) => {
      const keys = MODEL_QUERY_KEYS[data?.model ?? ""] ?? [];
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, queryClient]);

  // Re-join rooms when the signed-in identity changes on an open connection.
  useEffect(() => {
    if (!socket?.connected || !user) return;
    socket.emit("join_user", user.id);
    socket.emit("join_role", user.role);
  }, [socket, user]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
}
