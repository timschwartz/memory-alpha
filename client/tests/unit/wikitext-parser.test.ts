import { describe, it, expect } from 'vitest';
import { parseWikitext, sanitizeSnippet } from '../../src/lib/wikitext-parser';

describe('wikitext-parser', () => {
  describe('parseWikitext', () => {
    it('renders bold text', () => {
      const result = parseWikitext("'''bold text'''");
      expect(result.html).toContain('<b>bold text</b>');
      expect(result.isRedirect).toBe(false);
    });

    it('renders italic text', () => {
      const result = parseWikitext("''italic text''");
      expect(result.html).toContain('<i>italic text</i>');
    });

    it('renders headings', () => {
      const result = parseWikitext('== Section Heading ==');
      expect(result.html).toMatch(/<h/);
      expect(result.html).toContain('Section Heading');
    });

    it('renders internal links', () => {
      const result = parseWikitext('[[Warp drive]]');
      expect(result.html).toContain('Warp drive');
      expect(result.html).toContain('<a');
    });

    it('renders external links', () => {
      const result = parseWikitext('[https://example.com Example]');
      expect(result.html).toContain('Example');
      expect(result.html).toContain('href');
    });

    it('sanitizes unsafe tags via DOMPurify', () => {
      const result = parseWikitext('<script>alert("xss")</script> safe text');
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('safe text');
    });

    it('detects redirect and returns target title', () => {
      const result = parseWikitext('#REDIRECT [[USS Enterprise]]');
      expect(result.isRedirect).toBe(true);
      expect(result.redirectTarget).toBe('USS Enterprise');
      expect(result.html).toBe('');
    });

    it('detects redirect case-insensitively', () => {
      const result = parseWikitext('#redirect [[Target Page]]');
      expect(result.isRedirect).toBe(true);
      expect(result.redirectTarget).toBe('Target Page');
    });

    it('extracts categories', () => {
      const result = parseWikitext('Some text\n\n[[Category:Starships]]\n[[Category:Federation]]');
      expect(result.categories).toContain('Starships');
      expect(result.categories).toContain('Federation');
    });

    it('returns empty categories for content without categories', () => {
      const result = parseWikitext('Just some plain text');
      expect(result.categories).toEqual([]);
    });

    it('handles empty wikitext', () => {
      const result = parseWikitext('');
      expect(result.html).toBeDefined();
      expect(result.isRedirect).toBe(false);
      expect(result.categories).toEqual([]);
    });

    it('renders lists', () => {
      const result = parseWikitext('* Item 1\n* Item 2\n* Item 3');
      expect(result.html).toContain('<li');
    });
  });

  describe('sanitizeSnippet', () => {
    it('preserves mark tags', () => {
      const result = sanitizeSnippet('text <mark>highlighted</mark> text');
      expect(result).toContain('<mark>highlighted</mark>');
    });

    it('strips all other tags', () => {
      const result = sanitizeSnippet('<b>bold</b> <script>evil</script> <mark>ok</mark>');
      expect(result).not.toContain('<b>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('<mark>ok</mark>');
    });
  });
});
