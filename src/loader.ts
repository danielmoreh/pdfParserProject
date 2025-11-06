import { Database } from './database';
import { TransformedPage } from './transformer';
import { PDFMetadata } from './extractor';

export class Loader {
  constructor(private db: Database) {}

  async load(metadata: PDFMetadata, pages: TransformedPage[]): Promise<void> {
    console.log('💾 Starting data loading process...');

    try {
      // Insert document metadata
      const documentId = await this.db.insertDocument({
        file_name: metadata.fileName,
        total_pages: metadata.totalPages,
        processed_at: new Date().toISOString(),
      });

      console.log(`✓ Document metadata inserted (ID: ${documentId})`);

      // Insert page content
      let insertedCount = 0;
      for (const page of pages) {
        await this.db.insertPageContent({
          document_id: documentId,
          page_number: page.pageNumber,
          raw_text: page.rawText,
          section_heading: page.sectionHeading,
          keyword_count: page.keywordCount,
        });
        insertedCount++;

        // Progress indicator every 10 pages
        if (insertedCount % 10 === 0) {
          console.log(`  Inserted ${insertedCount}/${pages.length} pages...`);
        }
      }

      console.log(`✓ Successfully loaded ${insertedCount} pages into database\n`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
}
