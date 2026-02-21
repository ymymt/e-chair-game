import React from 'react';

export function RoomContainer(props) {
  return (
    <div className="min-h-screen text-white p-4 grid grid-cols-1 auto-rows-max gap-8">
      {props.children}
    </div>
  );
}
