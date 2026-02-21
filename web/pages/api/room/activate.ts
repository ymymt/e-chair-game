import type { NextApiRequest, NextApiResponse } from "next";
import { getRoom, updateRoom } from "@/libs/firestore";
import type { GameRoom, Player } from "@/types/room";
import { isSuccessfulGetRoomResponse } from "@/utils/room";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const roomId = req.body?.roomId as string | undefined;
  if (!roomId) {
    res.status(400).json({ status: 400, error: "ルームIDを指定してください" });
    return;
  }

  const room = await getRoom(roomId);

  if (!isSuccessfulGetRoomResponse(room)) {
    res.status(room.status).json({ status: room.status, error: room.error });
    return;
  }

  const { players, round } = room.data;
  const isShocked = round.electricChair === round.seatedChair;

  const updatedPlayers = players.map((player) => {
    if (player.id === round.attackerId) {
      return {
        ...player,
        point: isShocked ? 0 : player.point + (round.seatedChair || 0),
        shockedCount: isShocked ? player.shockedCount + 1 : player.shockedCount,
      };
    }
    return player;
  });

  const remainingChairs = isShocked
    ? room.data.remainingChairs
    : room.data.remainingChairs.filter((chair) => chair !== round.seatedChair);

  let winnerId = null;
  const attackerId = round.attackerId;
  const defenderId = room.data.players.find(
    (player) => player.id !== attackerId
  )?.id;

  if (updatedPlayers.some((player) => player.point >= 40)) {
    winnerId = round.attackerId;
  } else if (updatedPlayers.some((player) => player.shockedCount === 3)) {
    winnerId = defenderId;
  } else if (remainingChairs.length === 1) {
    const winner = updatedPlayers.reduce((prev, current) => {
      if (current.point > prev.point) {
        return current;
      } else if (current.point === prev.point) {
        return { id: "draw" } as Player;
      }
      return prev;
    });
    winnerId = winner.id;
  }

  const data: Partial<GameRoom> = {
    players: updatedPlayers,
    remainingChairs,
    winnerId,
    round: {
      ...round,
      phase: "result",
      result: {
        ...round.result,
        status: isShocked ? "shocked" : "safe",
      },
    },
  };

  const updateResult = await updateRoom(roomId, data);

  if (updateResult.status !== 200) {
    res
      .status(updateResult.status)
      .json({ status: updateResult.status, error: updateResult.error });
    return;
  }

  res.status(200).json({ status: 200, error: "" });
}
