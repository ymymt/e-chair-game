import React from "react";

import { Button } from "@/components/buttons/Button";

type TopOperationsProps = {
  formAction: () => Promise<void>;
  joinAction: () => void;
};

export function TopOperations({ formAction, joinAction }: TopOperationsProps) {
  return (
    <div className="flex flex-col gap-4 space-y-1.5 p-6 pt-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          formAction();
        }}
        className="flex flex-col gap-4"
      >
        <Button>ルームを作成</Button>
        <Button
          type="button"
          onClick={() => joinAction()}
          bgColor="bg-gray-600"
        >
          ルームに入室
        </Button>
      </form>
    </div>
  );
}
