import React from 'react';
import { Button } from '@/components/buttons/Button';
import { InfoDialog } from '@/components/dialogs/InfoDialog';

var JoinDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.infoDialog.getDialogNode();
  },
  render: function() {
    var props = this.props;
    return InfoDialog({ref: 'infoDialog'},
      React.DOM.div(null,
        React.DOM.form({
          onSubmit: function(e) {
            e.preventDefault();
            props.joinAction(new FormData(e.target));
          }
        },
          [React.DOM.h2({className: 'font-semibold text-red-500'},
            React.DOM.span(null, 'ルーム入室')
          ),
          React.DOM.div({className: 'flex flex-col gap-4 m-auto'},
            [React.DOM.p({className: 'pt-1 text-gray-300'}, 'ルームIDを入力してください'),
            React.DOM.div(null,
              [React.DOM.input({
                type: 'text',
                name: 'roomId',
                spellCheck: 'false',
                className: 'w-full bg-gray-700 text-gray-300 p-2 rounded-md'
              }),
              props.joinState && props.joinState.error &&
                React.DOM.p({className: 'text-red-500 text-sm'}, props.joinState.error)]
            ),
            React.DOM.div({className: 'grid gap-4 grid-cols-2'},
              [Button({
                type: 'button',
                onClick: function() { props.closeJoinModal(); },
                bgColor: 'bg-gray-700',
                disabled: props.isJoining
              }, 'キャンセル'),
              Button(null,
                props.isJoining
                  ? React.DOM.span({className: 'animate-pulse'}, '入室中...')
                  : '入室'
              )]
            )]
          )]
        )
      )
    );
  }
});

export { JoinDialog };
