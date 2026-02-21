import React from "react";

import { ReactNode } from "react";

type InstructionContainerProps = {
  children: ReactNode;
};

export function InstructionContainer({ children }: InstructionContainerProps) {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      {children}
    </div>
  );
}
