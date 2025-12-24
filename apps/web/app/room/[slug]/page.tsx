"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoom, type Room } from "@/lib/api/room";
import { isAuthenticated } from "@/lib/authStorage";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

    // Fetch room data
    async function fetchRoom() {
      try {
        setLoading(true);
        const roomData = await getRoom(slug);
        setRoom(roomData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load room");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchRoom();
    }
  }, [slug, router]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading room...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "red" }}>{error || "Room not found"}</p>
        <button onClick={() => router.push("/")}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
        <h1>Room: {room.slug}</h1>
        <p>Admin: {room.admin.name}</p>
      </header>

      <main style={{ flex: 1, position: "relative" }}>
        {/* Whiteboard canvas will go here */}
        <div
          style={{
            width: "100%",
            height: "100%",
            border: "2px solid #333",
            background: "#fff",
          }}
        >
          <p style={{ padding: "2rem", textAlign: "center" }}>
            Whiteboard canvas coming soon...
          </p>
        </div>
      </main>
    </div>
  );
}

