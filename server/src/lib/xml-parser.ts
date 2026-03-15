import { SaxesParser } from 'saxes';
import { createReadStream } from 'fs';
import type { PageData, RevisionData, NamespaceData } from '@memory-alpha/shared';

/** Page metadata without revisions, emitted when the opening &lt;page&gt; fields are parsed. */
export type PageMeta = Omit<PageData, 'revisions'>;

export interface ParseEvents {
  onSiteInfo: (namespaces: NamespaceData[]) => void;
  /**
   * Called once per page when all page-level fields are known (before revisions).
   * For backward-compat, also called on page close with full revisions if
   * `onRevision` / `onPageEnd` are not provided.
   */
  onPage: ((page: PageData) => void) | ((page: PageMeta) => void);
  /** Called for each completed revision. When provided, revisions are NOT accumulated on the page. */
  onRevision?: (revision: RevisionData) => void;
  /** Called when a &lt;/page&gt; close tag is reached (after all revisions). */
  onPageEnd?: (pageId: number) => void;
  onError: (error: Error, context: string) => void;
}

export async function parseMediaWikiXml(
  xmlFilePath: string,
  events: ParseEvents,
): Promise<void> {
  const parser = new SaxesParser();
  const streamRevisions = typeof events.onRevision === 'function';

  const namespaces: NamespaceData[] = [];
  let inSiteInfo = false;
  let inPage = false;
  let inRevision = false;
  let inContributor = false;

  // Element path tracking
  let currentElement = '';
  let textChunks: string[] = [];

  // Current namespace being built
  let currentNamespace: Partial<NamespaceData> = {};

  // Current page being built
  let currentPage: Partial<PageMeta> & { revisions: RevisionData[]; revisionCount: number } = {
    revisions: [],
    revisionCount: 0,
  };

  // Current revision being built
  let currentRevision: Partial<RevisionData> = {};

  // Contributor fields
  let contributorName: string | null = null;
  let contributorId: number | null = null;

  parser.on('opentag', (node) => {
    currentElement = node.name;
    textChunks = [];

    switch (node.name) {
      case 'siteinfo':
        inSiteInfo = true;
        break;
      case 'namespace':
        if (inSiteInfo) {
          currentNamespace = {
            namespace_id: parseInt(node.attributes['key'] as string, 10),
            case_setting: (node.attributes['case'] as string) || 'first-letter',
          };
        }
        break;
      case 'page':
        inPage = true;
        currentPage = { revisions: [], revisionCount: 0 };
        break;
      case 'revision':
        if (inPage) {
          inRevision = true;
          currentRevision = {
            content_model: 'wikitext',
          };
          contributorName = null;
          contributorId = null;
          // In streaming mode, emit page metadata before the first revision
          if (streamRevisions && currentPage.revisionCount === 0 &&
              currentPage.page_id != null && currentPage.title != null) {
            (events.onPage as (page: PageMeta) => void)({
              page_id: currentPage.page_id,
              title: currentPage.title,
              namespace_id: currentPage.namespace_id!,
            });
          }
        }
        break;
      case 'contributor':
        if (inRevision) {
          inContributor = true;
        }
        break;
    }
  });

  parser.on('text', (text) => {
    textChunks.push(text);
  });

  parser.on('closetag', (node) => {
    const textBuffer = textChunks.join('');
    const text = textBuffer.trim();

    // Siteinfo namespace handling
    if (inSiteInfo) {
      switch (node.name) {
        case 'namespace':
          currentNamespace.name = textBuffer; // preserve whitespace-only names (empty string for ns=0)
          namespaces.push(currentNamespace as NamespaceData);
          break;
        case 'siteinfo':
          inSiteInfo = false;
          events.onSiteInfo(namespaces);
          break;
      }
    }

    // Contributor handling
    if (inContributor) {
      switch (node.name) {
        case 'username':
          contributorName = text || null;
          break;
        case 'ip':
          contributorName = text || null;
          break;
        case 'id':
          contributorId = text ? parseInt(text, 10) : null;
          break;
        case 'contributor':
          inContributor = false;
          break;
      }
      if (node.name !== 'contributor') return;
    }

    // Revision handling
    if (inRevision && !inContributor) {
      switch (node.name) {
        case 'id':
          currentRevision.revision_id = parseInt(text, 10);
          break;
        case 'parentid':
          currentRevision.parent_id = text ? parseInt(text, 10) : null;
          break;
        case 'timestamp':
          currentRevision.timestamp = text;
          break;
        case 'model':
          currentRevision.content_model = text || 'wikitext';
          break;
        case 'format':
          currentRevision.content_format = text || null;
          break;
        case 'text':
          currentRevision.text_content = textBuffer || null;
          break;
        case 'sha1':
          currentRevision.sha1 = text || null;
          break;
        case 'contributor':
          currentRevision.contributor_name = contributorName;
          currentRevision.contributor_id = contributorId;
          break;
        case 'revision':
          inRevision = false;
          if (currentRevision.revision_id != null) {
            currentRevision.page_id = currentPage.page_id!;
            currentRevision.parent_id = currentRevision.parent_id ?? null;
            currentRevision.contributor_name = currentRevision.contributor_name ?? null;
            currentRevision.contributor_id = currentRevision.contributor_id ?? null;
            currentRevision.content_format = currentRevision.content_format ?? null;
            currentRevision.text_content = currentRevision.text_content ?? null;
            currentRevision.sha1 = currentRevision.sha1 ?? null;
            const revision = currentRevision as RevisionData;
            if (streamRevisions) {
              events.onRevision!(revision);
            } else {
              currentPage.revisions.push(revision);
            }
            currentPage.revisionCount++;
          }
          break;
      }
      return;
    }

    // Page-level handling (not in revision)
    if (inPage && !inRevision) {
      switch (node.name) {
        case 'title':
          currentPage.title = text;
          break;
        case 'ns':
          currentPage.namespace_id = parseInt(text, 10);
          break;
        case 'id':
          currentPage.page_id = parseInt(text, 10);
          break;
        case 'page':
          inPage = false;
          if (currentPage.page_id != null && currentPage.title != null) {
            if (currentPage.revisionCount === 0) {
              events.onError(
                new Error(`Page id=${currentPage.page_id} "${currentPage.title}" has no revisions`),
                `page:${currentPage.page_id}`,
              );
            } else if (!streamRevisions) {
              // Legacy mode: emit full page with accumulated revisions
              events.onPage(currentPage as PageData);
            }
          } else {
            events.onError(
              new Error(`Malformed page: missing id or title`),
              'page:unknown',
            );
          }
          if (streamRevisions && events.onPageEnd && currentPage.page_id != null) {
            events.onPageEnd(currentPage.page_id);
          }
          break;
      }
    }

    textChunks = [];
    currentElement = '';
  });

  parser.on('error', (err) => {
    events.onError(err, 'xml-parse');
  });

  const stream = createReadStream(xmlFilePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
  for await (const chunk of stream) {
    parser.write(chunk as string);
  }
  parser.close();
}
