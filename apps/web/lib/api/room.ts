const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";


export interface Room {
  id: number;
  slug: string;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    email: string;
  };
}

interface GetRoomResponse {
  room: Room;
}

export async function getRoom(slug: string): Promise<Room> {
  const res = await fetch(`${API_BASE_URL}/room/${slug}`);

  if (res.status === 404) {
    throw new Error("Room not found");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch room");
  }

  const data: GetRoomResponse = await res.json();
  return data.room;
}

export async function createRoom(
  slug: string,
  token: string
): Promise<Room> {
  const res = await fetch(`${API_BASE_URL}/room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ slug }),
  });

  if (res.status === 409) {
    throw new Error("Room already exists");
  }

  if (!res.ok) {
    throw new Error("Failed to create room");
  }

  const data: GetRoomResponse = await res.json();
  return data.room;
}
