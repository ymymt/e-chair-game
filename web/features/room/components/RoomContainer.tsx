import React from "react";

import { ReactNode } from "react";

type RoomContainerProps = {
  children: ReactNode;
};

export function RoomContainer({ children }: RoomContainerProps) {
  return (
    <div className="min-h-screen text-white p-4 grid grid-cols-1 auto-rows-max gap-8">
      {children}
    </div>
  );
}
