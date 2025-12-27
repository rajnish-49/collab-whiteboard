import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common";


interface DecodedToken extends JwtPayload {
  userId: string;
  username?: string;
}

interface UserConnection {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
}

type IncomingMessage =
  | { type: "join-room"; roomId: string }
  | { type: "leave-room"; roomId: string }
  | { type: "draw"; roomId: string; payload: any };


const connections = new Map<WebSocket, UserConnection>();
const rooms = new Map<string, Set<WebSocket>>();


function checkUser(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string);

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

  // message 

  ws.on("message", (raw) => {
    const connection = connections.get(ws);
    if (!connection) return;

    let message: IncomingMessage;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // join

    if (message.type === "join-room") {
      const { roomId } = message;

      if (connection.rooms.has(roomId)) 
      return;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      rooms.get(roomId)!.add(ws);
      connection.rooms.add(roomId);

      // notify others
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
