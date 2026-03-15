import wtf from 'wtf_wikipedia';
// @ts-ignore - no type declarations available
import wtfHtml from 'wtf-plugin-html';
import _DOMPurify from 'dompurify';

// Handle ESM/CJS import variance in test environments
const DOMPurify = ('default' in _DOMPurify ? (_DOMPurify as unknown as { default: typeof _DOMPurify }).default : _DOMPurify);

wtf.extend(wtfHtml);

const WIKI_CONTENT_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a', 'ul', 'ol', 'li',
  'table', 'tr', 'td', 'th', 'thead', 'tbody', 'caption',
  'strong', 'em', 'b', 'i', 'mark', 'span', 'div',
  'dl', 'dt', 'dd', 'blockquote', 'pre', 'code',
  'br', 'hr', 'sub', 'sup',
];

const WIKI_CONTENT_ALLOWED_ATTR = [
  'href', 'target', 'rel', 'class', 'id',
  'colspan', 'rowspan', 'scope', 'alt', 'title',
];

export interface ParseResult {
  html: string;
  categories: string[];
  isRedirect: boolean;
  redirectTarget: string | null;
}

export function parseWikitext(wikitext: string): ParseResult {
  // Check for redirect before full parse
  const redirectMatch = wikitext.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i);
  if (redirectMatch) {
    return {
      html: '',
      categories: [],
      isRedirect: true,
      redirectTarget: redirectMatch[1].trim(),
    };
  }

  const doc = wtf(wikitext);

  // Extract categories
  const categories = doc.categories().map((c: string) => c.replace(/^Category:/, ''));

  // Build HTML from sections with infoboxes and templates
  let html = '';

  // Render infoboxes
  const infoboxes = doc.infoboxes();
  for (const ib of infoboxes) {
    const data = ib.json() as Record<string, { text?: string }>;
    const templateName = (ib as unknown as { _type?: string })._type ?? 'Infobox';
    html += '<div class="infobox">';
    html += `<div class="infobox-title">${escapeHtml(String(templateName))}</div>`;
    html += '<table>';
    for (const [key, val] of Object.entries(data)) {
      if (key === 'template' || key === 'list') continue;
      const text = typeof val === 'object' && val?.text ? val.text : String(val);
      html += `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(text)}</td></tr>`;
    }
    html += '</table></div>';
  }

  // Render main content via wtf-plugin-html
  const mainHtml = (doc as unknown as { html: () => string }).html();
  html += mainHtml;

  // Render templates as structured blocks (for templates not captured as infoboxes)
  const templates = doc.templates();
  for (const tmpl of templates) {
    const tmplJson = tmpl.json() as Record<string, unknown>;
    const name = tmplJson.template ?? 'unknown';
    html += '<div class="template-block">';
    html += `<strong>${escapeHtml(String(name))}</strong>`;
    for (const [key, val] of Object.entries(tmplJson)) {
      if (key === 'template') continue;
      html += `<div>${escapeHtml(key)}: ${escapeHtml(String(val))}</div>`;
    }
    html += '</div>';
  }

  // Render images as placeholders
  const images = doc.images();
  for (const img of images) {
    const caption = img.caption() ?? img.file() ?? '';
    html += `<div class="image-placeholder">[Image: ${escapeHtml(caption)}]</div>`;
  }

  // Sanitize HTML
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: WIKI_CONTENT_ALLOWED_TAGS,
    ALLOWED_ATTR: WIKI_CONTENT_ALLOWED_ATTR,
  });

  return {
    html: sanitized,
    categories,
    isRedirect: false,
    redirectTarget: null,
  };
}

export function sanitizeSnippet(snippet: string): string {
  return DOMPurify.sanitize(snippet, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: [],
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
