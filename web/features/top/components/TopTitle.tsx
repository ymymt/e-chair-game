import React from "react";

import { Zap } from "lucide-react";

export function TopTitle() {
  return (
    <div className="p-6">
      <h1 className="flex gap-3 items-center justify-center text-3xl text-center font-semibold text-red-500">
        <Zap className="animate-pulse" />
        <span>電気椅子ゲーム</span>
        <Zap className="animate-pulse" />
      </h1>
      <h2 className="pt-1 text-md text-center text-gray-300">
        緊張と興奮の椅子取り合戦
      </h2>
    </div>
  );
}
