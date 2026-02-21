import React from 'react';

export function GameStatusContainer(props) {
  return (
    <div className="h-fit bg-gray-800 p-6 border-red-500 border-2 rounded-lg grid gap-6">
      {props.children}
    </div>
  );
}
