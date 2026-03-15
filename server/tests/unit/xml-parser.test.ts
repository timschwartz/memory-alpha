import { describe, it, expect } from 'vitest';
import { parseMediaWikiXml } from '../../src/lib/xml-parser.js';
import type { PageData, NamespaceData } from '@memory-alpha/shared';
import { resolve } from 'path';

const FIXTURE_PATH = resolve(import.meta.dirname, '../fixtures/sample-export.xml');

describe('parseMediaWikiXml', () => {
  it('should extract siteinfo namespaces', async () => {
    const namespaces: NamespaceData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: (ns) => namespaces.push(...ns),
      onPage: () => {},
      onError: () => {},
    });

    expect(namespaces).toHaveLength(3);
    expect(namespaces[0]).toEqual({ namespace_id: 0, name: '', case_setting: 'first-letter' });
    expect(namespaces[1]).toEqual({ namespace_id: 1, name: 'Talk', case_setting: 'first-letter' });
    expect(namespaces[2]).toEqual({
      namespace_id: 14,
      name: 'Category',
      case_setting: 'first-letter',
    });
  });

  it('should extract pages with revisions', async () => {
    const pages: PageData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
    });

    expect(pages).toHaveLength(7);

    const kirk = pages.find((p) => p.page_id === 1001);
    expect(kirk).toBeDefined();
    expect(kirk!.title).toBe('James T. Kirk');
    expect(kirk!.namespace_id).toBe(0);
    expect(kirk!.revisions).toHaveLength(2);
  });

  it('should extract contributor info for registered users', async () => {
    const pages: PageData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
    });

    const kirk = pages.find((p) => p.page_id === 1001)!;
    const firstRev = kirk.revisions.find((r) => r.revision_id === 5001)!;
    expect(firstRev.contributor_name).toBe('Admin');
    expect(firstRev.contributor_id).toBe(1);
  });

  it('should extract IP for anonymous contributors', async () => {
    const pages: PageData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
    });

    const enterprise = pages.find((p) => p.page_id === 1002)!;
    expect(enterprise.revisions[0].contributor_name).toBe('192.168.1.100');
    expect(enterprise.revisions[0].contributor_id).toBeNull();
  });

  it('should handle pages with empty text content', async () => {
    const pages: PageData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
    });

    const emptyPage = pages.find((p) => p.page_id === 1004)!;
    expect(emptyPage).toBeDefined();
    expect(emptyPage.revisions[0].text_content).toBeNull();
  });

  it('should handle special characters in titles', async () => {
    const pages: PageData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
    });

    const specialPage = pages.find((p) => p.page_id === 1005)!;
    expect(specialPage).toBeDefined();
    expect(specialPage.title).toBe('O\'Brien\'s "Special" & Unique — Page');
  });

  it('should extract parent revision IDs', async () => {
    const pages: PageData[] = [];

    await parseMediaWikiXml(FIXTURE_PATH, {
      onSiteInfo: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
    });

    const kirk = pages.find((p) => p.page_id === 1001)!;
    const firstRev = kirk.revisions.find((r) => r.revision_id === 5001)!;
    const secondRev = kirk.revisions.find((r) => r.revision_id === 5002)!;

    expect(firstRev.parent_id).toBeNull();
    expect(secondRev.parent_id).toBe(5001);
  });
});
