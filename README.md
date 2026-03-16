# Memory Alpha

Browse the [Memory Alpha](https://memory-alpha.fandom.com/) Star Trek wiki offline on your own computer. Memory Alpha downloads the entire wiki database and lets you search, browse, and read articles through an LCARS-inspired interface — no internet connection required after setup.

## Prerequisites

You need [Node.js](https://nodejs.org/) (v18 or later) installed on your machine.

## Getting Started

1. **Install and build**

   ```bash
   npm install
   npm run build
   ```

2. **Start the server**

   ```bash
   npm run serve
   ```

3. **Open your browser** to [http://localhost:3000/settings](http://localhost:3000/settings)

4. **Download the wiki** — Click the download button on the Settings page. The app will download, decompress, and import the full Memory Alpha database automatically. Progress is shown in real time.

5. **Start browsing** — Once the import finishes, head to [http://localhost:3000](http://localhost:3000) and explore!

## What You Can Do

- **Browse articles** — Filter alphabetically from A–Z or by namespace
- **Read articles** — Full wiki content rendered with an LCARS Star Trek look and feel
- **Search** — Full-text search across all articles with highlighted results
- **Explore categories** — Browse articles grouped by topic
- **Manage everything from Settings** — Download the database, rebuild the search index, and switch between light/dark themes

## Screenshots

The interface uses an LCARS-inspired design inspired by the computer displays from Star Trek: The Next Generation.

## Troubleshooting

- **The server won't start** — Make sure you ran `npm install` and `npm run build` first.
- **Search returns no results** — Go to Settings and make sure the search index has been built. You can rebuild it from there.
- **Pages look empty** — The database may not be imported yet. Check the Settings page to download and import it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for developer documentation, including the project structure, API reference, environment variables, and testing instructions.
