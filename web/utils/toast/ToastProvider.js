import React from 'react';
var toastShape = React.PropTypes.shape({
  isOpen: React.PropTypes.bool.isRequired,
  message: React.PropTypes.renderable,
  open: React.PropTypes.func.isRequired,
});

var ToastProvider = React.createClass({
  childContextTypes: {
    toast: toastShape,
  },

  propTypes: {
    children: React.PropTypes.renderable.isRequired,
  },

  getInitialState: function() {
    this._timerId = null;
    return {
      isOpen: false,
      message: '',
    };
  },

  getChildContext: function() {
    return {
      toast: {
        isOpen: this.state.isOpen,
        message: this.state.message,
        open: this.open,
      },
    };
  },

  open: function(message, milliseconds) {
    var self = this;
    var ms = milliseconds || 3000;
    if (self._timerId) {
      clearTimeout(self._timerId);
    }
    self.setState({ isOpen: true, message: message });
    self._timerId = setTimeout(function() {
      self.close();
    }, ms);
  },

  close: function() {
    this.setState({ isOpen: false, message: '' });
    this._timerId = null;
  },

  render: function() {
    return this.props.children;
  }
});

export { ToastProvider, toastShape };
