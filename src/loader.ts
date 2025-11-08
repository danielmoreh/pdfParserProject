import { Database } from "./database";
import { TransformedPage } from "./transformer";
import { PDFMetadata } from "./extractor";

export class Loader {
  private documentId: number | undefined;
  private insertedCount: number = 0;

  constructor(private db: Database) {}

  /**
   * Initialize the loader by inserting document metadata
   */
  async initialize(metadata: PDFMetadata): Promise<number> {
    console.log("💾 Initializing loader...");

    try {
      // Insert document metadata
      this.documentId = await this.db.insertDocument({
        file_name: metadata.fileName,
        total_pages: metadata.totalPages,
        processed_at: new Date().toISOString(),
      });

      console.log(`✓ Document metadata inserted (ID: ${this.documentId})`);
      this.insertedCount = 0;

      return this.documentId;
    } catch (error) {
      console.error("Error initializing loader:", error);
      throw error;
    }
  }

  /**
   * Load a batch of transformed pages into the database in a single transaction
   * Much more efficient than loading one page at a time
   */
  async loadBatch(pages: TransformedPage[]): Promise<void> {
    if (!this.documentId) {
      throw new Error("Loader not initialized. Call initialize() first.");
    }

    if (pages.length === 0) {
      return;
    }

    try {
      const pageContents = pages.map((page) => ({
        document_id: this.documentId!,
        page_number: page.pageNumber,
        raw_text: page.rawText,
        section_headings: JSON.stringify(page.sectionHeadings),
        section_number: page.sectionNumber,
        content_type: JSON.stringify(page.contentType),
        keyword_count: page.keywordCount,
        keywords: JSON.stringify(page.keywords),
        has_figure: page.hasFigure,
        mandatory_language_count: page.mandatoryLanguageCount,
        exception_language_count: page.exceptionLanguageCount,
      }));

      // Bulk insert in a single transaction
      await this.db.insertPageContentBatch(pageContents);

      this.insertedCount += pages.length;
      console.log(
        `💾 Loaded batch of ${pages.length} pages in single transaction (total: ${this.insertedCount})`
      );
    } catch (error) {
      console.error(`Error loading batch:`, error);
      throw error;
    }
  }

  finalize(): void {
    console.log(
      `✓ Successfully loaded ${this.insertedCount} pages into database\n`
    );
  }
}
