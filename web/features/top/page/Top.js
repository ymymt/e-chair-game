import React from 'react';
var toastStore = require('@/utils/toast/toastStore');
import { createRoomApi, joinRoomApi } from '@/libs/api';
import { JoinDialog } from '@/features/top/components/dialogs/JoinDialog';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { TopMenu } from '@/features/top/components/TopMenu';
import { TopTitle } from '@/features/top/components/TopTitle';
import { TopOperations } from '@/features/top/components/TopOperations';

var Top = React.createClass({
  getInitialState: function() {
    return {
      isCreating: false,
      createError: '',
      isJoining: false,
      joinError: '',
      isShowJoinDialog: false,
    };
  },

  getJoinDialogNode: function() {
    return this.refs.joinDialog.getDialogNode();
  },

  showJoinModal: function() {
    var node = this.getJoinDialogNode();
    if (node) {
      node.style.display = '';
      this.setState({ isShowJoinDialog: true });
    }
  },

  closeJoinModal: function() {
    var node = this.getJoinDialogNode();
    if (node) {
      node.style.display = 'none';
      this.setState({ isShowJoinDialog: false });
    }
  },

  createAction: async function() {
    this.setState({ isCreating: true });
    try {
      var result = await createRoomApi();
      this.setState({ createError: result.error || '' });
      if (result.roomId) {
        window.location.href = '/room/' + result.roomId;
      }
    } finally {
      this.setState({ isCreating: false });
    }
  },

  joinAction: async function(formData) {
    var roomId = formData.get('roomId');
    roomId = roomId ? roomId.toString() : '';
    if (!roomId) {
      this.setState({ joinError: 'ルームIDを入力してください' });
      return;
    }
    this.setState({ isJoining: true });
    try {
      var result = await joinRoomApi(roomId);
      this.setState({ joinError: result.error || '' });
      if (result.roomId) {
        window.location.href = '/room/' + result.roomId;
      }
    } finally {
      this.setState({ isJoining: false });
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
    // Clear join error when joining starts or dialog closes
    if (
      (this.state.isJoining && !prevState.isJoining) ||
      (!this.state.isShowJoinDialog && prevState.isShowJoinDialog)
    ) {
      this.setState({ joinError: '' });
    }

    // Show toast on create error
    if (this.state.createError && this.state.createError !== prevState.createError) {
      toastStore.open(this.state.createError);
    }
  },

  render: function() {
    return React.DOM.div({className: 'min-h-screen bg-gray-900 text-white p-4 grid place-items-center'},
      TopMenu(null,
        TopTitle(null),
        TopOperations({formAction: this.createAction, joinAction: this.showJoinModal})
      ),
      JoinDialog({
        ref: 'joinDialog',
        joinAction: this.joinAction,
        joinState: {error: this.state.joinError},
        isJoining: this.state.isJoining,
        closeJoinModal: this.closeJoinModal
      }),
      this.state.isCreating && LoadingOverlay(null)
    );
  }
});

export { Top };
