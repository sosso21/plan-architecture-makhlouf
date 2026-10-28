import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastState {
  readonly message: string | null;
  readonly show: (message: string) => void;
}

export function useToast(duration = 2600): ToastState {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef(0);
  const show = useCallback(
    (m: string) => {
      window.clearTimeout(timer.current);
      setMessage(m);
      timer.current = window.setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { message, show };
}

export function Toast({ state }: { state: ToastState }) {
  if (!state.message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {state.message}
    </div>
  );
}
