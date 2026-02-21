import React from 'react';
import { Button } from '@/components/buttons/Button';
import { InfoDialog } from '@/components/dialogs/InfoDialog';

export function NoticeDialog(props) {
  return (
    <InfoDialog dialogRef={props.dialogRef}>
      <div>
        <h2 className="font-semibold text-red-500">
          <span>{props.title}</span>
        </h2>
        <p className="pt-1 text-gray-300">{props.message}</p>
      </div>
      <Button onClick={props.button.action}>{props.button.label}</Button>
    </InfoDialog>
  );
}
