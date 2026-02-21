import { Button } from "@/components/buttons/Button";
import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Ref } from "react";

type JoinDialogProps = {
  dialogRef: Ref<HTMLDialogElement>;
  joinAction: (payload: FormData) => Promise<void>;
  joinState: { error: string | undefined };
  isJoining: boolean;
  closeJoinModal: () => void;
};

export function JoinDialog({
  dialogRef,
  joinAction,
  joinState,
  isJoining,
  closeJoinModal,
}: JoinDialogProps) {
  return (
    <InfoDialog ref={dialogRef}>
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            joinAction(new FormData(e.currentTarget));
          }}
        >
          <h2 className="font-semibold text-red-500">
            <span>ルーム入室</span>
          </h2>
          <div className="flex flex-col gap-4 m-auto">
            <p className="pt-1 text-gray-300">ルームIDを入力してください</p>
            <div>
              <input
                type="text"
                name="roomId"
                spellCheck="false"
                className="w-full bg-gray-700 text-gray-300 p-2 rounded-md"
              />
              {joinState?.error && (
                <p className="text-red-500 text-sm">{joinState.error}</p>
              )}
            </div>
            <div className="grid gap-4 grid-cols-2">
              <Button
                type="button"
                onClick={() => closeJoinModal()}
                bgColor="bg-gray-700"
                disabled={isJoining}
              >
                キャンセル
              </Button>
              <Button>
                {isJoining ? (
                  <span className="animate-pulse">入室中...</span>
                ) : (
                  "入室"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </InfoDialog>
  );
}
