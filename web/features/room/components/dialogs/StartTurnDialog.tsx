import React from "react";

import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Round } from "@/types/room";
import { Armchair, Zap } from "lucide-react";
import { Ref } from "react";

type StartTurnDialogProps = {
  dialogRef: Ref<HTMLDialogElement>;
  round: Round;
  userId: string;
};

export function StartTurnDialog({
  dialogRef,
  round,
  userId,
}: StartTurnDialogProps) {
  return (
    <InfoDialog
      ref={dialogRef}
      borderColor={
        round.attackerId === userId ? "border-emerald-500" : "border-orange-500"
      }
    >
      <div className="animate-flip-in-ver-right flex flex-col items-center gap-4">
        <h2
          className={`font-semibold text-3xl ${
            round.attackerId === userId ? "text-emerald-500" : "text-orange-500"
          }`}
        >
          {round.count === 1 && round.turn === "top" ? (
            <span>ゲーム開始</span>
          ) : (
            <span>攻守交代</span>
          )}
        </h2>
        <p className="pt-1 text-lg font-bold text-gray-300">
          {round.attackerId === userId
            ? "電流を避けて椅子に座れ"
            : "電流を仕掛けて相手に座らせろ"}
        </p>
        <div className="flex justify-center">
          {round.attackerId === userId ? (
            <Armchair className="w-24 h-24 text-emerald-500 animate-pulse" />
          ) : (
            <Zap className="w-24 h-24 text-orange-500 animate-pulse" />
          )}
        </div>
      </div>
    </InfoDialog>
  );
}
