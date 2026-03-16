import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSSE } from '../../src/hooks/useSSE';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate async open
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 0);
  }

  addEventListener(event: string, handler: (e: MessageEvent) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  close = vi.fn();

  // Helper to simulate events
  simulateEvent(event: string, data: unknown) {
    const handlers = this.listeners[event] || [];
    for (const handler of handlers) {
      handler(new MessageEvent(event, { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    this.readyState = 2;
    this.onerror?.();
  }
}

Object.defineProperty(global, 'EventSource', {
  writable: true,
  configurable: true,
  value: MockEventSource,
});

function TestComponent({ url, enabled, onEvent, onError }: {
  url: string;
  enabled?: boolean;
  onEvent?: (event: string, data: unknown) => void;
  onError?: () => void;
}) {
  const state = useSSE({ url, enabled, onEvent, onError });
  return (
    <div>
      <span data-testid="connected">{String(state.connected)}</span>
      <span data-testid="error">{String(state.error)}</span>
    </div>
  );
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    MockEventSource.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates EventSource when enabled', () => {
    render(<TestComponent url="/api/test/events" enabled={true} />);
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/test/events');
  });

  it('does not create EventSource when disabled', () => {
    render(<TestComponent url="/api/test/events" enabled={false} />);
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = render(<TestComponent url="/api/test/events" enabled={true} />);
    const source = MockEventSource.instances[0];
    unmount();
    expect(source.close).toHaveBeenCalled();
  });

  it('calls onEvent when event received', async () => {
    const onEvent = vi.fn();
    render(<TestComponent url="/api/test/events" enabled={true} onEvent={onEvent} />);
    const source = MockEventSource.instances[0];

    await act(async () => {
      source.simulateEvent('progress', { percent: 50 });
    });

    expect(onEvent).toHaveBeenCalledWith('progress', { percent: 50 });
  });

  it('calls onError when error occurs', async () => {
    const onError = vi.fn();
    render(<TestComponent url="/api/test/events" enabled={true} onError={onError} />);
    const source = MockEventSource.instances[0];

    await act(async () => {
      source.simulateError();
    });

    expect(onError).toHaveBeenCalled();
  });
});
