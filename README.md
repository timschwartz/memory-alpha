# Memory Alpha

A MediaWiki XML importer that stream-parses MediaWiki export files and loads them into a local SQLite database.

## Quick Start

```bash
npm install
npm run build
npx mw-import ./data/enmemoryalpha_pages_full.xml
```

See [specs/001-mediawiki-xml-importer/quickstart.md](specs/001-mediawiki-xml-importer/quickstart.md) for full usage instructions.
