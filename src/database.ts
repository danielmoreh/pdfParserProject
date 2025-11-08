import sqlite3 from "sqlite3";
import { open, Database as SqliteDatabase } from "sqlite";

export interface DocumentMetadata {
  file_name: string;
  total_pages: number;
  processed_at: string;
}

export interface PageContent {
  document_id: number;
  page_number: number;
  raw_text: string;
  section_headings: string;
  section_number?: string;
  content_type: string;
  keyword_count: number;
  keywords: string;
  has_figure: boolean;
  mandatory_language_count: number;
  exception_language_count: number;
}

export class Database {
  private db: SqliteDatabase<sqlite3.Database, sqlite3.Statement>;

  private constructor(db: SqliteDatabase<sqlite3.Database, sqlite3.Statement>) {
    this.db = db;
  }

  static async create(
    dbPath: string = "./accessibility_codes.db"
  ): Promise<Database> {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    return new Database(db);
  }

  async initializeDb(): Promise<void> {
    try {
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_name TEXT NOT NULL,
          total_pages INTEGER NOT NULL,
          processed_at TEXT NOT NULL
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS page_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          page_number INTEGER NOT NULL,
          raw_text TEXT NOT NULL,
          section_headings TEXT,
          section_number TEXT,
          content_type TEXT NOT NULL DEFAULT 'normal',
          keyword_count INTEGER DEFAULT 0,
          keywords TEXT,
          has_figure INTEGER DEFAULT 0,
          mandatory_language_count INTEGER DEFAULT 0,
          exception_language_count INTEGER DEFAULT 0,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )
      `);

      // Index for Query 2: SELECT * FROM page_content WHERE page_number = ?
      // In this implementation, id = page_number since pages are stored sequentially,
      // but we index page_number separately to support future scenarios where we might
      // skip certain pages (e.g., filtering out cover pages, blank pages, or TOC pages)
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_page_number
        ON page_content(page_number)
      `);

      // Index for Query 3: SELECT * FROM page_content WHERE keyword_count > ?
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_keyword_count
        ON page_content(keyword_count)
      `);

      // Index for foreign key joins: JOIN page_content p ON p.document_id = d.id
      // In case we process multiple documents and need to join information across tables,
      // this index would make joins significantly faster
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_document_id
        ON page_content(document_id)
      `);

      console.log("✓ Database schema initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize database schema:", error);
      throw new Error(
        `Database initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async insertDocument(
    metadata: Omit<DocumentMetadata, "id">
  ): Promise<number> {
    try {
      const result = await this.db.run(
        `INSERT INTO documents (file_name, total_pages, processed_at) VALUES (?, ?, ?)`,
        [metadata.file_name, metadata.total_pages, metadata.processed_at]
      );
      return result.lastID!;
    } catch (error) {
      console.error(
        `❌ Failed to insert document '${metadata.file_name}':`,
        error
      );
      throw new Error(
        `Document insertion failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Bulk insert multiple pages in a single transaction, much more efficient than inserting one page at a time
   */
  async insertPageContentBatch(
    pages: Omit<PageContent, "id">[]
  ): Promise<void> {
    if (pages.length === 0) {
      return;
    }

    try {
      await this.db.run("BEGIN TRANSACTION");

      try {
        const stmt = await this.db.prepare(
          `INSERT INTO page_content (
            document_id, page_number, raw_text, section_headings, section_number,
            content_type, keyword_count, keywords, has_figure,
            mandatory_language_count, exception_language_count
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        for (const pageData of pages) {
          await stmt.run([
            pageData.document_id,
            pageData.page_number,
            pageData.raw_text,
            pageData.section_headings,
            pageData.section_number || null,
            pageData.content_type,
            pageData.keyword_count,
            pageData.keywords,
            pageData.has_figure ? 1 : 0,
            pageData.mandatory_language_count,
            pageData.exception_language_count,
          ]);
        }

        await stmt.finalize();
        await this.db.run("COMMIT");
      } catch (error) {
        await this.db.run("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error(`❌ Failed to bulk insert ${pages.length} pages:`, error);
      throw new Error(
        `Batch insertion failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      return await this.db.all<T[]>(sql, params);
    } catch (error) {
      console.error(`❌ Query execution failed:`, error);
      console.error(`   SQL: ${sql}`);
      throw new Error(
        `Query failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.close();
    } catch (error) {
      console.error(`❌ Error while closing database:`, error);
      throw new Error(
        `Database close failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
