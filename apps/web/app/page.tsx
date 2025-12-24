"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, clearAuth } from "@/lib/authStorage";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string>("");
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthenticated(auth);
    if (auth) {
      const userData = getUser();
      setUser(userData);
    }
  }, []);

  function handleLogout() {
    clearAuth();
    setAuthenticated(false);
    setUser(null);
  }

  if (!authenticated) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ marginBottom: "2rem" }}>Welcome to Collaborative Whiteboard</h1>
          <p style={{ marginBottom: "2rem" }}>Please login or sign up to continue</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <a
              href="/login"
              style={{
                padding: "0.75rem 1.5rem",
                background: "#0070f3",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Login
            </a>
            <a
              href="/signup"
              style={{
                padding: "0.75rem 1.5rem",
                background: "#333",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div style={{ padding: "1rem", borderBottom: "1px solid #ccc", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontWeight: "bold" }}>Welcome, {user?.name}!</p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "1rem" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Join a Room</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room slug"
            aria-label="Room ID"
            style={{
              flex: 1,
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && roomId.trim()) {
                router.push(`/room/${roomId.trim()}`);
              }
            }}
          />
          <button
            onClick={() => {
              if (roomId.trim()) {
                router.push(`/room/${roomId.trim()}`);
              }
            }}
            disabled={!roomId.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background: roomId.trim() ? "#0070f3" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: roomId.trim() ? "pointer" : "not-allowed",
            }}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
