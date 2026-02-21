import React from 'react';

export class InstructionContainer extends React.Component {
  render() {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {this.props.children}
      </div>
    );
  }
}
