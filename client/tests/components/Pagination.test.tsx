import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../../src/components/Pagination';

describe('Pagination', () => {
  it('displays page number', () => {
    render(
      <Pagination
        meta={{ total: 100, limit: 20, offset: 40, hasMore: true }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/page 3 of 5/i)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(
      <Pagination
        meta={{ total: 50, limit: 20, offset: 0, hasMore: true }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/previous/i)).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination
        meta={{ total: 40, limit: 20, offset: 20, hasMore: false }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/next/i)).toBeDisabled();
  });

  it('fires onPageChange with correct page on next click', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination
        meta={{ total: 60, limit: 20, offset: 0, hasMore: true }}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByText(/next/i));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('fires onPageChange with correct page on previous click', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination
        meta={{ total: 60, limit: 20, offset: 20, hasMore: true }}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByText(/previous/i));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('returns null for single page', () => {
    const { container } = render(
      <Pagination
        meta={{ total: 10, limit: 20, offset: 0, hasMore: false }}
        onPageChange={() => {}}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
