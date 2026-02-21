import React from 'react';
import { Howl } from 'howler';

import { toastShape } from '@/utils/toast/ToastProvider';

import { Chair } from '@/features/room/components/Chair';
import { PlayerStatus } from '@/features/room/components/PlayerStatus';
import { RoundStatus } from '@/features/room/components/RoundStatus';
import { CreaterWaitingStartDialog } from '@/features/room/components/dialogs/CreaterWaitingStartDialog';
import { StartTurnDialog } from '@/features/room/components/dialogs/StartTurnDialog';
import { GameResultDialog } from '@/features/room/components/dialogs/GameResultDialog';
import { TurnResultDialog } from '@/features/room/components/dialogs/TurnResultDialog';

import { InstructionMessage } from '@/features/room/components/InstructionMessage';
import { ActivateEffect } from '@/features/room/components/ActivateEffect';
import { RoomContainer } from '@/features/room/components/RoomContainer';
import { GameStatusContainer } from '@/features/room/components/GameStatusContainer';
import { ChairContainer } from '@/features/room/components/ChairContainer';
import { InstructionContainer } from '@/features/room/components/InstructionContainer';
import { PlayerStatusContainer } from '@/features/room/components/PlayerStatusContainer';
import { Button } from '@/components/buttons/Button';
import { NoticeDialog } from '@/components/dialogs/notice/NoticeDailog';

import { selectChairApi, activateApi, changeTurnApi } from '@/libs/api';
import { RoomPhaseHandlers } from '@/features/room/hooks/roomPhaseHandlers';

var firestoreConfig = require('@/libs/firestore/config');
var firestoreLib = require('firebase/firestore');

