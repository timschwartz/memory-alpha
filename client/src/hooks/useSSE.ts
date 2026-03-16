import { useEffect, useRef, useCallback, useState } from 'react';

interface SSEOptions<T> {
  url: string;
  enabled?: boolean;
  onEvent?: (event: string, data: T) => void;
  onError?: () => void;
}

interface SSEState {
  connected: boolean;
  error: boolean;
}

export function useSSE<T>({ url, enabled = true, onEvent, onError }: SSEOptions<T>): SSEState {
  const [state, setState] = useState<SSEState>({ connected: false, error: false });
  const sourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);

  onEventRef.current = onEvent;
  onErrorRef.current = onError;

  const cleanup = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setState({ connected: false, error: false });
      return;
    }

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setState({ connected: true, error: false });
    };

    source.onerror = () => {
      setState({ connected: false, error: true });
      onErrorRef.current?.();
      cleanup();
    };

    const handleEvent = (eventName: string) => (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as T;
        onEventRef.current?.(eventName, data);
      } catch {
        // Ignore malformed events
      }
    };

    const events = ['progress', 'complete', 'error', 'cancelled', 'import-progress', 'import-complete', 'import-error'];
    for (const eventName of events) {
      source.addEventListener(eventName, handleEvent(eventName));
    }

    return cleanup;
  }, [url, enabled, cleanup]);

  return state;
}
