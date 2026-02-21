import React from 'react';
import { Button } from '@/components/buttons/Button';
import { InfoDialog } from '@/components/dialogs/InfoDialog';

var JoinDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.infoDialog.getDialogNode();
  },
  render: function() {
    var props = this.props;
    return (
      <InfoDialog ref="infoDialog">
        <div>
          <form
            onSubmit={function(e) {
              e.preventDefault();
              props.joinAction(new FormData(e.currentTarget));
            }}
          >
            <h2 className="font-semibold text-red-500">
              <span>ルーム入室</span>
            </h2>
            <div className="flex flex-col gap-4 m-auto">
              <p className="pt-1 text-gray-300">ルームIDを入力してください</p>
              <div>
                <input
                  type="text"
                  name="roomId"
                  spellCheck="false"
                  className="w-full bg-gray-700 text-gray-300 p-2 rounded-md"
                />
                {props.joinState && props.joinState.error && (
                  <p className="text-red-500 text-sm">{props.joinState.error}</p>
                )}
              </div>
              <div className="grid gap-4 grid-cols-2">
                <Button
                  type="button"
                  onClick={function() { props.closeJoinModal(); }}
                  bgColor="bg-gray-700"
                  disabled={props.isJoining}
                >
                  キャンセル
                </Button>
                <Button>
                  {props.isJoining ? (
                    <span className="animate-pulse">入室中...</span>
                  ) : (
                    '入室'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </InfoDialog>
    );
  }
});

export { JoinDialog };
