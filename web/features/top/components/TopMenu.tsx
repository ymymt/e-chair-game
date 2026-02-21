import React from "react";

import { ReactNode } from "react";

type TopMenuProps = {
  children: ReactNode;
};

export function TopMenu({ children }: TopMenuProps) {
  return (
    <div className="rounded-lg text-card-foreground shadow-sm w-full max-w-md bg-gray-800 border-2 border-red-500">
      {children}
    </div>
  );
}
