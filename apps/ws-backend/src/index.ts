import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prismaclient, Prisma } from "@repo/db";


interface DecodedToken extends JwtPayload {
  userId: string;
  username?: string;
}

interface UserConnection {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
}

interface DrawPayload {
  elements: unknown[];
}

type IncomingMessage =
  | { type: "join-room"; roomId: string }
  | { type: "leave-room"; roomId: string }
  | { type: "draw"; roomId: string; payload: DrawPayload };


const connections = new Map<WebSocket, UserConnection>();
const rooms = new Map<string, Set<WebSocket>>();
const saveTimers = new Map<string, NodeJS.Timeout>();

function sendError(ws: WebSocket, message: string) {
  ws.send(JSON.stringify({ type: "error", message }));
}

function isDrawPayload(payload: unknown): payload is DrawPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "elements" in payload &&
    Array.isArray((payload as DrawPayload).elements)
  );
}

async function roomExists(roomSlug: string) {
  const room = await prismaclient.room.findUnique({
    where: { slug: roomSlug },
    select: { id: true },
  });

  return Boolean(room);
}

async function persistDrawing(roomSlug: string, elements: Prisma.InputJsonValue) {
  try {
    const room = await prismaclient.room.findUnique({
      where: { slug: roomSlug },
      select: { id: true },
    });

    if (!room) return;

    await prismaclient.drawingState.upsert({
      where: { roomId: room.id },
      create: { roomId: room.id, elements },
      update: { elements },
    });
  } catch (err) {
    console.error("Failed to persist drawing:", err);
  }
}

function debouncedSave(roomSlug: string, elements: Prisma.InputJsonValue) {
  const existing = saveTimers.get(roomSlug);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    persistDrawing(roomSlug, elements);
    saveTimers.delete(roomSlug);
  }, 1000);

  saveTimers.set(roomSlug, timer);
}


function checkUser(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("userId" in decoded)
    ) {
      return null;
    }

    return decoded as DecodedToken;
  } catch {
    return null;
  }
}

const wss = new WebSocketServer({ port: 4002 });

wss.on("connection", (ws, request) => {
  const url = request.url;
  if (!url) {
    ws.close(1008, "Invalid connection");
    return;
  }

  const queryString = url.includes("?") ? url.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const token = params.get("token");

  if (!token) {
    ws.close(1008, "No token provided");
    return;
  }

  const decoded = checkUser(token);
  if (!decoded) {
    ws.close(1008, "Invalid token");
    return;
  }

  const conn: UserConnection = {
    ws,
    userId: decoded.userId,
    rooms: new Set(),
  };

  connections.set(ws, conn);

  console.log("Connected:", conn.userId);

  ws.on("message", (raw) => {
    const connection = connections.get(ws);
    if (!connection) return;

    let message: IncomingMessage;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendError(ws, "Invalid JSON");
      return;
    }

    if (message.type === "join-room") {
      const { roomId } = message;

      if (connection.rooms.has(roomId)) return;

      void (async () => {
        if (!(await roomExists(roomId))) {
          sendError(ws, "Room not found");
          return;
        }

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }

        rooms.get(roomId)!.add(ws);
        connection.rooms.add(roomId);

        for (const member of rooms.get(roomId)!) {
          if (member !== ws) {
            member.send(
              JSON.stringify({
                type: "user-joined",
                roomId,
                userId: connection.userId,
              })
            );
          }
        }

        ws.send(
          JSON.stringify({
            type: "joined-room",
            roomId,
          })
        );
      })();
      return;
    }


    if (message.type === "leave-room") {
      const { roomId } = message;

      if (!connection.rooms.has(roomId)) return;

      connection.rooms.delete(roomId);
      const room = rooms.get(roomId);

      if (room) {
        room.delete(ws);

        for (const member of room) {
          member.send(
            JSON.stringify({
              type: "user-left",
              roomId,
              userId: connection.userId,
            })
          );
        }

        if (room.size === 0) {
          rooms.delete(roomId);
        }
      }
    }


    if (message.type === "draw") {
      const { roomId, payload } = message;

      if (!connection.rooms.has(roomId)) return;
      if (!isDrawPayload(payload)) {
        sendError(ws, "Invalid draw payload");
        return;
      }

      const room = rooms.get(roomId);
      if (!room) return;

      for (const member of room) {
        if (member !== ws) {
          member.send(
            JSON.stringify({
              type: "draw",
              roomId,
              userId: connection.userId,
              payload,
            })
          );
        }
      }

      debouncedSave(roomId, payload.elements as Prisma.InputJsonValue);
    }
  });

  ws.on("close", () => {
    const connection = connections.get(ws);
    if (!connection) return;

    for (const roomId of connection.rooms) {
      const room = rooms.get(roomId);
      if (room) {
        room.delete(ws);

        for (const member of room) {
          member.send(
            JSON.stringify({
              type: "user-left",
              roomId,
              userId: connection.userId,
            })
          );
        }

        if (room.size === 0) {
          rooms.delete(roomId);
        }
      }
    }

    connections.delete(ws);
    console.log("Disconnected:", connection.userId);
  });
});
