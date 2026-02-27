import React from 'react';
import { Skull } from '@/components/icons/Skull';

var PlayerStatus = React.createClass({
  render: function() {
    var props = this.props;
    var userId = props.userId;
    var status = props.status;
    var playerName = status && status.id === userId ? 'あなた' : '相手';

    return React.DOM.div({className: 'p-6 bg-gray-700 text-center rounded-lg'},
      React.DOM.p({className: 'text-xl text-red-400 font-bold'}, playerName),
      status && status.ready && React.DOM.div(null,
        React.DOM.p({className: 'text-yellow-300'}, '得点:', status.point),
        React.DOM.div({className: 'flex items-center justify-center text-red-300'},
          Skull({className: 'mr-1'}),
          React.DOM.p(null, '感電:', status.shockedCount)
        )
      )
    );
  }
});

export { PlayerStatus };
