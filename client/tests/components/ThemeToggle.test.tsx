import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../../src/components/ThemeToggle';
import { ThemeProvider } from '../../src/hooks/useTheme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('renders three buttons: Light, Dark, Auto', () => {
    renderWithTheme();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('highlights Auto by default when no preference is stored', () => {
    renderWithTheme();
    const autoBtn = screen.getByText('Auto');
    expect(autoBtn.className).toContain('bg-lcars-amber');
  });

  it('highlights Light when light preference is stored', () => {
    localStorage.setItem('theme', 'light');
    renderWithTheme();
    const lightBtn = screen.getByText('Light');
    expect(lightBtn.className).toContain('bg-lcars-amber');
  });

  it('calls setPreference when a button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme();

    await user.click(screen.getByText('Dark'));
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByText('Light'));
    expect(localStorage.getItem('theme')).toBe('light');

    await user.click(screen.getByText('Auto'));
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('updates highlight when preference changes', async () => {
    const user = userEvent.setup();
    renderWithTheme();

    await user.click(screen.getByText('Dark'));
    expect(screen.getByText('Dark').className).toContain('bg-lcars-amber');
    expect(screen.getByText('Light').className).not.toContain('bg-lcars-amber');
  });
});
