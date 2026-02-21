import type { NextApiRequest, NextApiResponse } from "next";
import { confirmTurnResult } from "@/libs/firestore";
import { plainRoundData } from "@/utils/room";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const roomId = req.body?.roomId as string | undefined;
  const userId = req.body?.userId as string | undefined;

  if (!roomId || !userId) {
    res
      .status(400)
      .json({ status: 400, error: "roomId と userId を指定してください" });
    return;
  }

  const result = await confirmTurnResult(roomId, userId, (round, confirmedIds) => {
    if (confirmedIds.length === 1) {
      return {
        round: {
          ...round,
          result: {
            ...round.result,
            confirmedIds,
            shownResult: true,
          },
        },
      };
    }

    if (confirmedIds.length === 2) {
      const nextAttackerId =
        confirmedIds.find((id) => id !== round.attackerId) ?? confirmedIds[0];

      if (round.turn === "top") {
        return {
          round: {
            ...plainRoundData.round,
            attackerId: nextAttackerId,
            turn: "bottom" as const,
            count: round.count,
          },
        };
      }

      return {
        round: {
          ...plainRoundData.round,
          attackerId: nextAttackerId,
          turn: "top" as const,
          count: round.count + 1,
        },
      };
    }

    return null;
  });

  if (result.status !== 200) {
    res.status(result.status).json({ status: result.status, error: result.error });
    return;
  }

  res.status(200).json({ status: 200, error: "" });
}
