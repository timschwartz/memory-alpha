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
  'br', 'hr', 'sub', 'sup', 'small',
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

/** Series abbreviation → full title mapping used by {{s}} templates. */
const SERIES_MAP: Record<string, string> = {
  TOS: 'Star Trek: The Original Series',
  TAS: 'Star Trek: The Animated Series',
  TNG: 'Star Trek: The Next Generation',
  DS9: 'Star Trek: Deep Space Nine',
  VOY: 'Star Trek: Voyager',
  ENT: 'Star Trek: Enterprise',
  DIS: 'Star Trek: Discovery',
  PIC: 'Star Trek: Picard',
  LD: 'Star Trek: Lower Decks',
  PRO: 'Star Trek: Prodigy',
  SNW: 'Star Trek: Strange New Worlds',
  ST: 'Star Trek: Short Treks',
};

/** Film number → article title mapping used by {{film}} templates. */
const FILM_MAP: Record<string, string> = {
  '1': 'Star Trek: The Motion Picture',
  '2': 'Star Trek II: The Wrath of Khan',
  '3': 'Star Trek III: The Search for Spock',
  '4': 'Star Trek IV: The Voyage Home',
  '5': 'Star Trek V: The Final Frontier',
  '6': 'Star Trek VI: The Undiscovered Country',
  '7': 'Star Trek Generations',
  '8': 'Star Trek: First Contact',
  '9': 'Star Trek: Insurrection',
  '10': 'Star Trek Nemesis',
  '11': 'Star Trek',
  '12': 'Star Trek Into Darkness',
  '13': 'Star Trek Beyond',
};

/**
 * Pre-process wikitext to expand Memory Alpha inline templates that
 * wtf_wikipedia would otherwise strip. Returns wikitext with templates
 * replaced by their equivalent wikilink / plain-text form.
 */
