import React from 'react';
import { InfoDialog } from '@/components/dialogs/InfoDialog';
import { Copy } from '@/components/icons/Copy';

var CreaterWaitingStartDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.infoDialog.getDialogNode();
  },
  render: function() {
    var props = this.props;
    return InfoDialog({ref: 'infoDialog'},
      React.DOM.div(null,
        React.DOM.h2({className: 'font-semibold text-red-500'},
          React.DOM.span(null, 'ルームを作成しました')
        ),
        React.DOM.p({className: 'pt-1 text-gray-300'},
          '下記のルームIDを対戦相手に伝えてください。'
        ),
        React.DOM.p({className: 'pt-1 text-gray-300'},
          '対戦相手が入室しだい、ゲームを開始します。'
        )
      ),
      React.DOM.div({className: 'flex gap-2 m-auto text-center text-2xl text-red-500'},
        React.DOM.span(null, props.roomId),
        React.DOM.div(null,
          React.DOM.button({
            type: 'button',
            title: props.copyMessage,
            className: 'cursor-pointer',
            onClick: props.copyId
          },
            Copy({className: 'text-red-800'})
          )
        )
      )
    );
  }
});

export { CreaterWaitingStartDialog };
