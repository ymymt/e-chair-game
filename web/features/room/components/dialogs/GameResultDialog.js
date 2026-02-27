import React from 'react';
import { Button } from '@/components/buttons/Button';
import { Skull } from '@/components/icons/Skull';
import { Trophy } from '@/components/icons/Trophy';
import { Meh } from '@/components/icons/Meh';

var GameResultDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.dialog.getDOMNode();
  },
  render: function() {
    var props = this.props;
    var roomData = props.roomData;
    var userId = props.userId;
    var close = props.close;

    var isWinner = roomData && roomData.winnerId === userId;
    var isDraw = roomData && roomData.winnerId === 'draw';

    var myStatus = null;
    var opponentStatus = null;
    if (roomData && roomData.players) {
      for (var i = 0; i < roomData.players.length; i++) {
        if (roomData.players[i].id === userId) {
          myStatus = roomData.players[i];
        } else {
          opponentStatus = roomData.players[i];
        }
      }
    }

    var borderColor = isWinner
      ? 'border-yellow-500'
      : isDraw
      ? 'border-gray-500'
      : 'border-red-500';
    var bgColor = isWinner
      ? 'bg-yellow-500'
      : isDraw
      ? 'bg-gray-500'
      : 'bg-red-500';
    var animation = isWinner
      ? 'animate-winner-result-dialog'
      : isDraw
      ? 'animate-draw-result-dialog'
      : 'animate-loser-result-dialog';

    var getWinningCondition = function() {
      if (opponentStatus === null || myStatus === null) return '';
      if (isWinner) {
        if (myStatus.point >= 40) {
          return '40ポイント以上獲得しました';
        } else if (opponentStatus.shockedCount === 3) {
          return '相手が3回感電しました';
        }
        return '獲得ポイントで上回りました';
      } else if (isDraw) {
        return '合計獲得ポイントが同じでした';
      } else {
        if (opponentStatus.point >= 40) {
          return '相手が40ポイント以上獲得しました';
        } else if (myStatus.shockedCount === 3) {
          return '3回感電しました';
        }
        return '相手が獲得ポイントで上回りました';
      }
    };

    return React.DOM.dialog({
      className: 'min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-transparent backdrop:bg-black/80 shadow-sm w-full',
      ref: 'dialog'
    },
      React.DOM.div({
        className: animation + ' grid place-items-center gap-4 backdrop:bg-black/80 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 ' + borderColor
      },
        React.DOM.div({className: 'flex items-center flex-col gap-4'},
          React.DOM.h2({className: 'font-semibold text-red-500'}, 'ゲーム終了'),
          isWinner
            ? Trophy({className: 'text-yellow-500 w-24 h-24 animate-pulse'})
            : isDraw
            ? Meh({className: 'text-gray-500 w-24 h-24 animate-pulse'})
            : Skull({className: 'text-red-500 w-24 h-24 animate-pulse'}),
          React.DOM.div({className: 'font-bold text-white text-4xl'},
            isWinner ? '勝利!' : isDraw ? '引き分け' : '敗北...'
          ),
          React.DOM.p({className: 'text-white text-center font-bold text-2xl'},
            getWinningCondition()
          ),
          React.DOM.div({className: 'flex gap-6'},
            React.DOM.div({className: 'flex flex-col items-center'},
              React.DOM.div({className: 'text-white font-bold text-md'}, 'あなたのスコア'),
              React.DOM.div({className: 'text-gray-400'}, '獲得ポイント'),
              React.DOM.div({className: 'font-bold text-green-500 text-4xl'},
                myStatus && myStatus.point
              ),
              React.DOM.div({className: 'text-gray-400'}, '感電回数'),
              React.DOM.div({className: 'font-bold text-red-500 text-4xl'},
                myStatus && myStatus.shockedCount
              )
            ),
            React.DOM.div({className: 'flex flex-col items-center'},
              React.DOM.div({className: 'text-white font-bold text-md'}, '相手のスコア'),
              React.DOM.div({className: 'text-gray-400'}, '獲得ポイント'),
              React.DOM.div({className: 'font-bold text-green-500 text-4xl'},
                opponentStatus && opponentStatus.point
              ),
              React.DOM.div({className: 'text-gray-400'}, '感電回数'),
              React.DOM.div({className: 'font-bold text-red-500 text-4xl'},
                opponentStatus && opponentStatus.shockedCount
              )
            )
          )
        ),
        Button({onClick: close, bgColor: bgColor}, 'ゲーム終了')
      )
    );
  }
});

export { GameResultDialog };
