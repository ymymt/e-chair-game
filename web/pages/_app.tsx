import React from "react";

import type { AppProps } from "next/app";
import { ToastProvider } from "@/utils/toast/ToastProvider";
import { Toast } from "@/utils/toast/Toast";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <div className="w-full grid place-items-center bg-gray-900">
        <div className="w-full max-w-screen-md">
          <Component {...pageProps} />
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
