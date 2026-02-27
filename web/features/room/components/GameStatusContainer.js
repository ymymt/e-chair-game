import React from 'react';

var GameStatusContainer = React.createClass({
  render: function() {
    return React.DOM.div({className: 'h-fit bg-gray-800 p-6 border-red-500 border-2 rounded-lg grid gap-6'},
      this.props.children
    );
  }
});

export { GameStatusContainer };
