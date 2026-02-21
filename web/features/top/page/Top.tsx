import React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createRoomApi, joinRoomApi } from "@/libs/api";
import { useDialog } from "@/hooks/useDialog";
import { JoinDialog } from "@/features/top/components/dialogs/JoinDialog";
import { useToast } from "@/utils/toast/useToast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { TopMenu } from "@/features/top/components/TopMenu";
import { TopTitle } from "@/features/top/components/TopTitle";
import { TopOperations } from "@/features/top/components/TopOperations";

export function Top() {
  const router = useRouter();
  const toast = useToast();
  const {
    dialogRef: joinDialogRef,
    isShow: isShowJoinDialog,
    showModal: showJoinModal,
    closeModal: closeJoinModal,
  } = useDialog();

  const [isCreating, setIsCreating] = useState(false);
  const [createState, setCreateState] = useState<{ error?: string }>({ error: "" });
  const createAction = async () => {
    setIsCreating(true);
    try {
      const result = await createRoomApi();
      setCreateState({ error: result.error });
      if (result.roomId) {
        router.push(`/room/${result.roomId}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const [isJoining, setIsJoining] = useState(false);
  const [joinState, setJoinState] = useState<{ error: string | undefined }>({
    error: "",
  });
  const joinAction = async (formData: FormData) => {
    const roomId = formData.get("roomId")?.toString() ?? "";
    if (!roomId) {
      setJoinState({ error: "ルームIDを入力してください" });
      return;
    }
    setIsJoining(true);
    try {
      const result = await joinRoomApi(roomId);
      setJoinState({ error: result.error });
      if (result.roomId) {
        router.push(`/room/${result.roomId}`);
      }
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (isJoining || !isShowJoinDialog) {
      setJoinState({ error: "" });
    }
  }, [isJoining, isShowJoinDialog]);

  useEffect(() => {
    if (createState.error) {
      toast.open(createState.error);
    }
  }, [createState.error, toast]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 grid place-items-center">
      <TopMenu>
        <TopTitle />
        <TopOperations formAction={createAction} joinAction={showJoinModal} />
      </TopMenu>
      <JoinDialog
        dialogRef={joinDialogRef}
        joinAction={joinAction}
        joinState={joinState}
        isJoining={isJoining}
        closeJoinModal={closeJoinModal}
      />
      {isCreating && <LoadingOverlay />}
    </div>
  );
}
