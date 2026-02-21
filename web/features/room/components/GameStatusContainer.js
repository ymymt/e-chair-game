import React from 'react';

export class GameStatusContainer extends React.Component {
  render() {
    return (
      <div className="h-fit bg-gray-800 p-6 border-red-500 border-2 rounded-lg grid gap-6">
        {this.props.children}
      </div>
    );
  }
}
