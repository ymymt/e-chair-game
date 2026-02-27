import React from 'react';

var InfoDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.dialog.getDOMNode();
  },
  render: function() {
    var props = this.props;
    var border = props.borderColor ? props.borderColor : 'border-red-500';
    return React.DOM.div({ref: 'dialog', style: {display: 'none'}},
      React.DOM.div({className: 'fixed inset-0 bg-black/80 z-50'}),
      React.DOM.div({className: 'fixed min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full'},
        React.DOM.div({
          className: 'animate-scale-in grid gap-4 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 ' + border
        },
          props.children
        )
      )
    );
  }
});

export { InfoDialog };
