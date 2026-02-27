import React from 'react';

var ChairContainer = React.createClass({
  render: function() {
    return React.DOM.div({className: 'relative w-full max-w-md aspect-square mx-auto'},
      this.props.children
    );
  }
});

export { ChairContainer };
