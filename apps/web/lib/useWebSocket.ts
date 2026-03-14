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
  const wsRef = useRef<WebSocket | null>(null); // Initially wsRef.current = null , after connection wsRef.current = WebSocket instance
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [users, setUsers] = useState<string[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    shouldReconnectRef.current = true;

    const token = getToken();
    if (!token) {
      setConnectionState("error");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // prevents opening multiple WebSocket connections. If there's already an open connection, it simply returns without doing anything.
      return;
    }

    setConnectionState("connecting"); //The hook updates its internal state. This can be used by the component to show a loading indicator or disable certain UI elements until the connection is established.

    const ws = new WebSocket(`${WS_URL}?token=${token}`); // A new WebSocket connection is created using the provided URL and token. The token is typically used for authentication or authorization purposes when connecting to the WebSocket server.
    wsRef.current = ws; // Store the websocket instance in the ref for later use

    ws.onopen = () => {
      //event fires when the WebSocket successfully connects. 
      setConnectionState("connected");
      reconnectAttemptsRef.current = 0;

      ws.send(
        JSON.stringify({
          type: "join-room",
          roomId,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (message.type === "user-joined") {
          setUsers((prev) => [
            ...prev.filter((id) => id !== message.userId),
            message.userId,
          ]); // remove the userId if it already exists in the users array , add the new user
        } else if (message.type === "user-left") {
          setUsers((prev) => prev.filter((id) => id !== message.userId)); //  remove the userId from the users array when a user leaves the room
        }

        onMessageRef.current?.(message);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      wsRef.current = null;

      if (
        shouldReconnectRef.current &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      setConnectionState("error");
    };
  }, [roomId]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "leave-room",
            roomId,
          }),
        );
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("disconnected");
    setUsers([]);
  }, [roomId]);

  const sendDraw = useCallback(
    (payload: DrawPayload) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "draw",
            roomId,
            payload,
          }),
        );
      }
    },
    [roomId],
  );

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
