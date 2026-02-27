var listeners = [];
var state = { isOpen: false, message: '' };
var timerId = null;

function getState() {
  return state;
}

function notify() {
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](state);
  }
}

function open(message, milliseconds) {
  var ms = milliseconds || 3000;
  if (timerId) {
    clearTimeout(timerId);
  }
  state = { isOpen: true, message: message };
  notify();
  timerId = setTimeout(function() {
    close();
  }, ms);
}

function close() {
  state = { isOpen: false, message: '' };
  timerId = null;
  notify();
}

function subscribe(listener) {
  listeners.push(listener);
  return function unsubscribe() {
    listeners = listeners.filter(function(l) { return l !== listener; });
  };
}

module.exports = {
  getState: getState,
  open: open,
  close: close,
  subscribe: subscribe,
};
