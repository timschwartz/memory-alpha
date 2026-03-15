import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ThemePreference = 'light' | 'dark' | 'auto';
type EffectiveMode = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  effectiveMode: EffectiveMode;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'auto';
}

function resolveEffective(pref: ThemePreference): EffectiveMode {
  if (pref === 'light' || pref === 'dark') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDOM(mode: EffectiveMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [effectiveMode, setEffectiveMode] = useState<EffectiveMode>(() => resolveEffective(readPreference()));

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    if (pref === 'light' || pref === 'dark') {
      localStorage.setItem('theme', pref);
    } else {
      localStorage.removeItem('theme');
    }
    const mode = resolveEffective(pref);
    setEffectiveMode(mode);
    applyToDOM(mode);
  }, []);

  // Apply initial DOM state on mount
  useEffect(() => {
    applyToDOM(effectiveMode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system preference changes when in auto mode (T032 will enhance this)
  useEffect(() => {
    if (preference !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const mode: EffectiveMode = e.matches ? 'dark' : 'light';
      setEffectiveMode(mode);
      applyToDOM(mode);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  return (
    <ThemeContext.Provider value={{ preference, effectiveMode, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
