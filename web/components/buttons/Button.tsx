import React from "react";

import { ReactNode } from "react";

type ButtonProps = {
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  children: ReactNode;
  textColor?: string;
  bgColor?: string;
  styles?: string;
  disabled?: boolean;
};

export function Button({
  type = "submit",
  onClick,
  children,
  textColor = "text-white",
  bgColor = "bg-red-500",
  styles = "",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 w-full justify-center items-center rounded-full ${bgColor} ${textColor} font-bold text-sm ${styles}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
