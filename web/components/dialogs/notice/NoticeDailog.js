import React from 'react';
import { Button } from '@/components/buttons/Button';
import { InfoDialog } from '@/components/dialogs/InfoDialog';

var NoticeDialog = React.createClass({
  getDialogNode: function() {
    return this.refs.infoDialog.getDialogNode();
  },
  render: function() {
    var props = this.props;
    return (
      <InfoDialog ref="infoDialog">
        <div>
          <h2 className="font-semibold text-red-500">
            <span>{props.title}</span>
          </h2>
          <p className="pt-1 text-gray-300">{props.message}</p>
        </div>
        <Button onClick={props.button.action}>{props.button.label}</Button>
      </InfoDialog>
    );
  }
});

export { NoticeDialog };
