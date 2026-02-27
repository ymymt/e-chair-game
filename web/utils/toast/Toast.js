import React from 'react';
var toastStore = require('@/utils/toast/toastStore');

var Toast = React.createClass({
  getInitialState: function() {
    return toastStore.getState();
  },

  componentDidMount: function() {
    var self = this;
    this._unsubscribe = toastStore.subscribe(function(newState) {
      self.setState(newState);
    });
  },

  componentWillUnmount: function() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  },

  render: function() {
    if (!this.state.isOpen) {
      return React.DOM.span(null);
    }
    return React.DOM.div({className: 'fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg'},
      this.state.message
    );
  }
});

export { Toast };
