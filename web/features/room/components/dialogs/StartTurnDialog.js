import React from 'react';
import { InfoDialog } from '@/components/dialogs/InfoDialog';
import { Armchair } from '@/components/icons/Armchair';
import { Zap } from '@/components/icons/Zap';

export class StartTurnDialog extends React.Component {
  render() {
    var props = this.props;
    var round = props.round;
    var userId = props.userId;
    var isAttacker = round.attackerId === userId;

    return (
      <InfoDialog
        dialogRef={props.dialogRef}
        borderColor={isAttacker ? 'border-emerald-500' : 'border-orange-500'}
      >
        <div className="animate-flip-in-ver-right flex flex-col items-center gap-4">
          <h2
            className={'font-semibold text-3xl ' + (isAttacker ? 'text-emerald-500' : 'text-orange-500')}
          >
            {round.count === 1 && round.turn === 'top' ? (
              <span>ゲーム開始</span>
            ) : (
              <span>攻守交代</span>
            )}
          </h2>
          <p className="pt-1 text-lg font-bold text-gray-300">
            {isAttacker
              ? '電流を避けて椅子に座れ'
              : '電流を仕掛けて相手に座らせろ'}
          </p>
          <div className="flex justify-center">
            {isAttacker ? (
              <Armchair className="w-24 h-24 text-emerald-500 animate-pulse" />
            ) : (
              <Zap className="w-24 h-24 text-orange-500 animate-pulse" />
            )}
          </div>
        </div>
      </InfoDialog>
    );
  }
}
