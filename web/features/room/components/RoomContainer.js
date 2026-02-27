import React from 'react';

var RoomContainer = React.createClass({
  render: function() {
    return React.DOM.div({className: 'min-h-screen text-white p-4 grid grid-cols-1 auto-rows-max gap-8'},
      this.props.children
    );
  }
});

export { RoomContainer };
