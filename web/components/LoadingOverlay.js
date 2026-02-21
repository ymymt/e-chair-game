import React from 'react';

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]">
      <div className="animate-pulse text-white text-center flex justify-center">
        <span className="font-bold text-xl">Loading...</span>
      </div>
    </div>
  );
}
