import React from 'react';
import { toastShape } from '@/utils/toast/ToastProvider';

class Toast extends React.Component {
  render() {
    var toast = this.context.toast;
    if (!toast || !toast.isOpen) {
      return null;
    }
    return (
      <div className="fixed p-4 mx-1 bg-gray-800 border-2 text-white rounded-lg shadow-lg">
        {toast.message}
      </div>
    );
  }
}

Toast.contextTypes = {
  toast: toastShape,
};

export { Toast };
