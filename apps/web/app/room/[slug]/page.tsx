"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoom, type Room } from "@/lib/api/room";
import { isAuthenticated } from "@/lib/authStorage";
import Whiteboard from "@/components/Whiteboard";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

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
      <div className="p-8 text-center">
        <p>Loading room...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error || "Room not found"}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="p-4 border-b border-gray-300 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Room: {room.slug}</h1>
          <p className="text-sm text-gray-600">Admin: {room.admin.name}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Leave Room
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <Whiteboard roomId={slug} />
      </main>
    </div>
  );
}

