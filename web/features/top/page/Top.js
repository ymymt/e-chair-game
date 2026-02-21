import React from 'react';
import { toastShape } from '@/utils/toast/ToastProvider';
import { createRoomApi, joinRoomApi } from '@/libs/api';
import { JoinDialog } from '@/features/top/components/dialogs/JoinDialog';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { TopMenu } from '@/features/top/components/TopMenu';
import { TopTitle } from '@/features/top/components/TopTitle';
import { TopOperations } from '@/features/top/components/TopOperations';

class Top extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isCreating: false,
      createError: '',
      isJoining: false,
      joinError: '',
      isShowJoinDialog: false,
    };
    this.joinDialogRef = null;
    this.setJoinDialogRef = this.setJoinDialogRef.bind(this);
    this.showJoinModal = this.showJoinModal.bind(this);
    this.closeJoinModal = this.closeJoinModal.bind(this);
    this.createAction = this.createAction.bind(this);
    this.joinAction = this.joinAction.bind(this);
  }

  setJoinDialogRef(el) {
    this.joinDialogRef = el;
  }

  showJoinModal() {
    if (this.joinDialogRef) {
      this.joinDialogRef.showModal();
      this.setState({ isShowJoinDialog: true });
    }
  }

  closeJoinModal() {
    if (this.joinDialogRef) {
      this.joinDialogRef.close();
      this.setState({ isShowJoinDialog: false });
    }
  }

  async createAction() {
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
  }

  async joinAction(formData) {
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
  }

  componentDidUpdate(prevProps, prevState) {
    // Clear join error when joining starts or dialog closes
    if (
      (this.state.isJoining && !prevState.isJoining) ||
      (!this.state.isShowJoinDialog && prevState.isShowJoinDialog)
    ) {
      this.setState({ joinError: '' });
    }

    // Show toast on create error
    if (this.state.createError && this.state.createError !== prevState.createError) {
      var toast = this.context.toast;
      if (toast) {
        toast.open(this.state.createError);
      }
    }
  }

  render() {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 grid place-items-center">
        <TopMenu>
          <TopTitle />
          <TopOperations formAction={this.createAction} joinAction={this.showJoinModal} />
        </TopMenu>
        <JoinDialog
          dialogRef={this.setJoinDialogRef}
          joinAction={this.joinAction}
          joinState={{ error: this.state.joinError }}
          isJoining={this.state.isJoining}
          closeJoinModal={this.closeJoinModal}
        />
        {this.state.isCreating && <LoadingOverlay />}
      </div>
    );
  }
}

Top.contextTypes = {
  toast: toastShape,
};

export { Top };
