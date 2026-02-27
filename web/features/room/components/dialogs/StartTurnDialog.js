import React from 'react';
import { InfoDialog } from '@/components/dialogs/InfoDialog';
import { Armchair } from '@/components/icons/Armchair';
import { Zap } from '@/components/icons/Zap';

var StartTurnDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.infoDialog.getDialogNode();
  },
  render: function() {
    var props = this.props;
    var round = props.round;
    var userId = props.userId;
    var isAttacker = round.attackerId === userId;

    return InfoDialog({
      ref: 'infoDialog',
      borderColor: isAttacker ? 'border-emerald-500' : 'border-orange-500'
    },
      React.DOM.div({className: 'animate-flip-in-ver-right flex flex-col items-center gap-4'},
        React.DOM.h2({
          className: 'font-semibold text-3xl ' + (isAttacker ? 'text-emerald-500' : 'text-orange-500')
        },
          round.count === 1 && round.turn === 'top'
            ? React.DOM.span(null, 'ゲーム開始')
            : React.DOM.span(null, '攻守交代')
        ),
        React.DOM.p({className: 'pt-1 text-lg font-bold text-gray-300'},
          isAttacker
            ? '電流を避けて椅子に座れ'
            : '電流を仕掛けて相手に座らせろ'
        ),
        React.DOM.div({className: 'flex justify-center'},
          isAttacker
            ? Armchair({className: 'w-24 h-24 text-emerald-500 animate-pulse'})
            : Zap({className: 'w-24 h-24 text-orange-500 animate-pulse'})
        )
      )
    );
  }
});

export { StartTurnDialog };
