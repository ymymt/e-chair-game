import React from 'react';

var InstructionContainer = React.createClass({
  render: function() {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {this.props.children}
      </div>
    );
  }
});

export { InstructionContainer };
