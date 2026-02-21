import {
  activateAction,
  changeTurnAction,
  selectChairAction,
} from "@/features/room/action";
import type { PlayerOperation } from "@/features/room/hooks/usePlayerOperation";
import { GameRoom, Round } from "@/types/room";
import { useState } from "react";
import { TooltipRefProps } from "react-tooltip";

type useRoomActionsProps = {
  roomId: string | null;
  userId: string | null;
  tooltipRef: React.MutableRefObject<TooltipRefProps | null>;
  roomData: GameRoom | null;
  playerOperation: PlayerOperation;
};

export function useRoomActions({
  roomId,
  userId,
  tooltipRef,
  roomData,
  playerOperation,
}: useRoomActionsProps) {
  const [selectedChair, setSelectedChair] = useState<number | null>(null);

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
    const result = await selectChairAction({
      roomId: roomId,
      roundData: getSubmitRoundData(selectedChair),
    });
    setSelectState({ status: result.status, error: result.error });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId!);
      tooltipRef?.current?.open({
        anchorSelect: "#id-tooltip",
        content: "IDをコピーしました",
      });
    } catch (error) {
      console.error(error);
      tooltipRef?.current?.open({
        anchorSelect: "#id-tooltip",
        content: "IDをコピーできませんでした",
      });
    }
  };

  const submitActivate = async (onBeforeActivate?: () => void) => {
    onBeforeActivate?.();
    const res = await activateAction(roomId!);
    if (res.status !== 200) {
      console.error(res.error);
    }
  };

  const changeTurn = async (
    onBeforeChange?: () => void,
    onAfterActivate?: () => void
  ) => {
    onBeforeChange?.();
    const res = await changeTurnAction({
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
    submitActivate,
    changeTurn,
  };
}
