import type { PlayerOperation } from "@/features/room/hooks/usePlayerOperation";
import { activateApi, changeTurnApi, selectChairApi } from "@/libs/api";
import { GameRoom, Round } from "@/types/room";
import { useState } from "react";

type useRoomActionsProps = {
  roomId: string | null;
  userId: string | null;
  roomData: GameRoom | null;
  playerOperation: PlayerOperation;
};

export function useRoomActions({
  roomId,
  userId,
  roomData,
  playerOperation,
}: useRoomActionsProps) {
  const [selectedChair, setSelectedChair] = useState<number | null>(null);
  const [copyTooltip, setCopyTooltip] = useState("クリックしてコピー");

  const getSubmitRoundData = (
    selectedChair: number | null
  ): Round | undefined => {
    const round = roomData?.round;
    if (playerOperation.setElectricShock) {
      return {
        ...round,
        electricChair: selectedChair,
        phase: "sitting",
      } as Round;
    } else if (playerOperation.selectSitChair) {
      return {
        ...round,
        seatedChair: selectedChair,
        phase: "activating",
      } as Round;
    } else if (playerOperation.activate) {
      const electricChair = round?.electricChair;
      const seatedChair = round?.seatedChair;
      const resultStatus = electricChair === seatedChair ? "shocked" : "safe";
      const result = round?.result;
      return {
        ...round,
        result: {
          ...result,
          status: resultStatus,
        },
        phase: "result",
      } as Round;
    }

    return round;
  };

  const [selectState, setSelectState] = useState<{
    status: number;
    error: string | undefined;
  }>({
    status: 0,
    error: "",
  });
  const selectChair = async () => {
    const result = await selectChairApi({
      roomId: roomId,
      roundData: getSubmitRoundData(selectedChair),
    });
    setSelectState({ status: result.status, error: result.error });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId!);
      setCopyTooltip("IDをコピーしました");
    } catch (error) {
      console.error(error);
      setCopyTooltip("IDをコピーできませんでした");
    }
  };

  const submitActivate = async (onBeforeActivate?: () => void) => {
    onBeforeActivate?.();
    const res = await activateApi(roomId!);
    if (res.status !== 200) {
      console.error(res.error);
    }
  };

  const changeTurn = async (
    onBeforeChange?: () => void,
    onAfterActivate?: () => void
  ) => {
    onBeforeChange?.();
    const res = await changeTurnApi({
      roomId: roomId!,
      userId: userId!,
    });
    if (res.status !== 200) {
      console.error(res.error);
    }
    onAfterActivate?.();
  };

  return {
    selectedChair,
    setSelectedChair,
    selectState,
    selectChair,
    copyRoomId,
    copyTooltip,
    submitActivate,
    changeTurn,
  };
}
