import React from 'react';

export class PlayerStatusContainer extends React.Component {
  render() {
    return <div className="grid grid-cols-2 gap-4">{this.props.children}</div>;
  }
}
