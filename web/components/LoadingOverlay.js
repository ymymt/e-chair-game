import React from 'react';

var LoadingOverlay = React.createClass({
  render: function() {
    return React.DOM.div({className: 'fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]'},
      React.DOM.div({className: 'animate-pulse text-white text-center flex justify-center'},
        React.DOM.span({className: 'font-bold text-xl'}, 'Loading...')
      )
    );
  }
});

export { LoadingOverlay };
