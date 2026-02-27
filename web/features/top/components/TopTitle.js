import React from 'react';
import { Zap } from '@/components/icons/Zap';

var TopTitle = React.createClass({
  render: function() {
    return React.DOM.div({className: 'p-6'},
      [React.DOM.h1({className: 'flex gap-3 items-center justify-center text-3xl text-center font-semibold text-red-500'},
        [Zap({className: 'animate-pulse'}),
        React.DOM.span(null, '電気椅子ゲーム'),
        Zap({className: 'animate-pulse'})]
      ),
      React.DOM.h2({className: 'pt-1 text-md text-center text-gray-300'},
        '緊張と興奮の椅子取り合戦'
      )]
    );
  }
});

export { TopTitle };
