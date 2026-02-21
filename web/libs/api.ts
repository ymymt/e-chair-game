import type { Round } from "@/types/room";

type ApiError = {
  error?: string;
};

async function postJson<TResponse>(
  url: string,
  body?: Record<string, unknown>
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as TResponse;
  return data;
}

export async function createRoomApi(): Promise<{
  roomId?: string;
  userId?: string;
  error?: string;
}> {
  return postJson("/api/room/create");
}

export async function joinRoomApi(roomId: string): Promise<{
  roomId?: string;
  userId?: string;
  error?: string;
}> {
  return postJson("/api/room/join", { roomId });
}

export async function selectChairApi(data: {
  roomId: string | null;
  roundData: Round | undefined;
}): Promise<{ status: number; error?: string }> {
  return postJson("/api/room/select-chair", data);
}

export async function activateApi(
  roomId: string
): Promise<{ status: number; error?: string }> {
  return postJson("/api/room/activate", { roomId });
}

export async function changeTurnApi(data: {
  roomId: string;
  userId: string;
}): Promise<{ status: number; error?: string }> {
  return postJson("/api/room/change-turn", data);
}
