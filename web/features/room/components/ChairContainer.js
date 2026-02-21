import React from 'react';

export function ChairContainer(props) {
  return (
    <div className="relative w-full max-w-md aspect-square mx-auto">
      {props.children}
    </div>
  );
}
