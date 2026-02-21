import React from "react";

import { ReactNode } from "react";

type PlayerStatusContainerProps = {
  children: ReactNode;
};

export function PlayerStatusContainer({
  children,
}: PlayerStatusContainerProps) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}
