import React from "react";

type ChairProps = {
  chair: number;
  setSelectedChair: (chair: number) => void;
  wait: boolean;
  selected: boolean;
};

export function Chair({ chair, setSelectedChair, wait, selected }: ChairProps) {
  const index = chair - 1;
  const angle = ((index - 2) / 12) * 2 * Math.PI;
  const radius = 45;
  const left = 50 + radius * Math.cos(angle);
  const top = 50 + radius * Math.sin(angle);

  const bgColor = selected ? "bg-white" : "bg-gray-700";
  const textColor = selected ? "text-gray-900" : "text-white";
  const textFont = selected ? "font-bold" : "font-normal";
  const textSize = selected ? "text-lg" : "text-sm";
  const cursor = wait ? "cursor-not-allowed" : "cursor-pointer";

  return (
    <div
      key={chair}
      className={`inline-flex items-center justify-center absolute w-12 h-12 transform -translate-x-1/2 -translate-y-1/2 ${bgColor} ${textColor} ${textFont} ${textSize} transition-all duration-300 border border-white rounded-lg ${cursor} select-none`}
      style={{ left: `${left}%`, top: `${top}%` }}
      onClick={wait ? undefined : () => setSelectedChair(chair)}
    >
      {chair}
    </div>
  );
}
