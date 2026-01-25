"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, clearAuth, getToken } from "@/lib/authStorage";
import { createRoom } from "@/lib/api/room";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string>("");
  const [newRoomSlug, setNewRoomSlug] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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

  async function handleCreateRoom() {
    if (!newRoomSlug.trim()) return;

    const token = getToken();
    if (!token) {
      setCreateError("Not authenticated");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const room = await createRoom(newRoomSlug.trim(), token);
      router.push(`/room/${room.slug}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h1 className="mb-8 text-3xl font-bold">Welcome to Collaborative Whiteboard</h1>
          <p className="mb-8 text-gray-600">Please login or sign up to continue</p>
          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Login
            </a>
            <a
              href="/signup"
              className="px-6 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 border-b border-gray-300 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold">Welcome, {user?.name}!</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        <h2 className="mb-4 text-xl font-semibold">Create a Room</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newRoomSlug}
            onChange={(e) => setNewRoomSlug(e.target.value)}
            placeholder="Enter new room slug (e.g., my-room)"
            aria-label="New Room Slug"
            className="flex-1 p-3 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newRoomSlug.trim()) {
                handleCreateRoom();
              }
            }}
          />
          <button
            onClick={handleCreateRoom}
            disabled={!newRoomSlug.trim() || creating}
            className={`px-6 py-3 text-white rounded transition-colors ${
              newRoomSlug.trim() && !creating
                ? "bg-green-500 hover:bg-green-600 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {creating ? "Creating..." : "Create Room"}
          </button>
        </div>
        {createError && (
          <p className="text-red-500 text-sm mt-2">{createError}</p>
        )}

        <hr className="my-8 border-t border-gray-300" />

        <h2 className="mb-4 text-xl font-semibold">Join a Room</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room slug"
            aria-label="Room ID"
            className="flex-1 p-3 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className={`px-6 py-3 text-white rounded transition-colors ${
              roomId.trim()
                ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
