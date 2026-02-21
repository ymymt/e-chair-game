import React from "react";

import { Button } from "@/components/buttons/Button";
import { InfoDialog } from "@/components/dialogs/InfoDialog";
import { Ref } from "react";

type NoticeDialogProps = {
  dialogRef: Ref<HTMLDialogElement>;
  title: string;
  message: string;
  button: {
    label: string;
    action: () => void;
  };
};

export function NoticeDialog({
  dialogRef,
  title,
  message,
  button,
}: NoticeDialogProps) {
  return (
    <InfoDialog ref={dialogRef}>
      <div>
        <h2 className="font-semibold text-red-500">
          <span>{title}</span>
        </h2>
        <p className="pt-1 text-gray-300">{message}</p>
      </div>
      <Button onClick={button.action}>{button.label}</Button>
    </InfoDialog>
  );
}
