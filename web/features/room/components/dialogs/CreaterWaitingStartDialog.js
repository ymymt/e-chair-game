import React from 'react';
import { InfoDialog } from '@/components/dialogs/InfoDialog';
import { Copy } from '@/components/icons/Copy';

export function CreaterWaitingStartDialog(props) {
  return (
    <InfoDialog dialogRef={props.dialogRef}>
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
        <span>{props.roomId}</span>
        <div>
          <button
            type="button"
            title={props.copyMessage}
            className="cursor-pointer"
            onClick={props.copyId}
          >
            <Copy className="text-red-800" />
          </button>
        </div>
      </div>
    </InfoDialog>
  );
}
