import React from "react";

import { ReactNode } from "react";

type GameStatusContainerProps = {
  children: ReactNode;
};

export function GameStatusContainer({ children }: GameStatusContainerProps) {
  return (
    <div className="h-fit bg-gray-800 p-6 border-red-500 border-2 rounded-lg grid gap-6">
      {children}
    </div>
  );
}
