import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { createRoom } from "@/libs/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const result = await createRoom();
  if (result.status !== 200) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.setHeader("Set-Cookie", [
    serialize("roomId", result.roomId as string, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }),
    serialize("userId", result.userId as string, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }),
  ]);

  res.status(200).json({ roomId: result.roomId, userId: result.userId });
}
