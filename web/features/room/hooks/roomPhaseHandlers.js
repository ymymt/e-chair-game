var SHOW_NOTICE_MS = 2000;
var SHOW_DELAY_MS = 2000;
var EFFECT_DURATION_MS = 1500;

function handleSettingPhase(showNoticeModal, closeNoticeModal) {
  setTimeout(function() {
    showNoticeModal(
      {
        title: '電気椅子設置',
        message: '電流を仕掛ける椅子を選択してください',
        button: { label: 'OK', action: function() { closeNoticeModal(); } },
      },
      SHOW_NOTICE_MS
    );
  }, SHOW_DELAY_MS);
}

function handleSittingPhase(showNoticeModal, closeNoticeModal) {
  showNoticeModal(
    {
      title: '相手が電気椅子を仕掛けました',
      message: '座る椅子を選択してください',
      button: { label: 'OK', action: function() { closeNoticeModal(); } },
    },
    SHOW_DELAY_MS
  );
}

function handleActivatingPhase(showNoticeModal, submitActivate) {
  showNoticeModal({
    title: '相手が椅子に座りました',
    message: '電流を起動してください',
    button: { label: '起動', action: function() { submitActivate(); } },
  });
}

function handleResultPhase(
  roomData,
  showGameResultModal,
  showTurnResultModal,
  setShowShock,
  playShockEffect,
  playSafeEffect
) {
  var effectType =
    roomData.round.result.status === 'shocked' ? 'shock' : 'safe';
  if (effectType === 'shock') {
    playShockEffect({ playbackRate: 0.7 });
  } else {
    playSafeEffect();
  }
  setShowShock(effectType);
  setTimeout(function() {
    setShowShock('');
    if (roomData.winnerId) {
      showGameResultModal();
    } else {
      showTurnResultModal();
    }
  }, EFFECT_DURATION_MS);
}

var RoomPhaseHandlers = {
  handleSettingPhase: handleSettingPhase,
  handleSittingPhase: handleSittingPhase,
  handleActivatingPhase: handleActivatingPhase,
  handleResultPhase: handleResultPhase,
};

module.exports = { RoomPhaseHandlers: RoomPhaseHandlers };
