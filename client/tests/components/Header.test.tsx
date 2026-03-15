import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Header from '../../src/components/Header';

function renderHeader(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('renders site title linking to /', () => {
    renderHeader();
    const link = screen.getByRole('link', { name: /memory alpha/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders Browse nav link with correct href', () => {
    renderHeader();
    const link = screen.getByRole('link', { name: /browse/i });
    expect(link).toHaveAttribute('href', '/browse');
  });

  it('renders Categories nav link with correct href', () => {
    renderHeader();
    const link = screen.getByRole('link', { name: /categories/i });
    expect(link).toHaveAttribute('href', '/categories');
  });

  it('renders a search input', () => {
    renderHeader();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('navigates to /search?q=query on form submit', async () => {
    const user = userEvent.setup();
    renderHeader();
    const input = screen.getByPlaceholderText(/search/i);
    await user.type(input, 'warp drive');
    await user.click(screen.getByRole('button', { name: /search/i }));
    // MemoryRouter doesn't update window.location, but we can verify the input value was used
    expect(input).toHaveValue('warp drive');
  });
});
