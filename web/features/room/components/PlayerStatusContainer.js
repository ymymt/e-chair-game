import React from 'react';

var PlayerStatusContainer = React.createClass({
  render: function() {
    return React.DOM.div({className: 'grid grid-cols-2 gap-4'}, this.props.children);
  }
});

export { PlayerStatusContainer };
