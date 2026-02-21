import { ToastContext } from "@/utils/toast/toastContext";
import React, { useState } from "react";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>("");

  const open = (
    message: string | React.ReactNode,
    milliseconds: number = 3000
  ) => {
    setIsOpen(true);
    setMessage(message);
    setTimeout(() => {
      close();
    }, milliseconds);
  };

  const close = () => {
    setIsOpen(false);
    setMessage("");
  };

  return (
    <ToastContext.Provider value={{ isOpen, message, open }}>
      {children}
    </ToastContext.Provider>
  );
}
