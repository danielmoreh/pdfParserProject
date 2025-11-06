import { Database } from './database';

export class QueryDemonstration {
  constructor(private db: Database) {}

  async runAllQueries(): Promise<void> {
    console.log('🔍 Running Demonstration Queries');
    console.log('═'.repeat(70));

    await this.query1_verifyMetadata();
    console.log('\n' + '─'.repeat(70) + '\n');

    await this.query2_specificPage();
    console.log('\n' + '─'.repeat(70) + '\n');

    await this.query3_relevantPages();
    console.log('\n' + '═'.repeat(70) + '\n');
  }

  /**
   * Query 1: Verification - Select file_name and total_pages from documents table
   */
  private async query1_verifyMetadata(): Promise<void> {
    console.log('Query 1: Document Metadata Verification');
    console.log('─'.repeat(70));

    const sql = `
      SELECT file_name, total_pages
      FROM documents
    `;

    console.log('SQL:\n' + sql.trim() + '\n');

    const results = await this.db.query<{ file_name: string; total_pages: number }>(sql);

    console.log('Results:');
    if (results.length > 0) {
      results.forEach((row) => {
        console.log(`  File Name: ${row.file_name}`);
        console.log(`  Total Pages: ${row.total_pages}`);
      });
    } else {
      console.log('  No documents found.');
    }
  }

  /**
   * Query 2: Segmentation - Select text from a specific page (Page 5)
   */
  private async query2_specificPage(): Promise<void> {
    console.log('Query 2: Content Segmentation - Page 5');
    console.log('─'.repeat(70));

    const pageNumber = 5;
    const sql = `
      SELECT page_number, raw_text, section_heading
      FROM page_content
      WHERE page_number = ?
    `;

    console.log('SQL:\n' + sql.trim() + '\n');
    console.log(`Parameters: page_number = ${pageNumber}\n`);

    const results = await this.db.query<{
      page_number: number;
      raw_text: string;
      section_heading: string | null;
    }>(sql, [pageNumber]);

    console.log('Results:');
    if (results.length > 0) {
      const page = results[0];
      console.log(`  Page Number: ${page.page_number}`);
      if (page.section_heading) {
        console.log(`  Section Heading: ${page.section_heading}`);
      }
      console.log(`  Text Preview (first 300 chars):`);
      console.log('  ' + '─'.repeat(68));
      const preview = page.raw_text.substring(0, 300).replace(/\n/g, '\n  ');
      console.log(`  ${preview}${page.raw_text.length > 300 ? '...' : ''}`);
      console.log('  ' + '─'.repeat(68));
      console.log(`  Total Text Length: ${page.raw_text.length} characters`);
    } else {
      console.log(`  No content found for page ${pageNumber}.`);
    }
  }

  /**
   * Query 3: Analysis - Select pages most relevant to Accessibility Code Compliance
   * (pages with keyword count > 3)
   */
  private async query3_relevantPages(): Promise<void> {
    console.log('Query 3: Accessibility Compliance Relevance Analysis');
    console.log('─'.repeat(70));

    const threshold = 3;
    const sql = `
      SELECT page_number, section_heading, keyword_count
      FROM page_content
      WHERE keyword_count > ?
      ORDER BY keyword_count DESC
    `;

    console.log('SQL:\n' + sql.trim() + '\n');
    console.log(`Parameters: keyword_count_threshold = ${threshold}\n`);

    const results = await this.db.query<{
      page_number: number;
      section_heading: string | null;
      keyword_count: number;
    }>(sql, [threshold]);

    console.log('Results:');
    if (results.length > 0) {
      console.log(`  Found ${results.length} page(s) with high accessibility relevance:\n`);
      console.log('  Page #  | Keywords | Section Heading');
      console.log('  ' + '─'.repeat(66));

      results.forEach((row) => {
        const pageNum = row.page_number.toString().padEnd(7);
        const keywords = row.keyword_count.toString().padEnd(8);
        const heading = row.section_heading
          ? row.section_heading.substring(0, 40)
          : 'N/A';
        console.log(`  ${pageNum} | ${keywords} | ${heading}`);
      });

      console.log('\n  Summary Statistics:');
      console.log(`    Total Relevant Pages: ${results.length}`);
      console.log(
        `    Highest Keyword Count: ${Math.max(...results.map((r) => r.keyword_count))}`
      );
      console.log(
        `    Average Keyword Count: ${(
          results.reduce((sum, r) => sum + r.keyword_count, 0) / results.length
        ).toFixed(2)}`
      );
    } else {
      console.log(`  No pages found with keyword count > ${threshold}.`);
    }
  }

  /**
   * Additional helper: Export queries as SQL strings for documentation
   */
  static getQuerySQL(): {
    query1: string;
    query2: string;
    query3: string;
  } {
    return {
      query1: `SELECT file_name, total_pages FROM documents;`,
      query2: `SELECT page_number, raw_text, section_heading FROM page_content WHERE page_number = 5;`,
      query3: `SELECT page_number, section_heading, keyword_count FROM page_content WHERE keyword_count > 3 ORDER BY keyword_count DESC;`,
    };
  }
}
