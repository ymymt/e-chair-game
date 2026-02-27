import React from 'react';

var TopMenu = React.createClass({
  render: function() {
    return React.DOM.div({className: 'rounded-lg text-card-foreground shadow-sm w-full max-w-md bg-gray-800 border-2 border-red-500'},
      this.props.children
    );
  }
});

export { TopMenu };
