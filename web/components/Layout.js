import React from 'react';
import { ToastProvider } from '@/utils/toast/ToastProvider';
import { Toast } from '@/utils/toast/Toast';

var Layout = React.createClass({
  render: function() {
    var props = this.props;
    return ToastProvider(null,
      React.DOM.div({className: 'w-full grid place-items-center bg-gray-900'},
        React.DOM.div({className: 'w-full max-w-screen-md'},
          props.children
        ),
        Toast(null)
      )
    );
  }
});

export { Layout };
