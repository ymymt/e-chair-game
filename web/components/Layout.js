import React from 'react';
import { ToastProvider } from '@/utils/toast/ToastProvider';
import { Toast } from '@/utils/toast/Toast';

export function Layout(props) {
  return (
    <ToastProvider>
      <div className="w-full grid place-items-center bg-gray-900">
        <div className="w-full max-w-screen-md">
          {props.children}
        </div>
        <Toast />
      </div>
    </ToastProvider>
  );
}
