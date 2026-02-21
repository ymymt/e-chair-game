import React from 'react';
import { Button } from '@/components/buttons/Button';
import { ChevronRight } from '@/components/icons/ChevronRight';

export function TurnResultDialog(props) {
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

  return (
    <dialog
      className="min-w-fit max-w-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2  backdrop:bg-black/80 shadow-sm w-full"
      ref={props.dialogRef}
    >
      <div className="grid place-items-center gap-4 backdrop:bg-black/80 p-6 text-card-foreground shadow-sm w-full bg-gray-800 border-2 border-red-500">
        <div className="flex items-center flex-col gap-4">
          <h2 className="font-semibold text-red-500">
            <span className="text-3xl">{headingText}</span>
          </h2>
          <p className="pt-1 text-2xl font-semibold text-gray-300">
            {bodyText1}
          </p>
          <div className="flex gap-6">
            <div className="flex flex-col items-center">
              <div className="text-gray-400">電気椅子</div>
              <div className="font-bold text-white text-4xl">
                {roomData && roomData.round && roomData.round.electricChair}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-400">座った椅子</div>
              <div className="font-bold text-white text-4xl">
                {roomData && roomData.round && roomData.round.seatedChair}
              </div>
            </div>
          </div>
          <p className="pt-1 text-xl font-semibold text-gray-300">
            {roomData && roomData.round && roomData.round.attackerId === userId ? 'あなたの' : '相手の'}
            スコアが更新されました
          </p>
          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="text-gray-400">ポイント</div>
              <div className="flex justify-center items-center">
                <div className="font-bold text-white text-3xl">
                  {attackerPreviousStatus && attackerPreviousStatus.point}
                </div>
                <ChevronRight className="w-8 h-8 text-gray-500" />
                <div
                  className={'font-bold text-4xl ' + scoreColor(
                    'point',
                    attackerPreviousStatus ? attackerPreviousStatus.point : 0,
                    attackerStatus ? attackerStatus.point : 0
                  )}
                >
                  {attackerStatus && attackerStatus.point}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-gray-400">感電回数</div>
              <div className="flex justify-center items-center">
                <div className="font-bold text-white text-3xl">
                  {attackerPreviousStatus && attackerPreviousStatus.shockedCount}
                </div>
                <ChevronRight className="w-8 h-8 text-gray-500" />
                <div
                  className={'font-bold text-4xl ' + scoreColor(
                    'shockedCount',
                    attackerPreviousStatus ? attackerPreviousStatus.shockedCount : 0,
                    attackerStatus ? attackerStatus.shockedCount : 0
                  )}
                >
                  {attackerStatus && attackerStatus.shockedCount}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={close}>次へ進む</Button>
      </div>
    </dialog>
  );
}
