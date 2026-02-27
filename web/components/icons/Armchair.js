import React from 'react';

var Armchair = React.createClass({
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
      React.DOM.path({d: 'M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3'}),
      React.DOM.path({d: 'M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z'}),
      React.DOM.path({d: 'M5 18v2'}),
      React.DOM.path({d: 'M19 18v2'})
    );
  }
});

export { Armchair };
