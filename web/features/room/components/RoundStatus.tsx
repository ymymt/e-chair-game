import React from "react";

import { Round } from "@/types/room";

type RoundStatusProps = {
  round: Round | undefined;
  userId: string | null;
};

export function RoundStatus({ round, userId }: RoundStatusProps) {
  return (
    <div className="text-center text-lg">
      {round?.count}回 {round?.turn === "top" ? "表" : "裏"}
      <div>
        {round?.attackerId === userId
          ? "攻撃ターン：電気椅子を避けて座れ！"
          : "守備ターン：電気椅子に座らせろ！"}
      </div>
    </div>
  );
}
