import React from 'react';

export function InstructionContainer(props) {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      {props.children}
    </div>
  );
}
