"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addRoomMember,
  getRoom,
  getRoomMembers,
  type Room,
  type RoomMember,
} from "@/lib/api/room";
import { getToken, getUser, isAuthenticated } from "@/lib/authStorage";
import Whiteboard from "@/components/Whiteboard";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [collaboratorError, setCollaboratorError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = getUser();
  const isAdmin = Boolean(room && currentUser?.id === room.admin.id);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

    async function fetchRoom() {
      try {
        setLoading(true);
        const token = getToken();
        const roomData = await getRoom(slug);
        setRoom(roomData);

        if (token) {
          const roomMembers = await getRoomMembers(slug, token);
          setMembers(roomMembers);
        }

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

  async function handleAddCollaborator(e: React.FormEvent) {
    e.preventDefault();

    const token = getToken();
    if (!token || !collaboratorEmail.trim()) return;

    setAddingCollaborator(true);
    setCollaboratorError(null);

    try {
      const member = await addRoomMember(slug, collaboratorEmail.trim(), token);
      setMembers((prev) => [
        ...prev.filter((existing) => existing.id !== member.id),
        member,
      ]);
      setCollaboratorEmail("");
    } catch (err) {
      setCollaboratorError(
        err instanceof Error ? err.message : "Failed to add collaborator"
      );
    } finally {
      setAddingCollaborator(false);
    }
  }

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

      <section className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium">Collaborators</p>
            <p className="text-xs text-gray-600">
              {members.length === 0
                ? "No collaborators added yet"
                : members.map((member) => member.name).join(", ")}
            </p>
          </div>

          {isAdmin && (
            <form onSubmit={handleAddCollaborator} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={collaboratorEmail}
                onChange={(e) => setCollaboratorEmail(e.target.value)}
                placeholder="collaborator@example.com"
                aria-label="Collaborator email"
                className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!collaboratorEmail.trim() || addingCollaborator}
                className={`px-4 py-2 text-sm text-white rounded transition-colors ${
                  collaboratorEmail.trim() && !addingCollaborator
                    ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {addingCollaborator ? "Adding..." : "Add"}
              </button>
            </form>
          )}
        </div>
        {collaboratorError && (
          <p className="mt-2 text-sm text-red-500">{collaboratorError}</p>
        )}
      </section>

      <main className="flex-1 overflow-hidden">
        <Whiteboard roomId={slug} />
      </main>
    </div>
  );
}

