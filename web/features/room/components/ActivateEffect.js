import React from 'react';
import { Zap } from '@/components/icons/Zap';

var ActivateEffect = React.createClass({
  render: function() {
    var props = this.props;
    if (props.result === 'shock') {
      return React.DOM.div({className: 'fixed inset-0 bg-yellow-300 bg-opacity-70 flex items-center justify-center z-50'},
        Zap({className: 'animate-shock-vibrate text-red-700 w-48 h-48 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]'})
      );
    }
    if (props.result === 'safe') {
      return React.DOM.div({className: 'fixed inset-0 bg-black/80 flex items-center justify-center z-50'},
        React.DOM.div({className: 'animate-pulse text-white w-48 h-48 text-center flex justify-center'},
          React.DOM.span({className: 'font-bold text-9xl'}, 'SAFE')
        )
      );
    }
    return React.DOM.span(null);
  }
});

export { ActivateEffect };
