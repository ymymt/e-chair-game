import React from 'react';

export class ChairContainer extends React.Component {
  render() {
    return (
      <div className="relative w-full max-w-md aspect-square mx-auto">
        {this.props.children}
      </div>
    );
  }
}
