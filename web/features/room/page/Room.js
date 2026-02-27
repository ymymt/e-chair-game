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

var Room = React.createClass({
  contextTypes: {
    toast: toastShape,
  },

  getInitialState: function() {
    var initialData = this.props.initialData;

    this.userId = initialData.userId;
    this.roomId = initialData.roomId;
    this.previousRoomData = null;
    this.unsubscribePromise = null;

    // Sound effects
    this.shockSound = new Howl({ src: ['/static/sounds/shock.mp3'] });
    this.safeSound = new Howl({ src: ['/static/sounds/safe.mp3'] });

    return {
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
  },

  // === Dialog node getters (string ref chain) ===

  getNoticeDialogNode: function() {
    return this.refs.noticeDialog.getDialogNode();
  },

  getWaitingCreaterStartDialogNode: function() {
    return this.refs.waitingCreaterStartDialog.getDialogNode();
  },

  getStartTurnDialogNode: function() {
    return this.refs.startTurnDialog.getDialogNode();
  },

  getTurnResultDialogNode: function() {
    return this.refs.turnResultDialog.getDialogNode();
  },

  getGameResultDialogNode: function() {
    return this.refs.gameResultDialog.getDialogNode();
  },

  // === Dialog show/close methods ===

  showNoticeModal: function(data, miliseconds) {
    var node = this.getNoticeDialogNode();
    if (node) {
      node.showModal();
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
  },

  closeNoticeModal: function() {
    var node = this.getNoticeDialogNode();
    if (node) {
      node.close();
    }
  },

  showCreaterWaitingStartModal: function() {
    var node = this.getWaitingCreaterStartDialogNode();
    if (node) {
      node.showModal();
    }
  },

  closeCreaterWaitingStartModal: function() {
    var node = this.getWaitingCreaterStartDialogNode();
    if (node) {
      node.close();
    }
  },

  showStartTurnModal: function(miliseconds) {
    var node = this.getStartTurnDialogNode();
    if (node) {
      node.showModal();
    }
    if (miliseconds) {
      var self = this;
      setTimeout(function() {
        var n = self.getStartTurnDialogNode();
        if (n) {
          n.close();
        }
      }, miliseconds);
    }
  },

  showTurnResultModal: function() {
    var node = this.getTurnResultDialogNode();
    if (node) {
      node.showModal();
    }
  },

  closeTurnResultModal: function() {
    var node = this.getTurnResultDialogNode();
    if (node) {
      node.close();
    }
  },

  showGameResultModal: function() {
    var node = this.getGameResultDialogNode();
    if (node) {
      node.showModal();
    }
  },

  // === Sound methods ===

  playShockEffect: function(options) {
    if (options && options.playbackRate) {
      this.shockSound.rate(options.playbackRate);
    }
    this.shockSound.play();
  },

  playSafeEffect: function() {
    this.safeSound.play();
  },

  // === State setters ===

  setSelectedChair: function(chair) {
    this.setState({ selectedChair: chair });
  },

  setShowShock: function(value) {
    this.setState({ showShock: value });
  },

  // === Player operation (computed from state) ===

  getPlayerOperation: function() {
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
  },

  // === Room actions ===

  getSubmitRoundData: function(selectedChair) {
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
  },

  selectChair: async function() {
    var result = await selectChairApi({
      roomId: this.roomId,
      roundData: this.getSubmitRoundData(this.state.selectedChair),
    });
    this.setState({ selectState: { status: result.status, error: result.error } });
  },

  copyRoomId: async function() {
    try {
      await navigator.clipboard.writeText(this.roomId);
      this.setState({ copyTooltip: 'IDをコピーしました' });
    } catch (error) {
      console.error(error);
      this.setState({ copyTooltip: 'IDをコピーできませんでした' });
    }
  },

  handleSubmitActivate: async function() {
    this.closeNoticeModal();
    var res = await activateApi(this.roomId);
    if (res.status !== 200) {
      console.error(res.error);
    }
  },

  handleChangeTurn: async function() {
    this.closeTurnResultModal();
    var res = await changeTurnApi({
      roomId: this.roomId,
      userId: this.userId,
    });
    if (res.status !== 200) {
      console.error(res.error);
    }
    this.setState({ selectedChair: null });
  },

  isAllReady: function() {
    var roomData = this.state.roomData;
    if (!roomData) return false;
    return (
      roomData.players.length === 2 &&
      roomData.players.every(function(player) { return player.ready; })
    );
  },

  handleFormSubmit: function(e) {
    e.preventDefault();
    this.selectChair();
  },

  // === Lifecycle ===

  componentDidMount: function() {
    var self = this;
    this.unsubscribePromise = (async function() {
      var db = await firestoreConfig.getFirestoreApp();
      var docRef = firestoreLib.doc(db, 'rooms', self.roomId);
      var unsubscribe = firestoreLib.onSnapshot(docRef, function(docSnap) {
        var data = docSnap.data();
        if (data.round.phase === 'activating') {
          self.previousRoomData = self.state.roomData;
        }
        self.setState({ roomData: data });
      });
      return unsubscribe;
    })();
  },

  componentWillUnmount: function() {
    if (this.unsubscribePromise) {
      this.unsubscribePromise.then(function(unsubscribe) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
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
          React.DOM.span(null,
            React.DOM.span(
              {style: {color: 'red', fontWeight: 'bold', fontSize: '1.2rem'}},
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
  },

  render: function() {
    var roomData = this.state.roomData;
    var userId = this.userId;
    var roomId = this.roomId;
    var playerOperation = this.getPlayerOperation();
    var self = this;

    return RoomContainer(null,
      GameStatusContainer(null,
        RoundStatus({round: roomData && roomData.round, userId: userId}),
        PlayerStatusContainer(null,
          PlayerStatus({
            userId: userId,
            status: roomData && roomData.players.find(function(p) { return p.id === userId; })
          }),
          PlayerStatus({
            userId: userId,
            status: roomData && roomData.players.find(function(p) { return p.id !== userId; })
          })
        )
      ),
      React.DOM.form({onSubmit: this.handleFormSubmit},
        ChairContainer(null,
          roomData && roomData.remainingChairs.map(function(chair) {
            return Chair({
              key: chair,
              chair: chair,
              setSelectedChair: self.setSelectedChair,
              wait: playerOperation.wait,
              selected: self.state.selectedChair === chair
            });
          }),
          this.isAllReady() && InstructionContainer(null,
            InstructionMessage({
              playerOperation: playerOperation,
              round: roomData && roomData.round,
              userId: userId
            })
          )
        ),
        !playerOperation.wait &&
          !playerOperation.activate &&
          this.state.selectedChair &&
          React.DOM.div({className: 'sticky bottom-3'},
            Button({styles: 'border-2 border-red-700'}, '確定')
          )
      ),
      NoticeDialog({
        ref: 'noticeDialog',
        title: this.state.noticeDialogState.title,
        message: this.state.noticeDialogState.message,
        button: this.state.noticeDialogState.button
      }),
      CreaterWaitingStartDialog({
        roomId: roomId,
        ref: 'waitingCreaterStartDialog',
        copyId: this.copyRoomId,
        copyMessage: this.state.copyTooltip
      }),
      StartTurnDialog({
        ref: 'startTurnDialog',
        round: roomData ? roomData.round : {count: 1, turn: 'top', attackerId: '', phase: 'setting'},
        userId: userId
      }),
      TurnResultDialog({
        ref: 'turnResultDialog',
        roomData: roomData,
        previousRoomData: this.previousRoomData,
        userId: userId,
        close: this.handleChangeTurn
      }),
      GameResultDialog({
        ref: 'gameResultDialog',
        roomData: roomData,
        userId: userId,
        close: function() { window.location.href = '/'; }
      }),
      ActivateEffect({result: this.state.showShock})
    );
  }
});

export default Room;
