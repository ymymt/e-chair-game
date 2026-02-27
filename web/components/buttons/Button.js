import React from 'react';

var Button = React.createClass({
  render: function() {
    var props = this.props;
    var type = props.type || 'submit';
    var textColor = props.textColor || 'text-white';
    var bgColor = props.bgColor || 'bg-red-500';
    var styles = props.styles || '';
    var disabled = props.disabled || false;

    return React.DOM.button({
      type: type,
      className: 'inline-flex h-10 w-full justify-center items-center rounded-full ' + bgColor + ' ' + textColor + ' font-bold text-sm ' + styles,
      onClick: props.onClick,
      disabled: disabled
    },
      props.children
    );
  }
});

export { Button };
