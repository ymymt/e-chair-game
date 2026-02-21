import React from 'react';
import PropTypes from 'prop-types';

var toastShape = PropTypes.shape({
  isOpen: PropTypes.bool.isRequired,
  message: PropTypes.node,
  open: PropTypes.func.isRequired,
});

class ToastProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      message: '',
    };
    this._timerId = null;
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  getChildContext() {
    return {
      toast: {
        isOpen: this.state.isOpen,
        message: this.state.message,
        open: this.open,
      },
    };
  }

  open(message, milliseconds) {
    var self = this;
    var ms = milliseconds || 3000;
    if (self._timerId) {
      clearTimeout(self._timerId);
    }
    self.setState({ isOpen: true, message: message });
    self._timerId = setTimeout(function() {
      self.close();
    }, ms);
  }

  close() {
    this.setState({ isOpen: false, message: '' });
    this._timerId = null;
  }

  render() {
    return this.props.children;
  }
}

ToastProvider.childContextTypes = {
  toast: toastShape,
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { ToastProvider, toastShape };
