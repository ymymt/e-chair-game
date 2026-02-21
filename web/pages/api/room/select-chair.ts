import type { NextApiRequest, NextApiResponse } from "next";
import { updateRoom } from "@/libs/firestore";
import type { Round } from "@/types/room";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { roomId, roundData } = req.body as {
    roomId?: string;
    roundData?: Round;
  };

  if (!roomId || !roundData) {
    res
      .status(400)
      .json({ status: 400, error: "ルームIDとラウンドデータを指定してください" });
    return;
  }

  const result = await updateRoom(roomId, { round: roundData });
  if (result.status !== 200) {
    res.status(result.status).json({ status: result.status, error: result.error });
    return;
  }

  res.status(200).json({ status: 200, error: "" });
}
