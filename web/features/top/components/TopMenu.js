import React from 'react';

export class TopMenu extends React.Component {
  render() {
    return (
      <div className="rounded-lg text-card-foreground shadow-sm w-full max-w-md bg-gray-800 border-2 border-red-500">
        {this.props.children}
      </div>
    );
  }
}
