import { initializeDatabase } from '../models/database.js';
import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATABASE_PATH = process.env.DATABASE_PATH || './memory-alpha.db';
const STATIC_DIR = process.env.STATIC_DIR || '../client/dist';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const db = initializeDatabase(DATABASE_PATH);
const app = createApp(db, { corsOrigin: CORS_ORIGIN, staticDir: STATIC_DIR });

app.listen(PORT, () => {
  const pageCount = db.prepare('SELECT count(*) AS cnt FROM pages').get() as { cnt: number };
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Database: ${DATABASE_PATH} (${pageCount.cnt} pages)`);
});
