import { useEffect } from 'react';

export default function Toast({
  message,
  kind = 'ok',
  onClose,
}: {
  message: string;
  kind?: 'ok' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${kind === 'error' ? 'error' : ''}`}>{message}</div>;
}
