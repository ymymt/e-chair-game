import React from 'react';

var ChevronRight = React.createClass({
  render: function() {
    var props = this.props;
    return React.DOM.svg({
      xmlns: 'http://www.w3.org/2000/svg',
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: props.className || ''
    },
      React.DOM.path({d: 'm9 18 6-6-6-6'})
    );
  }
});

export { ChevronRight };
