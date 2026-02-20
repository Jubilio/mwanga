import { useState } from 'react';

export default function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div className="toast-container">
      <div className="toast-msg">{message}</div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false });

  function showToast(msg) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }

  return { toast, showToast };
}
