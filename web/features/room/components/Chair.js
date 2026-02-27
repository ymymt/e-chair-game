import React from 'react';

var Chair = React.createClass({
  render: function() {
    var props = this.props;
    var chair = props.chair;
    var index = chair - 1;
    var angle = ((index - 2) / 12) * 2 * Math.PI;
    var radius = 45;
    var left = 50 + radius * Math.cos(angle);
    var top = 50 + radius * Math.sin(angle);

    var bgColor = props.selected ? 'bg-white' : 'bg-gray-700';
    var textColor = props.selected ? 'text-gray-900' : 'text-white';
    var textFont = props.selected ? 'font-bold' : 'font-normal';
    var textSize = props.selected ? 'text-lg' : 'text-sm';
    var cursor = props.wait ? 'cursor-not-allowed' : 'cursor-pointer';

    return React.DOM.div({
      className: 'inline-flex items-center justify-center absolute w-12 h-12 transform -translate-x-1/2 -translate-y-1/2 ' + bgColor + ' ' + textColor + ' ' + textFont + ' ' + textSize + ' transition-all duration-300 border border-white rounded-lg ' + cursor + ' select-none',
      style: {left: left + '%', top: top + '%'},
      onClick: props.wait ? undefined : function() { props.setSelectedChair(chair); }
    },
      chair
    );
  }
});

export { Chair };
