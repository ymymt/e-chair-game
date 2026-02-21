import { Button } from "@/components/buttons/Button";
import { GameRoom } from "@/types/room";
import { Skull, Trophy, Meh } from "lucide-react";
import { forwardRef } from "react";

type GameResultDialogProps = {
  roomData: GameRoom;
  userId: string;
  close: () => void;
};

export const GameResultDialog = forwardRef<HTMLDialogElement, GameResultDialogProps>(
  function GameResultDialog({ roomData, userId, close }, ref) {
    const isWinner = roomData?.winnerId === userId;
    const isDraw = roomData?.winnerId === "draw";

    const myStatus = roomData?.players.find((player) => player.id === userId);
    const opponentStatus = roomData?.players.find(
      (player) => player.id !== userId
    );

    const borderColor = isWinner
      ? "border-yellow-500"
      : isDraw
      ? "border-gray-500"
      : "border-red-500";
    const bgColor = isWinner
      ? "bg-yellow-500"
      : isDraw
      ? "bg-gray-500"
      : "bg-red-500";
    const animation = isWinner
      ? "animate-winner-result-dialog"
      : isDraw
      ? "animate-draw-result-dialog"
      : "animate-loser-result-dialog";

    const getWinningCondition = () => {
      if (opponentStatus === undefined || myStatus === undefined) return "";
      if (isWinner) {
        if (myStatus.point >= 40) {
          return "40ポイント以上獲得しました";
        } else if (opponentStatus.shockedCount === 3) {
          return "相手が3回感電しました";
        }
        return "獲得ポイントで上回りました";
      } else if (isDraw) {
        return "合計獲得ポイントが同じでした";
      } else {
        if (opponentStatus.point >= 40) {
          return "相手が40ポイント以上獲得しました";
        } else if (myStatus.shockedCount === 3) {
          return "3回感電しました";
        }
        return "相手が獲得ポイントで上回りました";
      }
    };

    return (
      <dialog
        className="min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent backdrop:bg-black/80 shadow-sm w-full"
        ref={ref}
      >
        <div
          className={`${animation} grid place-items-center gap-4 backdrop:bg-black/80 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 ${borderColor}`}
        >
          <div className="flex items-center flex-col gap-4">
            <h2 className="font-semibold text-red-500">ゲーム終了</h2>
            {isWinner ? (
              <Trophy className="text-yellow-500 w-24 h-24 animate-pulse" />
            ) : isDraw ? (
              <Meh className="text-gray-500 w-24 h-24 animate-pulse" />
            ) : (
              <Skull className="text-red-500 w-24 h-24 animate-pulse" />
            )}
            <div className="font-bold text-white text-4xl">
              {isWinner ? "勝利!" : isDraw ? "引き分け" : "敗北..."}
            </div>
            <p className="text-white text-center font-bold text-2xl">
              {getWinningCondition()}
            </p>
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="text-white font-bold text-md">あなたのスコア</div>
                <div className="text-gray-400">獲得ポイント</div>
                <div className="font-bold text-green-500 text-4xl">
                  {myStatus?.point}
                </div>
                <div className="text-gray-400">感電回数</div>
                <div className="font-bold text-red-500 text-4xl">
                  {myStatus?.shockedCount}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-white font-bold text-md">相手のスコア</div>
                <div className="text-gray-400">獲得ポイント</div>
                <div className="font-bold text-green-500 text-4xl">
                  {opponentStatus?.point}
                </div>
                <div className="text-gray-400">感電回数</div>
                <div className="font-bold text-red-500 text-4xl">
                  {opponentStatus?.shockedCount}
                </div>
              </div>
            </div>
          </div>
          <Button onClick={close} bgColor={bgColor}>
            ゲーム終了
          </Button>
        </div>
      </dialog>
    );
  }
);
