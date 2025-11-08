import { Database } from "./database";

export class QueryExamples {
  constructor(private db: Database) {}

  /**
   * Get most relevant pages (highest keyword count)
   */
  async getMostRelevantPages(limit: number = 5): Promise<any[]> {
    return this.db.query(
      `SELECT
        page_number,
        section_headings,
        section_number,
        content_type,
        keyword_count,
        keywords
      FROM page_content
      WHERE keyword_count > 0
      ORDER BY keyword_count DESC
      LIMIT ?`,
      [limit]
    );
  }

  /**
   * Query 1: Get document metadata
   */
  async getDocumentMetadata(): Promise<any[]> {
    return this.db.query(`
      SELECT file_name, total_pages
      FROM documents
    `);
  }

  /**
   * Query 2: Get text from a specific page
   */
  async getPageText(pageNumber: number): Promise<any[]> {
    return this.db.query(
      `SELECT
        page_number,
        raw_text
      FROM page_content
      WHERE page_number = ?`,
      [pageNumber]
    );
  }

  /**
   * Query 3: Get pages most relevant to Accessibility Code Compliance
   */
  async getPagesAboveKeywordThreshold(threshold: number = 3): Promise<any[]> {
    return this.db.query(
      `SELECT
        page_number,
        section_headings,
        section_number,
        keyword_count,
        keywords
      FROM page_content
      WHERE keyword_count > ?
      ORDER BY keyword_count DESC`,
      [threshold]
    );
  }

  /**
   * Get statistics about the document
   */
  async getDocumentStats(): Promise<any> {
    const stats = await this.db.query(`
      SELECT
        COUNT(*) as total_pages,
        SUM(CASE WHEN content_type LIKE '%"requirement"%' THEN 1 ELSE 0 END) as requirement_pages,
        SUM(CASE WHEN content_type LIKE '%"exception"%' THEN 1 ELSE 0 END) as exception_pages,
        SUM(CASE WHEN content_type LIKE '%"definition"%' THEN 1 ELSE 0 END) as definition_pages,
        SUM(CASE WHEN has_figure = 1 THEN 1 ELSE 0 END) as pages_with_figures,
        COUNT(DISTINCT section_number) as unique_sections,
        AVG(keyword_count) as avg_keywords_per_page,
        AVG(mandatory_language_count) as avg_mandatory_per_page,
        AVG(exception_language_count) as avg_exception_per_page
      FROM page_content
    `);

    return stats[0];
  }

  async runAllQueries(): Promise<void> {
    console.log("\n✅ Query 1: Document Metadata");
    const metadata = await this.getDocumentMetadata();
    metadata.forEach((doc) => {
      console.log(`  File: ${doc.file_name}`);
      console.log(`  Total Pages: ${doc.total_pages}`);
    });

    console.log("\n✅ Query 2: Page 5 Content");
    const page5 = await this.getPageText(5);
    if (page5.length > 0) {
      console.log(`  Page ${page5[0].page_number} full text:`);
      console.log(`  ${page5[0].raw_text}`);
    } else {
      console.log("  Page 5 not found");
    }

    console.log("\n✅ Query 3: Pages with Keyword Count > 2");
    const threshold = 2;
    const relevantCompliancePages = await this.getPagesAboveKeywordThreshold(
      threshold
    );
    console.log(
      `  Found ${relevantCompliancePages.length} pages with more than ${threshold} accessibility keywords:`
    );
    relevantCompliancePages.forEach((page) => {
      console.log(
        `    Page ${page.page_number}: ${
          page.section_headings || "No heading"
        } (${page.keyword_count} keywords)`
      );
      console.log(`      Keywords: ${page.keywords}`);
    });

    console.log("\n" + "─".repeat(70));
    console.log("ADDITIONAL QUERIES (Beyond Assignment Requirements)");
    console.log("─".repeat(70));

    console.log("\n📋 Top 5 Most Relevant Pages (by keyword count):");
    const relevantPages = await this.getMostRelevantPages(5);
    relevantPages.forEach((page) => {
      console.log(
        `  Page ${page.page_number}: the page headings are: ${page.section_headings} (found ${page.keyword_count} keywords)`
      );
      console.log(`    Keywords found: ${page.keywords}`);
    });

    console.log("\n📊 Document Statistics:");
    const stats = await this.getDocumentStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log("");
  }
}
