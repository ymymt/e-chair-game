import React from 'react';

var ToastProvider = React.createClass({
  render: function() {
    return this.props.children;
  }
});

export { ToastProvider };
