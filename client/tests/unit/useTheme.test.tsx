import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../src/hooks/useTheme.js';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const mockMatchMedia = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: mockMatchMedia,
  });
  mockMatchMedia.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

describe('useTheme', () => {
  it('throws when used outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
  });

  it('defaults to auto preference when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.preference).toBe('auto');
  });

  it('reads light preference from localStorage', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.preference).toBe('light');
    expect(result.current.effectiveMode).toBe('light');
  });

  it('reads dark preference from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.preference).toBe('dark');
    expect(result.current.effectiveMode).toBe('dark');
  });

  it('treats invalid localStorage value as auto', () => {
    localStorage.setItem('theme', 'invalid-value');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.preference).toBe('auto');
  });

  it('persists light preference to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setPreference('light'));
    expect(localStorage.getItem('theme')).toBe('light');
    expect(result.current.preference).toBe('light');
  });

  it('persists dark preference to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setPreference('dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(result.current.preference).toBe('dark');
  });

  it('removes localStorage key when set to auto', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setPreference('auto'));
    expect(localStorage.getItem('theme')).toBeNull();
    expect(result.current.preference).toBe('auto');
  });

  it('adds dark class to html when effectiveMode is dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setPreference('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class from html when effectiveMode is light', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setPreference('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('resolves effectiveMode correctly for each preference', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setPreference('dark'));
    expect(result.current.effectiveMode).toBe('dark');

    act(() => result.current.setPreference('light'));
    expect(result.current.effectiveMode).toBe('light');
  });
});
