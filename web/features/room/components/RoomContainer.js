import React from 'react';

export class RoomContainer extends React.Component {
  render() {
    return (
      <div className="min-h-screen text-white p-4 grid grid-cols-1 auto-rows-max gap-8">
        {this.props.children}
      </div>
    );
  }
}
