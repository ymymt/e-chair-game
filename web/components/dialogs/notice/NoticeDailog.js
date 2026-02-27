import React from 'react';
import { Button } from '@/components/buttons/Button';
import { InfoDialog } from '@/components/dialogs/InfoDialog';

var NoticeDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.infoDialog.getDialogNode();
  },
  render: function() {
    var props = this.props;
    return InfoDialog({ref: 'infoDialog'},
      [React.DOM.div(null,
        [React.DOM.h2({className: 'font-semibold text-red-500'},
          React.DOM.span(null, props.title)
        ),
        React.DOM.p({className: 'pt-1 text-gray-300'}, props.message)]
      ),
      Button({onClick: props.button.action}, props.button.label)]
    );
  }
});

export { NoticeDialog };
