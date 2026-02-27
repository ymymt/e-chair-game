import React from 'react';
import { Skull } from '@/components/icons/Skull';

var PlayerStatus = React.createClass({
  render: function() {
    var props = this.props;
    var userId = props.userId;
    var status = props.status;
    var playerName = status && status.id === userId ? 'あなた' : '相手';

    return (
      <div className="p-6 bg-gray-700 text-center rounded-lg">
        <p className="text-xl text-red-400 font-bold">{playerName}</p>
        {status && status.ready && (
          <div>
            <p className="text-yellow-300">得点:{status.point}</p>
            <div className="flex items-center justify-center text-red-300">
              <Skull className="mr-1" />
              <p>感電:{status.shockedCount}</p>
            </div>
          </div>
        )}
      </div>
    );
  }
});

export { PlayerStatus };
