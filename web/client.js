var React = require('react');

// React 0.11 shim: Babel outputs React.createElement('div', props, children)
// but 0.11's native createElement calls type.apply() which fails for strings.
React.createElement = function(type) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (typeof type === 'string') {
    return React.DOM[type].apply(null, args);
  }
  return type.apply(null, args);
};

var Layout = require('@/components/Layout').Layout;
var Top = require('@/features/top/page/Top').Top;
var Room = require('@/features/room/page/Room').default;

var pathname = window.location.pathname;
var rootEl = document.getElementById('__next');

var roomMatch = pathname.match(/^\/room\/(.+)$/);

if (roomMatch) {
  var roomId = roomMatch[1];
  fetch('/api/room/' + roomId + '/init', { credentials: 'same-origin' })
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.status !== 200) {
        window.location.href = '/';
        return;
      }
      React.renderComponent(
        React.createElement(Layout, null,
          React.createElement(Room, { initialData: json.data })
        ),
        rootEl
      );
    })
    .catch(function() {
      window.location.href = '/';
    });
} else {
  React.renderComponent(
    React.createElement(Layout, null,
      React.createElement(Top, null)
    ),
    rootEl
  );
}
