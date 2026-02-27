import React from 'react';
import { Button } from '@/components/buttons/Button';
import { ChevronRight } from '@/components/icons/ChevronRight';

var TurnResultDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.dialog.getDOMNode();
  },
  render: function() {
    var props = this.props;
    var roomData = props.roomData;
    var previousRoomData = props.previousRoomData;
    var userId = props.userId;
    var close = props.close;

    var isAttacker = roomData && roomData.round && roomData.round.attackerId === userId;
    var isShocked = roomData && roomData.round && roomData.round.result.status === 'shocked';

    var attackerPreviousStatus = null;
    var attackerStatus = null;
    if (previousRoomData && previousRoomData.players && roomData && roomData.round) {
      for (var i = 0; i < previousRoomData.players.length; i++) {
        if (previousRoomData.players[i].id === roomData.round.attackerId) {
          attackerPreviousStatus = previousRoomData.players[i];
          break;
        }
      }
    }
    if (roomData && roomData.players && roomData.round) {
      for (var j = 0; j < roomData.players.length; j++) {
        if (roomData.players[j].id === roomData.round.attackerId) {
          attackerStatus = roomData.players[j];
          break;
        }
      }
    }

    var scoreColor = function(type, previous, current) {
      if (type === 'point') {
        if (current > previous) return 'text-green-500';
        if (current < previous) return 'text-red-500';
      }
      if (type === 'shockedCount') {
        if (current > previous) return 'text-red-500';
      }
      return 'text-white';
    };

    var headingText = isShocked ? '感電！' : 'セーフ';

    var bodyText1 = isShocked
      ? isAttacker
        ? '電気椅子に座ってしまいました...'
        : '電気椅子に座らせました'
      : isAttacker
      ? '電気椅子を回避しました'
      : '電気椅子を回避されました...';

    return React.DOM.div({ref: 'dialog', style: {display: 'none'}},
      [React.DOM.div({className: 'fixed inset-0 bg-black/80 z-50'}),
      React.DOM.div({className: 'fixed min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full'},
        React.DOM.div({className: 'grid place-items-center gap-4 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 border-red-500'},
        [React.DOM.div({className: 'flex items-center flex-col gap-4'},
          [React.DOM.h2({className: 'font-semibold text-red-500'},
            React.DOM.span({className: 'text-3xl'}, headingText)
          ),
          React.DOM.p({className: 'pt-1 text-2xl font-semibold text-gray-300'},
            bodyText1
          ),
          React.DOM.div({className: 'flex gap-6'},
            [React.DOM.div({className: 'flex flex-col items-center'},
              [React.DOM.div({className: 'text-gray-400'}, '電気椅子'),
              React.DOM.div({className: 'font-bold text-white text-4xl'},
                roomData && roomData.round && roomData.round.electricChair
              )]
            ),
            React.DOM.div({className: 'flex flex-col items-center'},
              [React.DOM.div({className: 'text-gray-400'}, '座った椅子'),
              React.DOM.div({className: 'font-bold text-white text-4xl'},
                roomData && roomData.round && roomData.round.seatedChair
              )]
            )]
          ),
          React.DOM.p({className: 'pt-1 text-xl font-semibold text-gray-300'},
            [roomData && roomData.round && roomData.round.attackerId === userId ? 'あなたの' : '相手の',
            'スコアが更新されました']
          ),
          React.DOM.div({className: 'flex gap-8'},
            [React.DOM.div({className: 'flex flex-col items-center'},
              [React.DOM.div({className: 'text-gray-400'}, 'ポイント'),
              React.DOM.div({className: 'flex justify-center items-center'},
                [React.DOM.div({className: 'font-bold text-white text-3xl'},
                  attackerPreviousStatus && attackerPreviousStatus.point
                ),
                ChevronRight({className: 'w-8 h-8 text-gray-500'}),
                React.DOM.div({
                  className: 'font-bold text-4xl ' + scoreColor(
                    'point',
                    attackerPreviousStatus ? attackerPreviousStatus.point : 0,
                    attackerStatus ? attackerStatus.point : 0
                  )
                },
                  attackerStatus && attackerStatus.point
                )]
              )]
            ),
            React.DOM.div({className: 'flex flex-col items-center'},
              [React.DOM.div({className: 'text-gray-400'}, '感電回数'),
              React.DOM.div({className: 'flex justify-center items-center'},
                [React.DOM.div({className: 'font-bold text-white text-3xl'},
                  attackerPreviousStatus && attackerPreviousStatus.shockedCount
                ),
                ChevronRight({className: 'w-8 h-8 text-gray-500'}),
                React.DOM.div({
                  className: 'font-bold text-4xl ' + scoreColor(
                    'shockedCount',
                    attackerPreviousStatus ? attackerPreviousStatus.shockedCount : 0,
                    attackerStatus ? attackerStatus.shockedCount : 0
                  )
                },
                  attackerStatus && attackerStatus.shockedCount
                )]
              )]
            )]
          )]
        ),
        Button({onClick: close}, '次へ進む')]
        )
      )]
    );
  }
});

export { TurnResultDialog };