function expandInlineTemplates(wikitext: string): string {
  let text = wikitext;

  // {{dis|Page|qualifier|display}} → [[Page (qualifier)|display]]
  text = text.replace(
    /\{\{dis\|([^|}]+)\|([^|}]+)(?:\|([^|}]+))?\}\}/gi,
    (_m, page: string, qualifier: string, display?: string) => {
      const target = `${page.trim()} (${qualifier.trim()})`;
      const label = display?.trim() || page.trim();
      return `[[${target}|${label}]]`;
    },
  );

  // {{y|year}} → [[year]]
  text = text.replace(/\{\{y\|([^|}]+)\}\}/gi, '[[' + '$1' + ']]');

  // {{d|day|month|year}} → [[month day]], [[year]]  (or [[month day]] when no year)
  text = text.replace(
    /\{\{d\|([^|}]+)\|([^|}]+)(?:\|([^|}]+))?\}\}/gi,
    (_m, day: string, month: string, year?: string) => {
      const dateStr = `[[${month.trim()} ${day.trim()}]]`;
      return year ? `${dateStr}, [[${year.trim()}]]` : dateStr;
    },
  );

  // {{born|day|month|year}} and {{born|day|month|year|died|day|month|year}}
  text = text.replace(
    /\{\{born\|([^|}]+)\|([^|}]+)\|([^|}]+)(?:\|died\|([^|}]+)\|([^|}]+)\|([^|}]+))?\}\}/gi,
    (_m, bDay: string, bMonth: string, bYear: string, dDay?: string, dMonth?: string, dYear?: string) => {
      let result = `(born [[${bMonth.trim()} ${bDay.trim()}]], [[${bYear.trim()}]]`;
      if (dDay && dMonth && dYear) {
        result += ` – died [[${dMonth.trim()} ${dDay.trim()}]], [[${dYear.trim()}]]`;
      }
      return result + ')';
    },
  );

  // {{s|ABBR}} → ''[[Full Series Name|ABBR]]''
  text = text.replace(/\{\{s\|([^|}]+)\}\}/gi, (_m, abbr: string) => {
    const full = SERIES_MAP[abbr.trim()];
    return full ? `''[[${full}|${abbr.trim()}]]''` : `''${abbr.trim()}''`;
  });

  // {{e|Episode Name}} → "[[Episode Name]]"
  text = text.replace(
    /\{\{e\|([^|}]+)\}\}/gi,
    '"[[' + '$1' + ']]"',
  );

  // Series-specific episode links: {{TNG|ep}}, {{DS9|ep}}, etc. → "[[ep]]"
  const seriesAbbrs = Object.keys(SERIES_MAP).join('|');
  text = text.replace(
    new RegExp(`\\{\\{(?:${seriesAbbrs})\\|([^|}]+)\\}\\}`, 'gi'),
    '"[[' + '$1' + ']]"',
  );

  // {{film|num}} → ''[[Film Title]]''
  text = text.replace(/\{\{film\|([^|}]+)\}\}/gi, (_m, num: string) => {
    const title = FILM_MAP[num.trim()];
    return title ? `''[[${title}]]''` : `''film ${num.trim()}''`;
  });

  // {{USS|Name|Registry|Suffix}} → [[USS Name|USS ''Name''Suffix]]
  // {{USS|Name|Registry}} → [[USS Name (Registry)|USS ''Name'']]
  // {{USS|Name}} → [[USS Name|USS ''Name'']]
  text = text.replace(
    /\{\{USS\|([^|}]+)(?:\|([^|}]+))?(?:\|([^|}]+))?\}\}/g,
    (_m, name: string, registry?: string, suffix?: string) => {
      const n = name.trim();
      const suf = suffix?.trim() || '';
      if (registry) {
        return `[[USS ${n} (${registry.trim()})|USS ''${n}''${suf}]]`;
      }
      return `[[USS ${n}|USS ''${n}''${suf}]]`;
    },
  );

  // {{class|Name}} → [[Name class|''Name''-class]]
  text = text.replace(
    /\{\{class\|([^|}]+)\}\}/gi,
    (_m, name: string) => `[[${name.trim()} class|''${name.trim()}''-class]]`,
  );

  // {{wt|Page|Display}} or {{wt|Page}} → ''Display'' (Wikipedia article, render as italic text)
  text = text.replace(
    /\{\{wt\|([^|}]+)(?:\|([^|}]+))?\}\}/gi,
    (_m, page: string, display?: string) => `''${(display || page).trim()}''`,
  );

  // {{w|Page|Display}} or {{w|Page}} → ''Display'' (Wikipedia link)
  text = text.replace(
    /\{\{w\|([^|}]+)(?:\|([^|}]+))?\}\}/gi,
    (_m, page: string, display?: string) => `''${(display || page).trim()}''`,
  );

  // {{ma|Page|Display}} or {{ma|Page}} → [[Page|Display]] (Memory Alpha link)
  text = text.replace(
    /\{\{ma\|([^|}]+)(?:\|([^|}]+))?\}\}/gi,
    (_m, page: string, display?: string) => {
      const p = page.trim();
      const d = display?.trim();
      return d ? `[[${p}|${d}]]` : `[[${p}]]`;
    },
  );

  // {{mu|Name}} → [[Name (mirror)]] (mirror universe)
  text = text.replace(
    /\{\{mu\|([^|}]+)\}\}/gi,
    (_m, name: string) => `[[${name.trim()} (mirror)|${name.trim()}]]`,
  );

  // {{alt|Name}} → [[Name (alternate reality)]] (alternate reality)
  text = text.replace(
    /\{\{alt\|([^|}]+)\}\}/gi,
    (_m, name: string) => `[[${name.trim()} (alternate reality)|${name.trim()}]]`,
  );

  // {{small|text}} → <small>text</small>
  text = text.replace(
    /\{\{small\|([^}]+)\}\}/gi,
    '<small>$1</small>',
  );

  return text;
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

  const doc = wtf(expandInlineTemplates(wikitext));

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
