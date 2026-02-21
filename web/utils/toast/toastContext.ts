import { createContext, ReactNode } from "react";

export const ToastContext = createContext<
  | {
      isOpen: boolean;
      message: string | ReactNode;
      open: (message: string | ReactNode) => void;
    }
  | undefined
>(undefined);
