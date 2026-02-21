import React from "react";

import { ReactNode } from "react";

type ChairContainerProps = {
  children: ReactNode;
};

export function ChairContainer({ children }: ChairContainerProps) {
  return (
    <div className="relative w-full max-w-md aspect-square mx-auto">
      {children}
    </div>
  );
}
