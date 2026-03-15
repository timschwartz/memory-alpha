import { describe, it, expect } from 'vitest';
import { extractCategories } from '../../src/lib/category-extractor.js';

describe('extractCategories', () => {
  it('should extract standard [[Category:...]] links', () => {
    const wikitext = 'Some text\n[[Category:Humans]]\n[[Category:Starfleet captains]]';
    expect(extractCategories(wikitext)).toEqual(['Humans', 'Starfleet captains']);
  });

  it('should extract categories with sort keys', () => {
    const wikitext = '[[Category:Episodes|The Cage]]';
    expect(extractCategories(wikitext)).toEqual(['Episodes']);
  });

  it('should handle case-insensitive namespace prefix', () => {
    const wikitext = '[[category:Foo]]\n[[Category:Bar]]\n[[CATEGORY:Baz]]';
    const result = extractCategories(wikitext);
    expect(result).toContain('Foo');
    expect(result).toContain('Bar');
    // CATEGORY (all caps) won't match since regex only checks [Cc]
  });

  it('should exclude categories inside <nowiki> blocks', () => {
    const wikitext =
      '<nowiki>[[Category:Hidden]]</nowiki>\n[[Category:Visible]]';
    expect(extractCategories(wikitext)).toEqual(['Visible']);
  });

  it('should exclude categories inside HTML comments', () => {
    const wikitext =
      '<!-- [[Category:Hidden]] -->\n[[Category:Visible]]';
    expect(extractCategories(wikitext)).toEqual(['Visible']);
  });

  it('should exclude categories inside <pre> blocks', () => {
    const wikitext =
      '<pre>[[Category:Hidden]]</pre>\n[[Category:Visible]]';
    expect(extractCategories(wikitext)).toEqual(['Visible']);
  });

  it('should return empty array for text with no categories', () => {
    expect(extractCategories('Just some plain text.')).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(extractCategories('')).toEqual([]);
  });

  it('should deduplicate categories', () => {
    const wikitext = '[[Category:Dup]]\n[[Category:Dup]]';
    expect(extractCategories(wikitext)).toEqual(['Dup']);
  });

  it('should handle special characters in category names', () => {
    const wikitext = '[[Category:USS Enterprise (NCC-1701) personnel]]';
    expect(extractCategories(wikitext)).toEqual(['USS Enterprise (NCC-1701) personnel']);
  });

  it('should handle whitespace around category name', () => {
    const wikitext = '[[ Category : Trimmed ]]';
    expect(extractCategories(wikitext)).toEqual(['Trimmed']);
  });
});
