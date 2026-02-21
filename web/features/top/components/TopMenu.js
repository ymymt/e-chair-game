import React from 'react';

export function TopMenu(props) {
  return (
    <div className="rounded-lg text-card-foreground shadow-sm w-full max-w-md bg-gray-800 border-2 border-red-500">
      {props.children}
    </div>
  );
}
