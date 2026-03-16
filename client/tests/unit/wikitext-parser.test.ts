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

    it('renders {{dis}} disambiguation template as a link', () => {
      const result = parseWikitext(
        "'''Curzon Dax''' was the seventh [[host]] of the {{dis|Dax|symbiont|Dax symbiont}} from [[2286]]."
      );
      expect(result.html).toContain('Dax symbiont');
      expect(result.html).toContain('<a');
    });

    it('renders {{dis}} without explicit display text using page name', () => {
      const result = parseWikitext('See {{dis|Dax|symbiont}} for details.');
      expect(result.html).toContain('Dax');
      expect(result.html).toContain('<a');
    });

    it('renders {{y}} as a year link', () => {
      const result = parseWikitext('In {{y|1987}} something happened.');
      expect(result.html).toContain('1987');
      expect(result.html).toContain('<a');
    });

    it('renders {{s}} as series abbreviation link', () => {
      const result = parseWikitext('Episodes of {{s|TNG}} are great.');
      expect(result.html).toContain('TNG');
      expect(result.html).toContain('href');
    });

    it('renders {{born}} as a formatted birth date', () => {
      const result = parseWikitext("'''Person''' {{born|11|June|1946}} is an actor.");
      expect(result.html).toContain('June 11');
      expect(result.html).toContain('1946');
    });

    it('renders {{wt}} as a Wikipedia link', () => {
      const result = parseWikitext('Directed {{wt|Moonlighting (TV series)|Moonlighting}} episodes.');
      expect(result.html).toContain('Moonlighting');
      expect(result.html).toContain('https://en.wikipedia.org/wiki/Moonlighting_(TV_series)');
      expect(result.html).toContain('target="_blank"');
    });

    it('renders {{w}} as a Wikipedia link', () => {
      const result = parseWikitext('See {{w|Gliese 892}} for info.');
      expect(result.html).toContain('Gliese 892');
      expect(result.html).toContain('https://en.wikipedia.org/wiki/Gliese_892');
      expect(result.html).toContain('target="_blank"');
    });

    it('renders {{USS}} as a ship link', () => {
      const result = parseWikitext('Aboard the {{USS|Enterprise|NCC-1701}}.');
      expect(result.html).toContain('Enterprise');
      expect(result.html).toContain('<a');
    });

    it('renders {{e}} as an episode link', () => {
      const result = parseWikitext('In {{e|The Menagerie, Part I}} we see...');
      expect(result.html).toContain('The Menagerie, Part I');
      expect(result.html).toContain('<a');
    });

    it('renders Paul Lynch article templates fully', () => {
      const result = parseWikitext(
        "'''Paul Lynch''' {{born|11|June|1946}} is a [[directors|director]] who directed ten episodes of {{s|TNG}} and {{s|DS9}} between {{y|1987}} and {{y|1993}}."
      );
      expect(result.html).toContain('June 11');
      expect(result.html).toContain('1946');
      expect(result.html).toContain('TNG');
      expect(result.html).toContain('DS9');
      expect(result.html).toContain('1987');
      expect(result.html).toContain('1993');
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
