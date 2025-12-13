import { WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common";

// object will contain all the standard JWT fields (iat, exp, etc.) plus my own (userId, username)
interface DecodedToken extends JwtPayload {
  userId: string;
  username?: string;
}

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", function connection(ws, request) {
  // ws is the connection object used to send/receive messages and  request is the HTTP upgrade request that was used to create this WebSocket connection

  const url = request.url; // only the path part (no hostname).

  if (!url) {
    ws.close(1008, "Invalid connection request");
    return;
  }

  const queryString = url.includes("?") ? url.split("?")[1] : "";
  const queryParams = new URLSearchParams(queryString); //aps keys to values, like this:

  //user  → "rajnish"
  // token → "abc123xyz"

  // "https://example.com/page?user=rajnish&age=22";
  // Output: "user=rajnish&age=22"

  const token = queryParams.get("token");
  const user = queryParams.get("user");

  if (!token) {
    ws.close(1008, "No token provided");
    return;
  }

  try {
    // calling jwt.verify(), it can return either a string or a JwtPayload object.
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (!decoded || !decoded.userId) {
      ws.close(1008, "Invalid token payload");
      return;
    }

    console.log(" Authenticated user:", decoded.userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Token verification failed:", message);
    ws.close(1008, "Invalid or expired token");
    return;
  }
});