class Room extends React.Component {
  constructor(props) {
    super(props);

    var initialData = props.initialData;
    this.state = {
      roomData: initialData.room,
      selectedChair: null,
      selectState: { status: 0, error: '' },
      copyTooltip: 'クリックしてコピー',
      showShock: '',
      noticeDialogState: {
        title: '',
        message: '',
        button: { label: '', action: function() {} },
      },
    };

    this.userId = initialData.userId;
    this.roomId = initialData.roomId;
    this.previousRoomData = null;
    this.unsubscribePromise = null;

    // Sound effects
    this.shockSound = new Howl({ src: ['/static/sounds/shock.mp3'] });
    this.safeSound = new Howl({ src: ['/static/sounds/safe.mp3'] });

    // Dialog refs
    this.noticeDialogRef = null;
    this.waitingCreaterStartDialogRef = null;
    this.startTurnDialogRef = null;
    this.turnResultDialogRef = null;
    this.gameResultDialogRef = null;

    // Bind methods
    this.setNoticeDialogRef = this.setNoticeDialogRef.bind(this);
    this.setWaitingCreaterStartDialogRef = this.setWaitingCreaterStartDialogRef.bind(this);
    this.setStartTurnDialogRef = this.setStartTurnDialogRef.bind(this);
    this.setTurnResultDialogRef = this.setTurnResultDialogRef.bind(this);
    this.setGameResultDialogRef = this.setGameResultDialogRef.bind(this);
    this.showNoticeModal = this.showNoticeModal.bind(this);
    this.closeNoticeModal = this.closeNoticeModal.bind(this);
    this.showCreaterWaitingStartModal = this.showCreaterWaitingStartModal.bind(this);
    this.closeCreaterWaitingStartModal = this.closeCreaterWaitingStartModal.bind(this);
    this.showStartTurnModal = this.showStartTurnModal.bind(this);
    this.showTurnResultModal = this.showTurnResultModal.bind(this);
    this.closeTurnResultModal = this.closeTurnResultModal.bind(this);
    this.showGameResultModal = this.showGameResultModal.bind(this);
    this.selectChair = this.selectChair.bind(this);
    this.handleSubmitActivate = this.handleSubmitActivate.bind(this);
    this.handleChangeTurn = this.handleChangeTurn.bind(this);
    this.copyRoomId = this.copyRoomId.bind(this);
    this.setSelectedChair = this.setSelectedChair.bind(this);
    this.setShowShock = this.setShowShock.bind(this);
    this.playShockEffect = this.playShockEffect.bind(this);
    this.playSafeEffect = this.playSafeEffect.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  // === Dialog ref setters (callback refs) ===

  setNoticeDialogRef(el) { this.noticeDialogRef = el; }
  setWaitingCreaterStartDialogRef(el) { this.waitingCreaterStartDialogRef = el; }
  setStartTurnDialogRef(el) { this.startTurnDialogRef = el; }
  setTurnResultDialogRef(el) { this.turnResultDialogRef = el; }
  setGameResultDialogRef(el) { this.gameResultDialogRef = el; }

  // === Dialog show/close methods ===

  showNoticeModal(data, miliseconds) {
    if (this.noticeDialogRef) {
      this.noticeDialogRef.showModal();
      this.setState({
        noticeDialogState: {
          title: data.title,
          message: data.message,
          button: data.button,
        },
      });
    }
    if (miliseconds) {
      var self = this;
      setTimeout(function() {
        self.closeNoticeModal();
      }, miliseconds);
    }
  }

  closeNoticeModal() {
    if (this.noticeDialogRef) {
      this.noticeDialogRef.close();
    }
  }

  showCreaterWaitingStartModal() {
    if (this.waitingCreaterStartDialogRef) {
      this.waitingCreaterStartDialogRef.showModal();
    }
  }

  closeCreaterWaitingStartModal() {
    if (this.waitingCreaterStartDialogRef) {
      this.waitingCreaterStartDialogRef.close();
    }
  }

  showStartTurnModal(miliseconds) {
    if (this.startTurnDialogRef) {
      this.startTurnDialogRef.showModal();
    }
    if (miliseconds) {
      var self = this;
      setTimeout(function() {
        if (self.startTurnDialogRef) {
          self.startTurnDialogRef.close();
        }
      }, miliseconds);
    }
  }

  showTurnResultModal() {
    if (this.turnResultDialogRef) {
      this.turnResultDialogRef.showModal();
    }
  }

  closeTurnResultModal() {
    if (this.turnResultDialogRef) {
      this.turnResultDialogRef.close();
    }
  }

  showGameResultModal() {
    if (this.gameResultDialogRef) {
      this.gameResultDialogRef.showModal();
    }
  }

  // === Sound methods ===

  playShockEffect(options) {
    if (options && options.playbackRate) {
      this.shockSound.rate(options.playbackRate);
    }
    this.shockSound.play();
  }

  playSafeEffect() {
    this.safeSound.play();
  }

  // === State setters ===

  setSelectedChair(chair) {
    this.setState({ selectedChair: chair });
  }

  setShowShock(value) {
    this.setState({ showShock: value });
  }

  // === Player operation (computed from state) ===

  getPlayerOperation() {
    var roomData = this.state.roomData;
    var userId = this.userId;
    var operation = {
      setElectricShock: false,
      selectSitChair: false,
      activate: false,
      wait: false,
    };
    if (
      roomData && roomData.round.attackerId !== userId &&
      roomData.round.electricChair === null
    ) {
      operation.setElectricShock = true;
    } else if (
      roomData && roomData.round.attackerId === userId &&
      roomData.round.electricChair !== null &&
      roomData.round.seatedChair === null
    ) {
      operation.selectSitChair = true;
    } else if (
      roomData && roomData.round.phase === 'activating' &&
      roomData.round.attackerId !== userId
    ) {
      operation.activate = true;
    } else {
      operation.wait = true;
    }
    return operation;
  }

  // === Room actions ===

  getSubmitRoundData(selectedChair) {
    var roomData = this.state.roomData;
    var playerOperation = this.getPlayerOperation();
    var round = roomData && roomData.round;
    if (playerOperation.setElectricShock) {
      return {
        count: round.count,
        turn: round.turn,
        attackerId: round.attackerId,
        phase: 'sitting',
        electricChair: selectedChair,
        seatedChair: round.seatedChair,
        result: round.result,
      };
    } else if (playerOperation.selectSitChair) {
      return {
        count: round.count,
        turn: round.turn,
        attackerId: round.attackerId,
        phase: 'activating',
        electricChair: round.electricChair,
        seatedChair: selectedChair,
        result: round.result,
      };
    }
    return round;
  }

  async selectChair() {
    var result = await selectChairApi({
      roomId: this.roomId,
      roundData: this.getSubmitRoundData(this.state.selectedChair),
    });
    this.setState({ selectState: { status: result.status, error: result.error } });
  }

  async copyRoomId() {
    try {
      await navigator.clipboard.writeText(this.roomId);
      this.setState({ copyTooltip: 'IDをコピーしました' });
    } catch (error) {
      console.error(error);
      this.setState({ copyTooltip: 'IDをコピーできませんでした' });
    }
  }

  async handleSubmitActivate() {
    this.closeNoticeModal();
    var res = await activateApi(this.roomId);
    if (res.status !== 200) {
      console.error(res.error);
    }
  }

  async handleChangeTurn() {
    this.closeTurnResultModal();
    var res = await changeTurnApi({
      roomId: this.roomId,
      userId: this.userId,
    });
    if (res.status !== 200) {
      console.error(res.error);
    }
    this.setState({ selectedChair: null });
  }

  isAllReady() {
    var roomData = this.state.roomData;
    if (!roomData) return false;
    return (
      roomData.players.length === 2 &&
      roomData.players.every(function(player) { return player.ready; })
    );
  }

  handleFormSubmit(e) {
    e.preventDefault();
    this.selectChair();
  }

  // === Lifecycle ===

  componentDidMount() {
    var self = this;
    this.unsubscribePromise = (async function() {
      var db = await firestoreConfig.getFirestoreApp();
      var docRef = firestoreLib.doc(db, 'rooms', self.roomId);
      var unsubscribe = firestoreLib.onSnapshot(docRef, function(docSnap) {
        var data = docSnap.data();
        self.setState(function(prevState) {
          if (data.round.phase === 'activating') {
            self.previousRoomData = prevState.roomData;
          }
          return { roomData: data };
        });
      });
      return unsubscribe;
    })();
  }

  componentWillUnmount() {
    if (this.unsubscribePromise) {
      this.unsubscribePromise.then(function(unsubscribe) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    var roomData = this.state.roomData;
    var prevRoomData = prevState.roomData;

    // Toast on chair selection (equivalent to useEffect on selectState)
    if (
      this.state.selectState !== prevState.selectState &&
      this.state.selectedChair
    ) {
      var toast = this.context.toast;
      if (toast) {
        var message = this.state.selectState.status === 200
          ? '番の椅子を選択しました。'
          : '椅子の選択に失敗しました。';
        toast.open(
          React.createElement(
            'span',
            null,
            React.createElement(
              'span',
              { style: { color: 'red', fontWeight: 'bold', fontSize: '1.2rem' } },
              this.state.selectedChair
            ),
            message
          )
        );
      }
    }

    // Room effect (equivalent to useRoomEffect)
    if (roomData !== prevRoomData && roomData) {
      var allReady = this.isAllReady();
      var userId = this.userId;
      var isCreater = roomData.createrId === userId;
      var isAttacker = roomData.round.attackerId === userId;
      var isDefender = roomData.round.attackerId !== userId;

      if (!allReady && isCreater) {
        this.showCreaterWaitingStartModal();
      }

      if (allReady) {
        this.closeCreaterWaitingStartModal();

        if (roomData.round.phase === 'setting') {
          this.showStartTurnModal(2000);
          if (isDefender) {
            RoomPhaseHandlers.handleSettingPhase(
              this.showNoticeModal,
              this.closeNoticeModal
            );
          }
        }

        if (roomData.round.phase === 'sitting' && isAttacker) {
          RoomPhaseHandlers.handleSittingPhase(this.showNoticeModal, this.closeNoticeModal);
        }
      }
      if (roomData.round.phase === 'activating' && isDefender) {
        RoomPhaseHandlers.handleActivatingPhase(
          this.showNoticeModal,
          this.handleSubmitActivate
        );
      }
      if (
        roomData.round.phase === 'result' &&
        !roomData.round.result.shownResult
      ) {
        RoomPhaseHandlers.handleResultPhase(
          roomData,
          this.showGameResultModal,
          this.showTurnResultModal,
          this.setShowShock,
          this.playShockEffect,
          this.playSafeEffect
        );
      }
    }
  }

  render() {
    var roomData = this.state.roomData;
    var userId = this.userId;
    var roomId = this.roomId;
    var playerOperation = this.getPlayerOperation();
    var self = this;

    return (
      <RoomContainer>
        <GameStatusContainer>
          <RoundStatus round={roomData && roomData.round} userId={userId} />
          <PlayerStatusContainer>
            <PlayerStatus
              userId={userId}
              status={roomData && roomData.players.find(function(p) { return p.id === userId; })}
            />
            <PlayerStatus
              userId={userId}
              status={roomData && roomData.players.find(function(p) { return p.id !== userId; })}
            />
          </PlayerStatusContainer>
        </GameStatusContainer>
        <form onSubmit={this.handleFormSubmit}>
          <ChairContainer>
            {roomData && roomData.remainingChairs.map(function(chair) {
              return (
                <Chair
                  key={chair}
                  chair={chair}
                  setSelectedChair={self.setSelectedChair}
                  wait={playerOperation.wait}
                  selected={self.state.selectedChair === chair}
                />
              );
            })}
            {this.isAllReady() && (
              <InstructionContainer>
                <InstructionMessage
                  playerOperation={playerOperation}
                  round={roomData && roomData.round}
                  userId={userId}
                />
              </InstructionContainer>
            )}
          </ChairContainer>
          {!playerOperation.wait &&
            !playerOperation.activate &&
            this.state.selectedChair && (
              <div className="sticky bottom-3">
                <Button styles="border-2 border-red-700">確定</Button>
              </div>
            )}
        </form>
        <NoticeDialog
          dialogRef={this.setNoticeDialogRef}
          title={this.state.noticeDialogState.title}
          message={this.state.noticeDialogState.message}
          button={this.state.noticeDialogState.button}
        />
        <CreaterWaitingStartDialog
          roomId={roomId}
          dialogRef={this.setWaitingCreaterStartDialogRef}
          copyId={this.copyRoomId}
          copyMessage={this.state.copyTooltip}
        />
        <StartTurnDialog
          dialogRef={this.setStartTurnDialogRef}
          round={roomData ? roomData.round : { count: 1, turn: 'top', attackerId: '', phase: 'setting' }}
          userId={userId}
        />
        <TurnResultDialog
          dialogRef={this.setTurnResultDialogRef}
          roomData={roomData}
          previousRoomData={this.previousRoomData}
          userId={userId}
          close={this.handleChangeTurn}
        />
        <GameResultDialog
          dialogRef={this.setGameResultDialogRef}
          roomData={roomData}
          userId={userId}
          close={function() { window.location.href = '/'; }}
        />
        <ActivateEffect result={this.state.showShock} />
      </RoomContainer>
    );
  }
}

Room.contextTypes = {
  toast: toastShape,
};

export default Room;
