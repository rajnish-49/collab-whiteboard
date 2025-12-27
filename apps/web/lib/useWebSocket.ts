"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from "./authStorage";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseWebSocketOptions {
  roomId: string;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface DrawPayload {
  elements: unknown[];
}

export type WebSocketMessage =
  | { type: "joined-room"; roomId: string }
  | { type: "user-joined"; roomId: string; userId: string }
  | { type: "user-left"; roomId: string; userId: string }
  | { type: "draw"; roomId: string; userId: string; payload: DrawPayload }
  | { type: "error"; message: string };

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4002";

export function useWebSocket({ roomId, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [users, setUsers] = useState<string[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      setConnectionState("error");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState("connecting");

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState("connected");
      reconnectAttemptsRef.current = 0;

      ws.send(JSON.stringify({
        type: "join-room",
        roomId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === "user-joined") {
          setUsers((prev) => [...prev.filter((id) => id !== message.userId), message.userId]);
        } else if (message.type === "user-left") {
          setUsers((prev) => prev.filter((id) => id !== message.userId));
        }

        onMessage?.(message);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      wsRef.current = null;

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      setConnectionState("error");
    };
  }, [roomId, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "leave-room",
          roomId,
        }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("disconnected");
    setUsers([]);
  }, [roomId]);

  const sendDraw = useCallback((payload: DrawPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "draw",
        roomId,
        payload,
      }));
    }
  }, [roomId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connectionState,
    users,
    sendDraw,
    reconnect: connect,
  };
}

