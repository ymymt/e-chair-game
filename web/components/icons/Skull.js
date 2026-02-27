import React from 'react';

var Skull = React.createClass({
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
      [React.DOM.circle({cx: '9', cy: '12', r: '1'}),
      React.DOM.circle({cx: '15', cy: '12', r: '1'}),
      React.DOM.path({d: 'M8 20v2h8v-2'}),
      React.DOM.path({d: 'm12.5 17-.5-1-.5 1h1z'}),
      React.DOM.path({d: 'M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20'})]
    );
  }
});

export { Skull };
