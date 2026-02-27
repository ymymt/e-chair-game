import React from 'react';

var RoomContainer = React.createClass({
  render: function() {
    return (
      <div className="min-h-screen text-white p-4 grid grid-cols-1 auto-rows-max gap-8">
        {this.props.children}
      </div>
    );
  }
});

export { RoomContainer };
