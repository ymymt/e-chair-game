import React from 'react';

export function InstructionMessage(props) {
  var playerOperation = props.playerOperation;
  var round = props.round;
  var userId = props.userId;

  var getInstruction = function() {
    if (playerOperation.setElectricShock) {
      return '電流を仕掛ける椅子を選んでください';
    }
    if (playerOperation.selectSitChair) {
      return '座る椅子を選んでください';
    }
    if (playerOperation.wait) {
      if (round && round.phase === 'setting') {
        return '相手が電流を仕掛けています。。。';
      }
      if (round && round.phase === 'sitting') {
        return '相手が座る椅子を選んでいます。。。';
      }
      if (round && round.phase === 'activating') {
        if (round.attackerId === userId) {
          return 'まもなく電流が起動します。。。';
        } else {
          return '電流を起動してください';
        }
      }
    }
    return 'お待ちください。。。';
  };

  return (
    <div className="text-center">
      <p
        className={'font-bold text-white text-sm bg-gray-800 bg-opacity-75 p-3 rounded-full whitespace-nowrap ' + (!playerOperation.wait ? 'animate-pulse' : '')}
      >
        {getInstruction()}
      </p>
    </div>
  );
}
