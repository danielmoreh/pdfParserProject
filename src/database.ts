import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface DocumentMetadata {
  file_name: string;
  total_pages: number;
  processed_at: string;
}

export interface PageContent {
  document_id: number;
  page_number: number;
  raw_text: string;
  section_heading?: string;
  keyword_count: number;
}

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = './accessibility_codes.db') {
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));

    // Create documents table for metadata
    await run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        total_pages INTEGER NOT NULL,
        processed_at TEXT NOT NULL
      )
    `);

    // Create page_content table with enhanced fields for accessibility compliance analysis
    await run(`
      CREATE TABLE IF NOT EXISTS page_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        raw_text TEXT NOT NULL,
        section_heading TEXT,
        keyword_count INTEGER DEFAULT 0,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )
    `);

    // Create index for faster queries on page_number and keyword_count
    await run(`
      CREATE INDEX IF NOT EXISTS idx_page_number
      ON page_content(page_number)
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_keyword_count
      ON page_content(keyword_count)
    `);

    console.log('✓ Database schema initialized successfully');
  }

  async insertDocument(metadata: Omit<DocumentMetadata, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO documents (file_name, total_pages, processed_at) VALUES (?, ?, ?)`,
        [metadata.file_name, metadata.total_pages, metadata.processed_at],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async insertPageContent(pageData: Omit<PageContent, 'id'>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO page_content (document_id, page_number, raw_text, section_heading, keyword_count)
         VALUES (?, ?, ?, ?, ?)`,
        [
          pageData.document_id,
          pageData.page_number,
          pageData.raw_text,
          pageData.section_heading || null,
          pageData.keyword_count,
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
