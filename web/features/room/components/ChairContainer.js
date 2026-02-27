import React from 'react';

var ChairContainer = React.createClass({
  render: function() {
    return (
      <div className="relative w-full max-w-md aspect-square mx-auto">
        {this.props.children}
      </div>
    );
  }
});

export { ChairContainer };
