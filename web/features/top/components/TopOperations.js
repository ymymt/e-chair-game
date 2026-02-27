import React from 'react';
import { Button } from '@/components/buttons/Button';

var TopOperations = React.createClass({
  render: function() {
    var props = this.props;
    return React.DOM.div({className: 'flex flex-col gap-4 space-y-1.5 p-6 pt-0'},
      React.DOM.form({
        onSubmit: function(e) {
          e.preventDefault();
          props.formAction();
        },
        className: 'flex flex-col gap-4'
      },
        [Button(null, 'ルームを作成'),
        Button({
          type: 'button',
          onClick: function() { props.joinAction(); },
          bgColor: 'bg-gray-600'
        }, 'ルームに入室')]
      )
    );
  }
});

export { TopOperations };
