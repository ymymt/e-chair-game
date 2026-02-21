import React from "react";

import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Copy } from "lucide-react";
import { Ref } from "react";
import ReactTooltip from "react-tooltip";

type CreaterWaitingStartDialogProps = {
  roomId: string;
  dialogRef: Ref<HTMLDialogElement>;
  copyMessage: string;
  copyId: () => Promise<void>;
};

export function CreaterWaitingStartDialog({
  roomId,
  dialogRef,
  copyMessage,
  copyId,
}: CreaterWaitingStartDialogProps) {
  return (
    <InfoDialog ref={dialogRef}>
      <div>
        <h2 className="font-semibold text-red-500">
          <span>ルームを作成しました</span>
        </h2>
        <p className="pt-1 text-gray-300">
          下記のルームIDを対戦相手に伝えてください。
        </p>
        <p className="pt-1 text-gray-300">
          対戦相手が入室しだい、ゲームを開始します。
        </p>
      </div>
      <div className="flex gap-2 m-auto text-center text-2xl text-red-500">
        <span>{roomId}</span>
        <div>
          <ReactTooltip id="copy-tooltip" effect="solid" />
          <button
            type="button"
            data-tip={copyMessage}
            data-for="copy-tooltip"
            className="cursor-pointer"
            onClick={copyId}
          >
            <Copy className="text-red-800" />
          </button>
        </div>
      </div>
    </InfoDialog>
  );
}
