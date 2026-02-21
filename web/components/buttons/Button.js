import React from 'react';

export function Button(props) {
  var type = props.type || 'submit';
  var textColor = props.textColor || 'text-white';
  var bgColor = props.bgColor || 'bg-red-500';
  var styles = props.styles || '';
  var disabled = props.disabled || false;

  return (
    <button
      type={type}
      className={'inline-flex h-10 w-full justify-center items-center rounded-full ' + bgColor + ' ' + textColor + ' font-bold text-sm ' + styles}
      onClick={props.onClick}
      disabled={disabled}
    >
      {props.children}
    </button>
  );
}
