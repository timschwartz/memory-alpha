import { useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';

interface WikiContentProps {
  html: string;
}

export default function WikiContent({ html }: WikiContentProps) {
  const navigate = useNavigate();

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (href && href.startsWith('/wiki/')) {
      e.preventDefault();
      navigate(href);
    }
  }

  return (
    <div
      className="wiki-content"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
